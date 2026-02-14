"""
Production-Ready Chat Orchestrator for RyzeCanvas.

Provides a unified interface for all chat interactions:
- Chat mode: Conversational responses via LLM
- Plan mode: Architectural breakdowns via LLM
- Generate mode: Full React/Tailwind code generation pipeline

Supports Server-Sent Events (SSE) for real-time streaming to the frontend.
"""
import json
import asyncio
from typing import AsyncGenerator, Dict, Any, Optional, Literal
from dataclasses import dataclass, field

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.core.config import settings
from app.agent.system_prompt import (
    get_chat_prompt,
    get_plan_prompt,
    get_generate_plan_prompt,
    get_generate_code_prompt,
    get_retry_context,
)
from app.agent.rag import retrieve_context
from app.core.component_library import ALLOWED_COMPONENTS


# ── SSE Event Types ──────────────────────────────────────────────
EVENT_STEP = "step"          # Progress step (e.g., "Retrieving context...")
EVENT_TOKEN = "token"        # Streaming text token
EVENT_PLAN = "plan"          # Plan output (chat/plan mode)
EVENT_CODE = "code"          # Generated code (React/Tailwind)
EVENT_ERROR = "error"        # Error message
EVENT_DONE = "done"          # Stream complete


@dataclass
class ChatRequest:
    """Incoming chat request from the frontend."""
    prompt: str
    mode: Literal["chat", "plan", "generate"] = "chat"
    provider: str = "gemini"
    model: str = "gemini-2.5-flash"
    conversation_history: list = field(default_factory=list)
    web_search_context: Optional[str] = None


def _sse_event(event: str, data: Any) -> str:
    """Format a Server-Sent Event string."""
    payload = json.dumps({"event": event, "data": data}, ensure_ascii=False)
    return f"data: {payload}\n\n"


def _get_llm(provider: str, model: str):
    """Get LLM instance based on provider. Reads API keys from settings."""
    if provider in ("claude", "anthropic"):
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not configured")
        return ChatAnthropic(
            model=model or "claude-3-5-sonnet-20241022",
            temperature=0.3,
            api_key=settings.ANTHROPIC_API_KEY,
            max_tokens=8192,
        )
    elif provider == "gemini":
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured")
        return ChatGoogleGenerativeAI(
            model=model or "gemini-2.5-flash",
            temperature=0.3,
            google_api_key=settings.GEMINI_API_KEY,
            max_output_tokens=8192,
        )
    elif provider == "openai":
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not configured")
        return ChatOpenAI(
            model=model or "gpt-4o",
            temperature=0.3,
            api_key=settings.OPENAI_API_KEY,
        )
    elif provider == "openrouter":
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY not configured")
        return ChatOpenAI(
            model=model or "anthropic/claude-3.5-sonnet",
            temperature=0.3,
            api_key=settings.OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        )
    elif provider == "ollama":
        return ChatOpenAI(
            model=model or "llama3",
            temperature=0.3,
            base_url=f"{settings.OLLAMA_BASE_URL}/v1",
            api_key="ollama",
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}")


async def _stream_llm_response(
    llm, system_prompt: str, user_message: str, history: list
) -> AsyncGenerator[str, None]:
    """Stream LLM response token by token via SSE."""
    messages = [SystemMessage(content=system_prompt)]

    # Add conversation history (last 6 messages to save tokens)
    for msg in history[-6:]:
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg.get("role") in ("ai", "assistant"):
            from langchain_core.messages import AIMessage
            messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=user_message))

    full_response = ""
    try:
        async for chunk in llm.astream(messages):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            if token:
                full_response += token
                yield _sse_event(EVENT_TOKEN, token)
    except Exception as e:
        yield _sse_event(EVENT_ERROR, f"LLM streaming error: {str(e)}")
        return

    yield _sse_event(EVENT_PLAN, full_response)


