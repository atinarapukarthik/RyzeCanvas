"""
Production-Ready Chat Orchestrator for RyzeCanvas.

Provides a unified interface for all chat interactions:
- Chat mode: Conversational responses via LLM
- Plan mode: Architectural breakdowns via LLM
- Generate mode: Full LangGraph pipeline (Retrieve → Plan → Generate → Validate)

Supports Server-Sent Events (SSE) for real-time streaming to the frontend.
"""
import json
import os
import asyncio
from typing import AsyncGenerator, Dict, Any, Optional, Literal
from dataclasses import dataclass, field

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.agent.system_prompt import (
    get_chat_prompt,
    get_plan_prompt,
    get_generate_plan_prompt,
    get_generate_code_prompt,
    get_retry_context,
)
from app.agent.rag import retrieve_context
from app.agent.validator import validate_dhdc
from app.core.component_library import ALLOWED_COMPONENTS


# ── SSE Event Types ──────────────────────────────────────────────
EVENT_STEP = "step"          # Progress step (e.g., "Retrieving context...")
EVENT_TOKEN = "token"        # Streaming text token
EVENT_PLAN = "plan"          # Plan output (chat/plan mode)
EVENT_CODE = "code"          # Generated code JSON
EVENT_ERROR = "error"        # Error message
EVENT_DONE = "done"          # Stream complete


@dataclass
class ChatRequest:
    """Incoming chat request from the frontend."""
    prompt: str
    mode: Literal["chat", "plan", "generate"] = "chat"
    provider: str = "gemini"
    model: str = "gemini-1.5-pro"
    conversation_history: list = field(default_factory=list)
    web_search_context: Optional[str] = None


def _sse_event(event: str, data: Any) -> str:
    """Format a Server-Sent Event string."""
    payload = json.dumps({"event": event, "data": data}, ensure_ascii=False)
    return f"data: {payload}\n\n"


def _get_llm(provider: str, model: str):
    """Get LLM instance for the specified provider."""
    if provider in ("claude", "anthropic"):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")
        return ChatAnthropic(
            model=model or "claude-3-5-sonnet-20241022",
            temperature=0.4,
            api_key=api_key,
            max_tokens=4096,
        )
    elif provider == "gemini":
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        return ChatGoogleGenerativeAI(
            model=model or "gemini-1.5-pro",
            temperature=0.4,
            google_api_key=api_key,
        )
    elif provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not configured")
        return ChatOpenAI(
            model=model or "gpt-4o",
            temperature=0.4,
            api_key=api_key,
        )
    elif provider == "openrouter":
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")
        return ChatOpenAI(
            model=model or "anthropic/claude-3.5-sonnet",
            temperature=0.4,
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )
    elif provider == "ollama":
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        return ChatOpenAI(
            model=model or "llama3",
            temperature=0.4,
            base_url=f"{base_url}/v1",
            api_key="ollama",
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}")


async def _stream_llm_response(
    llm, system_prompt: str, user_message: str, history: list
) -> AsyncGenerator[str, None]:
    """Stream LLM response token by token via SSE."""
    messages = [SystemMessage(content=system_prompt)]

    # Add conversation history
    for msg in history[-10:]:  # Keep last 10 messages for context
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

    # Retrieve relevant component context
    yield _sse_event(EVENT_STEP, "Retrieving component documentation...")
    try:
        context = retrieve_context(request.prompt, top_k=3)
    except Exception:
        context = f"Available components: {', '.join(ALLOWED_COMPONENTS)}"

    system_prompt = get_plan_prompt()
    enriched_prompt = f"{request.prompt}\n\nAvailable component context:\n{context}"

    yield _sse_event(EVENT_STEP, "Creating architectural plan...")

    async for event in _stream_llm_response(
        llm, system_prompt, enriched_prompt, request.conversation_history
    ):
        yield event

    yield _sse_event(EVENT_DONE, {"success": True, "mode": "plan"})


# ── GENERATE MODE (Full LangGraph Pipeline) ─────────────────────

MAX_RETRIES = 3


