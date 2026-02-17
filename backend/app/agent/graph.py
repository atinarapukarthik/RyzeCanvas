"""
LangGraph State Graph for RyzeCanvas AI Agent.
Implements: Plan → Generate (JSON) → Validate → Explain.
Generates deterministic UI plans and natural language explanations.
"""
import json
import traceback
from typing import TypedDict, List, Dict, Any, Annotated
from operator import add

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser

from app.core.config import settings
from app.core.component_library import UIPlan
from app.agent.system_prompt import (
    get_plan_prompt,
    get_generate_json_prompt,
    get_explainer_prompt,
    get_retry_context,
)


# Define the Agent State
class AgentState(TypedDict):
    """State that flows through the LangGraph."""
    input: str  # User's original prompt
    plan: str  # High-level layout plan from LLM
    ui_plan: Dict[str, Any]  # The structured JSON UI Plan
    explanation: str  # Natural language explanation from Explainer
    errors: Annotated[List[str], add]  # List of validation errors (accumulated)
    retry_count: int  # Number of retries for validation
    final_output: Dict[str, Any]  # Final validated UI plan


# Maximum retry attempts for validation
MAX_RETRIES = 2


# Initialize LLM (use same model for all nodes)
def get_llm():
    """Get the LLM instance based on settings configuration."""
    provider = settings.AI_MODEL_PROVIDER

    if provider == "gemini":
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured")
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.2,
            google_api_key=settings.GEMINI_API_KEY,
            max_output_tokens=8192,
        )

    elif provider == "openai":
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not configured")
        return ChatOpenAI(model="gpt-4o", temperature=0.2, api_key=settings.OPENAI_API_KEY)

    elif provider == "anthropic":
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not configured")
        return ChatAnthropic(
            model="claude-3-5-sonnet-20241022",
            temperature=0.2,
            api_key=settings.ANTHROPIC_API_KEY,
            max_tokens=8192,
        )

    elif provider == "openrouter":
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY not configured")
        return ChatOpenAI(
            model="anthropic/claude-3.5-sonnet",
            temperature=0.2,
            api_key=settings.OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        )

    else:
        raise ValueError(f"Unsupported AI provider: {provider}")


# Node 1: Plan the Layout
def plan_node(state: AgentState) -> AgentState:
    """
    Node 1: Create a high-level layout plan using the LLM.
    """
    print("[PLAN] Creating high-level layout plan...")

    llm = get_llm()

    system_prompt = get_plan_prompt()

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


def _extract_json(raw: str) -> Dict[str, Any]:
    """Extract JSON from LLM output, handling code fences."""
    raw = raw.strip()
    # Remove markdown fences if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        # Remove first line (```json or ```)
        lines = lines[1:]
        # Remove last line if it is ```
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines)
    
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: try to find strict JSON start/end
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1:
            return json.loads(raw[start:end+1])
        raise


# Node 2: Generate JSON Plan
def generate_node(state: AgentState) -> AgentState:
    """
    Node 2: Convert the plan into a strictly typed UIPlan JSON.
    """
    print("[GENERATE] Generating deterministic UI Plan...")

    llm = get_llm()

    # Include error feedback if this is a retry
    error_feedback = ""
    if state.get("errors"):
        error_feedback = get_retry_context(state["errors"])

    system_prompt = get_generate_json_prompt()
    system_prompt += f"\n\nLayout plan:\n{state['plan']}"
    if error_feedback:
        system_prompt += f"\n{error_feedback}"

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Generate the UIPlan JSON for: {state['input']}")
    ]

    response = llm.invoke(messages)
    raw_output = response.content.strip()

    try:
        ui_plan = _extract_json(raw_output)
        print(f"[OK] UI Plan generated with {len(ui_plan.get('components', []))} components")
        return {
            **state,
            "ui_plan": ui_plan
        }
    except Exception as e:
        print(f"[ERROR] Failed to parse JSON: {e}")
        return {
            **state,
            "errors": state.get("errors", []) + [f"JSON Parse Error: {str(e)}"]
        }


# Node 3: Validate Code
def validate_node(state: AgentState) -> AgentState:
    """
    Node 3: Validate the JSON against strictly allowed components.
    """
    print("[VALIDATE] Validating UI Plan...")

    ui_plan_data = state.get("ui_plan")
    errors = []

    if not ui_plan_data:
        errors.append("No UI Plan data generated")
    else:
        try:
            # Validate against Pydantic schema
            UIPlan(**ui_plan_data)
        except Exception as e:
            errors.append(f"Schema Validation Error: {str(e)}")

    if errors:
        error_str = "; ".join(errors)
        print(f"[FAIL] Validation failed: {error_str}")
        return {
            **state,
            "errors": state.get("errors", []) + [error_str]
        }

    print("[OK] Validation passed!")
    return {
        **state
    }