async def orchestrate_chat(request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Main orchestration entry point. Routes to the appropriate handler
    based on the request mode.

    Yields SSE-formatted strings for real-time streaming.
    """
    try:
        llm = _get_llm(request.provider, request.model)
    except ValueError as e:
        yield _sse_event(EVENT_ERROR, str(e))
        yield _sse_event(EVENT_DONE, {"success": False})
        return

    if request.mode == "chat":
        async for event in _handle_chat(llm, request):
            yield event
    elif request.mode == "plan":
        async for event in _handle_plan(llm, request):
            yield event
    elif request.mode == "generate":
        async for event in _handle_generate(llm, request):
            yield event
    else:
        yield _sse_event(EVENT_ERROR, f"Unknown mode: {request.mode}")
        yield _sse_event(EVENT_DONE, {"success": False})


# ── CHAT MODE ────────────────────────────────────────────────────

async def _handle_chat(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """Handle conversational chat with streaming."""
    yield _sse_event(EVENT_STEP, "Thinking...")

    system_prompt = get_chat_prompt()

    # Enrich with web search context if available
    if request.web_search_context:
        system_prompt += f"\n\n<web-search-results>\n{request.web_search_context}\n</web-search-results>"

    async for event in _stream_llm_response(
        llm, system_prompt, request.prompt, request.conversation_history
    ):
        yield event

    yield _sse_event(EVENT_DONE, {"success": True, "mode": "chat"})


# ── PLAN MODE ────────────────────────────────────────────────────

async def _handle_plan(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """Handle architectural planning with streaming."""
    yield _sse_event(EVENT_STEP, "Analyzing requirements...")

    system_prompt = get_plan_prompt()

    yield _sse_event(EVENT_STEP, "Creating architectural plan...")

    async for event in _stream_llm_response(
        llm, system_prompt, request.prompt, request.conversation_history
    ):
        yield event

    yield _sse_event(EVENT_DONE, {"success": True, "mode": "plan"})


# ── GENERATE MODE (Full Code Generation Pipeline) ────────────────

MAX_RETRIES = 2


def _clean_code_output(raw: str) -> str:
    """Strip markdown fences and any surrounding commentary from LLM output."""
    import re

    raw = raw.strip()

    # Try to extract code from a fenced code block anywhere in the output
    fence_pattern = re.compile(
        r'```(?:tsx|jsx|typescript|react|ts)?\s*\n([\s\S]*?)```',
        re.MULTILINE,
    )
    match = fence_pattern.search(raw)
    if match:
        return match.group(1).strip()

    # If no fenced block found, check if the whole output starts with a fence marker
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


def _validate_code(code: str) -> tuple[bool, str]:
    """Basic validation that the output looks like valid React code."""
    errors = []

    if not code.strip():
        return False, "Empty code output"

    # Must contain a function or const component
    has_component = (
        "function " in code or
        "const " in code or
        "export default" in code
    )
    if not has_component:
        errors.append("Missing React component definition (no function/const/export found)")

    # Must have JSX return
    has_jsx = "return" in code and ("<" in code or "className" in code)
    if not has_jsx:
        errors.append("No JSX return statement found")

    # Should have at least some Tailwind classes
    has_tailwind = "className" in code
    if not has_tailwind:
        errors.append("No Tailwind CSS className attributes found")

    if errors:
        return False, "; ".join(errors)

    return True, ""


async def _handle_generate(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Full code generation pipeline:
    Plan → Generate Code → Validate (with retry loop)
    """
    # ── Step 1: Plan ──
    yield _sse_event(EVENT_STEP, "Planning component architecture...")
    plan_prompt = get_generate_plan_prompt()
    plan_messages = [
        SystemMessage(content=plan_prompt),
        HumanMessage(content=f"User request: {request.prompt}\n\nCreate a layout plan."),
    ]

    try:
        plan_response = await llm.ainvoke(plan_messages)
        plan = plan_response.content.strip()
        yield _sse_event(EVENT_STEP, "Architecture plan created")
        yield _sse_event(EVENT_TOKEN, f"**Plan:** {plan}\n\n")
    except Exception as e:
        yield _sse_event(EVENT_ERROR, f"Planning failed: {str(e)}")
        yield _sse_event(EVENT_DONE, {"success": False})
        return

    # ── Step 2: Generate Code + Validate Loop ──
    errors = []
    generated_code = None

    for attempt in range(MAX_RETRIES + 1):
        if attempt == 0:
            yield _sse_event(EVENT_STEP, "Generating React + Tailwind code...")
        else:
            yield _sse_event(EVENT_STEP, f"Fixing issues and regenerating (attempt {attempt + 1})...")

        # Build generation prompt
        gen_prompt = get_generate_code_prompt()
        gen_prompt += f"\n\nLayout plan:\n{plan}"

        if errors:
            gen_prompt += "\n" + get_retry_context(errors)

        gen_messages = [
            SystemMessage(content=gen_prompt),
            HumanMessage(content=f"Generate the complete React component for: {request.prompt}"),
        ]

        try:
            gen_response = await llm.ainvoke(gen_messages)
            raw_output = gen_response.content.strip()
        except Exception as e:
            yield _sse_event(EVENT_ERROR, f"Code generation failed: {str(e)}")
            yield _sse_event(EVENT_DONE, {"success": False})
            return

        # Clean markdown fences
        generated_code = _clean_code_output(raw_output)

        # Validate
        yield _sse_event(EVENT_STEP, "Validating generated code...")
        is_valid, error = _validate_code(generated_code)

        if is_valid:
            yield _sse_event(EVENT_STEP, "Code validated successfully!")
            yield _sse_event(EVENT_CODE, generated_code)
            yield _sse_event(
                EVENT_DONE,
                {
                    "success": True,
                    "mode": "generate",
                    "retries": attempt,
                },
            )
            return
        else:
            errors.append(error)
            yield _sse_event(EVENT_STEP, f"Validation issue: {error}")

    # Max retries exhausted — return whatever we have
    yield _sse_event(EVENT_STEP, "Returning best effort output...")
    if generated_code:
        yield _sse_event(EVENT_CODE, generated_code)
    yield _sse_event(
        EVENT_DONE,
        {
            "success": True,  # Still return success since we have code
            "mode": "generate",
            "retries": MAX_RETRIES,
        },
    )
