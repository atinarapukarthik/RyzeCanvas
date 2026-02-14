"""
LangGraph State Graph for RyzeCanvas AI Agent.
Implements: Plan → Generate → Validate (with retry loop).
Generates production-ready React + Tailwind CSS code.
"""
import json
from typing import TypedDict, List, Dict, Any, Annotated
from operator import add

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.core.config import settings
from app.agent.system_prompt import (
    get_generate_plan_prompt,
    get_generate_code_prompt,
    get_retry_context,
)


# Define the Agent State
class AgentState(TypedDict):
    """State that flows through the LangGraph."""
    input: str  # User's original prompt
    plan: str  # High-level layout plan from LLM
    code: str  # Generated React/Tailwind code
    errors: Annotated[List[str], add]  # List of validation errors (accumulated)
    retry_count: int  # Number of retries for validation
    final_output: str  # Final validated code


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

    system_prompt = get_generate_plan_prompt()

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


def _clean_code_output(raw: str) -> str:
    """Strip markdown fences from LLM output."""
    raw = raw.strip()
    for lang in ("tsx", "jsx", "typescript", "react", ""):
        fence_start = f"```{lang}"
        if raw.startswith(fence_start):
            raw = raw[len(fence_start):].strip()
            if raw.endswith("```"):
                raw = raw[:-3].strip()
            return raw
    if raw.startswith("```"):
        first_newline = raw.find("\n")
        if first_newline != -1:
            raw = raw[first_newline + 1:]
        else:
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3].strip()
        return raw
    return raw


# Node 2: Generate React Code
def generate_node(state: AgentState) -> AgentState:
    """
    Node 2: Convert the plan into production-ready React + Tailwind CSS code.
    """
    print("[GENERATE] Generating React + Tailwind code...")

    llm = get_llm()

    # Include error feedback if this is a retry
    error_feedback = ""
    if state.get("errors"):
        error_feedback = get_retry_context(state["errors"])

    system_prompt = get_generate_code_prompt()
    system_prompt += f"\n\nLayout plan:\n{state['plan']}"
    if error_feedback:
        system_prompt += f"\n{error_feedback}"

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Generate the complete React component for: {state['input']}")
    ]

    response = llm.invoke(messages)
    raw_output = response.content.strip()

    # Clean markdown fences
    code = _clean_code_output(raw_output)

    print(f"[OK] Code generated ({len(code)} chars)")

    return {
        **state,
        "code": code
    }


# Node 3: Validate Code
def validate_node(state: AgentState) -> AgentState:
    """
    Node 3: Basic validation of the generated React code.
    """
    print("[VALIDATE] Validating generated code...")

    code = state["code"]
    errors = []

    if not code.strip():
        errors.append("Empty code output")
    else:
        has_component = (
            "function " in code or
            "const " in code or
            "export default" in code
        )
        if not has_component:
            errors.append("Missing React component definition")

        has_jsx = "return" in code and "<" in code
        if not has_jsx:
            errors.append("No JSX return statement found")

        if "className" not in code:
            errors.append("No Tailwind CSS className attributes found")

    if errors:
        error_str = "; ".join(errors)
        print(f"[FAIL] Validation failed: {error_str}")
        return {
            **state,
            "errors": state.get("errors", []) + [error_str]
        }

    print("[OK] Validation passed!")
    return {
        **state,
        "final_output": code
    }


# Conditional Edge: Should we retry or end?
def should_retry(state: AgentState) -> str:
    """
    Conditional edge function.

    Returns:
        "generate" if validation failed and retries remain
        "end" if validation passed or max retries reached
    """
    if state.get("final_output"):
        return "end"

    retry_count = state.get("retry_count", 0)

    if retry_count < MAX_RETRIES:
        print(f"[RETRY] {retry_count + 1}/{MAX_RETRIES}")
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
        START → Plan → Generate → Validate
                            ↑          |
                            |___(retry if invalid)
                            ↓ (if valid or max retries)
                           END
    """
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("plan", plan_node)
    workflow.add_node("generate", generate_node)
    workflow.add_node("validate", validate_node)

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
        Final validated code or error details
    """
    print("\n" + "=" * 60)
    print("[AGENT] Starting RyzeCanvas AI Agent")
    print("=" * 60)

    graph = build_graph()

    initial_state = {
        "input": user_prompt,
        "plan": "",
        "code": "",
        "errors": [],
        "retry_count": 0,
        "final_output": ""
    }

    final_state = graph.invoke(initial_state)

    print("\n" + "=" * 60)
    print("[OK] Agent execution complete")
    print("=" * 60)

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
            "partial_output": final_state.get("code", "")
        }