# Node 4: Explainer
def explainer_node(state: AgentState) -> AgentState:
    """
    Node 4: Explain the design decisions.
    """
    print("[EXPLAIN] Generating explanation...")
    
    llm = get_llm()
    
    # Create summary of plan
    ui_plan = state.get("ui_plan", {})
    components = ui_plan.get("components", [])
    comp_summary = ", ".join([c.get("type", "Unknown") for c in components])
    
    system_prompt = get_explainer_prompt()
    user_input = state["input"]
    plan_summary = f"Components used: {comp_summary}. Layout theme: {ui_plan.get('layout', {}).get('theme', 'default')}"
    
    formatted_prompt = system_prompt.replace("{user_request}", user_input).replace("{plan_summary}", plan_summary)
    
    messages = [
        SystemMessage(content=formatted_prompt),
        HumanMessage(content="Explain this design.")
    ]
    
    response = llm.invoke(messages)
    explanation = response.content.strip()
    
    print("[OK] Explanation generated")
    
    return {
        **state,
        "explanation": explanation,
        "final_output": ui_plan
    }


# Conditional Edge: Should we retry or end?
def should_retry(state: AgentState) -> str:
    """
    Conditional edge function.

    Returns:
        "generate" if validation failed and retries remain
        "explain" if validation passed (proceed to explanation)
    """
    errors = state.get("errors", [])
    # Check if the LAST error added was from the most recent run
    # (Since we accumulate errors, we check if the list grew)
    # Simplified logic: if we just came from validate and it failed (errors list not empty), we check if we should retry.
    # However, since we accumulate errors, we need to strictly check if the *current* validation added an error.
    # The validate_node adds to the list if it fails.
    
    # We can check if `final_output` is set, but explain sets it. 
    # Let's check if we have a valid `ui_plan` that passed validation implies no NEW errors.
    # Actually, a simpler way: Check if the LAST step added an error. 
    # But standard pattern: if validation fails, it returns errors.
    
    # Let's look at validate_node: it adds to "errors" if it fails.
    # If the validation passed, it returns state WITHOUT adding to errors (errors might exist from previous retries).
    # Ideally we'd clear errors on a fresh generate run, but accumulation is useful for context.
    # Let's assume if the validation passed, we proceed.
    
    # We can use a flag or just check if the last message in errors matches the current state? No.
    # Let's modify validate: if it passes, it shouldn't return 'errors' key if we want to be clean?
    # Or just check if `ui_plan` is valid.
    
    # Let's retry validation logic: 
    # If we are here, validation has run.
    # If validation failed, it added an error string.
    
    # We can check if `ui_plan` is valid by trying to re-validate? No that's redundant.
    # We can rely on the fact that `validate_node` returns `errors` key update ONLY if it fails.
    # But graph state is merged.
    
    last_error_count = len(state.get("errors", []))
    # This logic is tricky with state merging.
    
    # Alternative: check if the plan is valid using pydantic again? Safe operation.
    try:
        UIPlan(**state.get("ui_plan", {}))
        return "explain"
    except:
        pass # Failed

    retry_count = state.get("retry_count", 0)

    if retry_count < MAX_RETRIES:
        print(f"[RETRY] {retry_count + 1}/{MAX_RETRIES}")
        state["retry_count"] = retry_count + 1
        return "generate"
    else:
        print(f"[ERROR] Max retries ({MAX_RETRIES}) reached. Stopping.")
        # Even if broken, we return what we have? Or fail?
        # Requirement says "Error handling for invalid outputs".
        # We'll just end.
        return END


# Build the State Graph
def build_graph() -> StateGraph:
    """
    Build the LangGraph workflow.

    Graph Structure:
        START → Plan → Generate → Validate
                            ↑          |
                            |___(retry)|
                                       ↓ (if valid)
                                     Explain → END
    """
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("plan", plan_node)
    workflow.add_node("generate", generate_node)
    workflow.add_node("validate", validate_node)
    workflow.add_node("explain", explainer_node)

    # Define edges
    workflow.set_entry_point("plan")
    workflow.add_edge("plan", "generate")
    workflow.add_edge("generate", "validate")

    # Conditional edge from validate
    workflow.add_conditional_edges(
        "validate",
        should_retry,
        {
            "generate": "generate",
            "explain": "explain",
            END: END
        }
    )
    
    workflow.add_edge("explain", END)

    return workflow.compile()


# Convenience function to run the graph
async def run_agent(user_prompt: str) -> Dict[str, Any]:
    """
    Run the complete agent workflow.

    Args:
        user_prompt: User's natural language UI request

    Returns:
        Final validated plan and explanation or error details
    """
    print("\n" + "=" * 60)
    print("[AGENT] Starting RyzeCanvas AI Agent (Deterministic Mode)")
    print("=" * 60)

    graph = build_graph()

    initial_state = {
        "input": user_prompt,
        "plan": "",
        "ui_plan": {},
        "explanation": "",
        "errors": [],
        "retry_count": 0,
        "final_output": {}
    }

    final_state = await graph.ainvoke(initial_state)

    print("\n" + "=" * 60)
    print("[OK] Agent execution complete")
    print("=" * 60)

    if final_state.get("final_output"):
        return {
            "success": True,
            "output": final_state["final_output"], # This is the JSON plan
            "explanation": final_state.get("explanation", ""),
            "retries": final_state.get("retry_count", 0)
        }
    else:
        return {
            "success": False,
            "errors": final_state.get("errors", []),
            "retries": final_state.get("retry_count", 0),
            "partial_output": final_state.get("ui_plan", {})
        }
