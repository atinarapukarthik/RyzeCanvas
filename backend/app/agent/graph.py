"""
LangGraph State Graph for RyzeCanvas AI Agent.
Implements: Retrieve → Plan → Generate → Validate (with retry loop).
"""
import json
import os
from typing import TypedDict, List, Dict, Any, Annotated
from operator import add

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from app.agent.rag import retrieve_context
from app.core.component_library import ALLOWED_COMPONENTS
from app.agent.validator import validate_dhdc
from app.agent.system_prompt import (
    get_generate_plan_prompt,
    get_generate_code_prompt,
    get_retry_context,
)


# Define the Agent State
class AgentState(TypedDict):
    """State that flows through the LangGraph."""
    input: str  # User's original prompt
    context: str  # Retrieved RAG context
    plan: str  # High-level layout plan from LLM
    code_json: Dict[str, Any]  # Generated JSON code
    errors: Annotated[List[str], add]  # List of validation errors (accumulated)
    retry_count: int  # Number of retries for validation
    final_output: Dict[str, Any]  # Final validated output


# Maximum retry attempts for validation
MAX_RETRIES = 3


# Initialize LLM (use same model for all nodes)
def get_llm():
    """Get the LLM instance based on environment configuration."""
    provider = os.getenv("AI_MODEL_PROVIDER", "openai")
    
    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not configured")
        return ChatOpenAI(model="gpt-4o", temperature=0.3, api_key=api_key)
    
    elif provider == "anthropic":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")
        return ChatAnthropic(
            model="claude-3-5-sonnet-20241022",
            temperature=0.3,
            api_key=api_key
        )
    
    else:
        raise ValueError(f"Unsupported AI provider: {provider}")


# Node 1: Retrieve Context from RAG
def retrieve_node(state: AgentState) -> AgentState:
    """
    Node 1: Retrieve relevant component documentation using RAG.
    """
    print("[RETRIEVE] Fetching relevant component context...")
    
    user_input = state["input"]
    
    # Retrieve top 3 relevant component docs
    context = retrieve_context(user_input, top_k=3)
    
    print(f"[OK] Retrieved {len(context)} chars of context")
    
    return {
        **state,
        "context": context
    }


# Node 2: Plan the Layout
def plan_node(state: AgentState) -> AgentState:
    """
    Node 2: Create a high-level layout plan using the LLM.
    System Prompt: "You are a UI Architect. Plan a layout using ONLY the provided components."
    """
    print("[PLAN] Creating high-level layout plan...")
    
    llm = get_llm()

    system_prompt = get_generate_plan_prompt() + f"\n\nComponent context:\n{state['context']}"

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"User request: {state['input']}\n\nCreate a layout plan.")
    ]
    
    response = llm.invoke(messages)
    plan = response.content.strip()
    
    print(f"[OK] Plan created: {plan[:100]}...")
    
    return {
        **state,
        "plan": plan
    }


# Node 3: Generate JSON Code
def generate_node(state: AgentState) -> AgentState:
    """
    Node 3: Convert the plan into valid JSON.
    System Prompt: "Output VALID JSON matching the schema. Do not invent tags."
    """
    print("[GENERATE] Converting plan to JSON...")
    
    llm = get_llm()

    # Include error feedback if this is a retry
    error_feedback = ""
    if state.get("errors"):
        error_feedback = get_retry_context(state["errors"])

    system_prompt = get_generate_code_prompt()
    system_prompt += f"\n\nComponent context:\n{state['context']}\n\nLayout plan:\n{state['plan']}"
    if error_feedback:
        system_prompt += f"\n{error_feedback}"

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content="Generate the JSON now:")
    ]
    
    response = llm.invoke(messages)
    raw_output = response.content.strip()
    
    # Clean up markdown if present
    if "```json" in raw_output:
        json_start = raw_output.find("```json") + 7
        json_end = raw_output.rfind("```")
        raw_output = raw_output[json_start:json_end].strip()
    elif "```" in raw_output:
        json_start = raw_output.find("```") + 3
        json_end = raw_output.rfind("```")
        raw_output = raw_output[json_start:json_end].strip()
    
    # Parse JSON
    try:
        code_json = json.loads(raw_output)
        print("[OK] JSON parsed successfully")
    except json.JSONDecodeError as e:
        print(f"[ERROR] JSON parse error: {e}")
        code_json = {"components": [], "layout": {}}
        return {
            **state,
            "code_json": code_json,
            "errors": state.get("errors", []) + [f"JSON Parse Error: {str(e)}"]
        }
    
    return {
        **state,
        "code_json": code_json
    }