async def _handle_generate(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Full generation pipeline with streaming progress:
    Retrieve → Plan → Generate → Validate (with retry loop)
    """
    # ── Step 1: Retrieve ──
    yield _sse_event(EVENT_STEP, "Retrieving component documentation...")
    try:
        context = retrieve_context(request.prompt, top_k=3)
        yield _sse_event(EVENT_STEP, f"Found relevant components")
    except Exception as e:
        context = f"Available components: {', '.join(ALLOWED_COMPONENTS)}"
        yield _sse_event(EVENT_STEP, "Using default component library")

    # ── Step 2: Plan ──
    yield _sse_event(EVENT_STEP, "Planning layout architecture...")
    plan_prompt = get_generate_plan_prompt()
    plan_messages = [
        SystemMessage(content=plan_prompt + f"\n\nComponent context:\n{context}"),
        HumanMessage(content=f"User request: {request.prompt}\n\nCreate a layout plan."),
    ]

    try:
        plan_response = await llm.ainvoke(plan_messages)
        plan = plan_response.content.strip()
        yield _sse_event(EVENT_STEP, "Layout plan created")
        yield _sse_event(EVENT_TOKEN, f"**Plan:** {plan}\n\n")
    except Exception as e:
        yield _sse_event(EVENT_ERROR, f"Planning failed: {str(e)}")
        yield _sse_event(EVENT_DONE, {"success": False})
        return

    # ── Step 3: Generate + Validate Loop ──
    errors = []
    code_json = None

    for attempt in range(MAX_RETRIES + 1):
        if attempt == 0:
            yield _sse_event(EVENT_STEP, "Generating component JSON...")
        else:
            yield _sse_event(EVENT_STEP, f"Retrying generation (attempt {attempt + 1}/{MAX_RETRIES + 1})...")

        # Build generation prompt
        gen_prompt = get_generate_code_prompt()
        gen_prompt += f"\n\nComponent context:\n{context}\n\nLayout plan:\n{plan}"

        if errors:
            gen_prompt += "\n" + get_retry_context(errors)

        gen_messages = [
            SystemMessage(content=gen_prompt),
            HumanMessage(content="Generate the JSON now:"),
        ]

        try:
            gen_response = await llm.ainvoke(gen_messages)
            raw_output = gen_response.content.strip()
        except Exception as e:
            yield _sse_event(EVENT_ERROR, f"Generation failed: {str(e)}")
            yield _sse_event(EVENT_DONE, {"success": False})
            return

        # Clean markdown fences
        if "```json" in raw_output:
            start = raw_output.find("```json") + 7
            end = raw_output.rfind("```")
            raw_output = raw_output[start:end].strip()
        elif "```" in raw_output:
            start = raw_output.find("```") + 3
            end = raw_output.rfind("```")
            raw_output = raw_output[start:end].strip()

        # Parse JSON
        try:
            code_json = json.loads(raw_output)
            yield _sse_event(EVENT_STEP, "JSON parsed successfully")
        except json.JSONDecodeError as e:
            errors.append(f"JSON parse error: {str(e)}")
            yield _sse_event(EVENT_STEP, f"JSON parse error, retrying...")
            continue

        # Validate
        yield _sse_event(EVENT_STEP, "Validating components (D-HDC)...")
        is_valid, error = validate_dhdc(code_json)

        if is_valid:
            yield _sse_event(EVENT_STEP, "Validation passed!")
            yield _sse_event(EVENT_CODE, code_json)
            yield _sse_event(
                EVENT_DONE,
                {
                    "success": True,
                    "mode": "generate",
                    "components_count": len(code_json.get("components", [])),
                    "retries": attempt,
                },
            )
            return
        else:
            errors.append(error)
            yield _sse_event(EVENT_STEP, f"Validation failed, fixing errors...")

    # Max retries exhausted
    yield _sse_event(EVENT_ERROR, "Maximum retries reached. Returning best effort output.")
    if code_json:
        yield _sse_event(EVENT_CODE, code_json)
    yield _sse_event(
        EVENT_DONE,
        {
            "success": False,
            "mode": "generate",
            "errors": errors[-3:],  # Last 3 errors
            "retries": MAX_RETRIES,
        },
    )