# Node 4: Validate JSON (Guardrail - NOT LLM)
def validate_node(state: AgentState) -> AgentState:
    """
    Node 4: Strict Python validation of the generated JSON using D-HDC.
    
    Checks:
    1. Structure Validation (Layer 1)
    2. Semantic Validation (Layer 2 - Component Types)
    3. Property Validation (Layer 3 - Component Props)
    
    If invalid, adds errors to state for retry.
    """
    print("[VALIDATE] Validating generated JSON with D-HDC...")
    
    code_json = state["code_json"]
    
    # Run D-HDC Validator
    is_valid, error = validate_dhdc(code_json)
    
    if is_valid:
        print("[OK] D-HDC Validation passed!")
        return {
            **state,
            "final_output": code_json
        }
    else:
        print(f"[FAIL] D-HDC Validation failed:\n{error}")
        # Add error to state
        # We wrap in a list because 'errors' in state is Annotated[List[str], add]
        return {
            **state,
            "errors": state.get("errors", []) + [error]
        }


# Conditional Edge: Should we retry or end?
def should_retry(state: AgentState) -> str:
    """
    Conditional edge function.
    
    Returns:
        "generate" if validation failed and retries remain
        "end" if validation passed or max retries reached
    """
    # If final_output is set, validation passed
    if state.get("final_output"):
        return "end"
    
    # If we have errors, check retry count
    retry_count = state.get("retry_count", 0)
    
    if retry_count < MAX_RETRIES:
        print(f"[RETRY] {retry_count + 1}/{MAX_RETRIES}")
        # Increment retry count
        state["retry_count"] = retry_count + 1
        return "generate"
    else:
        print(f"[ERROR] Max retries ({MAX_RETRIES}) reached. Stopping.")
        return "end"


# Build the State Graph
def build_graph() -> StateGraph:
    """
    Build the LangGraph workflow.
    
    Graph Structure:
        START → Retrieve → Plan → Generate → Validate
                                      ↑          |
                                      |___(retry if invalid)
                                      |
                                      ↓ (if valid or max retries)
                                     END
    """
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("plan", plan_node)
    workflow.add_node("generate", generate_node)
    workflow.add_node("validate", validate_node)
    
    # Define edges
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "plan")
    workflow.add_edge("plan", "generate")
    workflow.add_edge("generate", "validate")
    
    # Conditional edge from validate
    workflow.add_conditional_edges(
        "validate",
        should_retry,
        {
            "generate": "generate",  # Loop back to generate
            "end": END
        }
    )
    
    return workflow.compile()


# Convenience function to run the graph
async def run_agent(user_prompt: str) -> Dict[str, Any]:
    """
    Run the complete agent workflow.
    
    Args:
        user_prompt: User's natural language UI request
    
    Returns:
        Final validated JSON or error details
    
    Example:
        >>> result = await run_agent("Create a login screen")
        >>> print(result["final_output"])
    """
    print("\n" + "="*60)
    print("[AGENT] Starting RyzeCanvas AI Agent")
    print("="*60)
    
    # Build graph
    graph = build_graph()
    
    # Initial state
    initial_state = {
        "input": user_prompt,
        "context": "",
        "plan": "",
        "code_json": {},
        "errors": [],
        "retry_count": 0,
        "final_output": None
    }
    
    # Run the graph
    final_state = graph.invoke(initial_state)
    
    print("\n" + "="*60)
    print("[OK] Agent execution complete")
    print("="*60)
    
    # Return results
    if final_state.get("final_output"):
        return {
            "success": True,
            "output": final_state["final_output"],
            "retries": final_state.get("retry_count", 0)
        }
    else:
        return {
            "success": False,
            "errors": final_state.get("errors", []),
            "retries": final_state.get("retry_count", 0),
            "partial_output": final_state.get("code_json", {})
        }


# Testing
if __name__ == "__main__":
    import asyncio
    
    async def test_graph():
        test_prompts = [
            "Create a login form with email and password",
            "Build a dashboard with sidebar, navbar, and stats cards",
            "Design a contact form with name, email, and message fields"
        ]
        
        for prompt in test_prompts:
            print(f"\n\n{'#'*60}")
            print(f"Testing: {prompt}")
            print('#'*60)
            
            result = await run_agent(prompt)
            
            if result["success"]:
                print(f"\n[OK] SUCCESS (Retries: {result['retries']})")
                print(json.dumps(result["output"], indent=2)[:500])
            else:
                print(f"\n[FAIL] FAILED (Retries: {result['retries']})")
                print("Errors:", result["errors"])
    
    asyncio.run(test_graph())
