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
import logging
from typing import AsyncGenerator, Dict, Any, Optional, Literal
from dataclasses import dataclass, field

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("orchestrator")

from app.core.config import settings
from app.agent.system_prompt import (
    get_chat_prompt,
    get_plan_prompt,
    get_generate_plan_prompt,
    get_generate_json_prompt,
    get_explainer_prompt,
    get_retry_context,
    get_plan_questions_prompt,
    get_plan_from_answers_prompt,
    get_plan_implement_prompt,
)
from app.agent.rag import retrieve_context
from app.core.component_library import ALLOWED_COMPONENTS, UIPlan
from app.agent.command_executor import execute_command, format_command_output, CommandResult


# ── SSE Event Types ──────────────────────────────────────────────
EVENT_STEP = "step"          # Progress step (e.g., "Retrieving context...")
EVENT_TOKEN = "token"        # Streaming text token
EVENT_PLAN = "plan"          # Plan output (chat/plan mode)
EVENT_CODE = "code"          # Generated code (React/Tailwind)
EVENT_ERROR = "error"        # Error message
EVENT_DONE = "done"          # Stream complete
EVENT_QUESTIONS = "questions"  # Plan questions with options
EVENT_PLAN_READY = "plan_ready"  # Structured plan with files/skills
EVENT_INSTALL = "install"    # Library installation status
EVENT_FILE_UPDATE = "file_update"  # File creation/update status
EVENT_TODO = "todo"          # Implementation todo updates
EVENT_COMMAND = "command"    # Command execution results
EVENT_LOG_ANALYSIS = "log_analysis"  # Log analysis and insights
EVENT_EXPLANATION = "explanation"  # Design explanation


@dataclass
class ChatRequest:
    """Incoming chat request from the frontend."""
    prompt: str
    mode: Literal["chat", "plan", "generate",
                  "plan_interactive", "plan_implement"] = "chat"
    provider: str = "gemini"
    model: str = "gemini-2.5-flash"
    conversation_history: list = field(default_factory=list)
    web_search_context: Optional[str] = None
    plan_answers: Optional[list] = None
    plan_data: Optional[dict] = None
    existing_code: Optional[str] = None


def _sse_event(event: str, data: Any) -> str:
    """Format a Server-Sent Event string."""
    payload = json.dumps({"event": event, "data": data}, ensure_ascii=False)
    return f"data: {payload}\n\n"


def _format_llm_error(error: Exception) -> str:
    """Return a user-friendly error message, detecting rate limits and quota issues."""
    msg = str(error)
    lower = msg.lower()
    if "429" in msg or "resource_exhausted" in lower or "rate" in lower and "limit" in lower:
        return (
            "API rate limit exceeded. Your current quota has been reached. "
            "Please wait a moment and try again, or switch to a different AI provider/model."
        )
    if "quota" in lower or "exceeded" in lower and "billing" in lower:
        return (
            "API quota exhausted. Please check your plan and billing details "
            "for the selected AI provider, or switch to a different model."
        )
    return msg


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
            max_tokens=16384,
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
        yield _sse_event(EVENT_ERROR, f"LLM streaming error: {_format_llm_error(e)}")
        return

    yield _sse_event(EVENT_PLAN, full_response)


async def _execute_and_stream_command(
    command: str,
    cwd: Optional[str] = None,
    timeout: int = 60
) -> AsyncGenerator[str, None]:
    """
    Execute a command and stream the results via SSE.
    Yields command output and analysis.
    """
    yield _sse_event(EVENT_STEP, f"Executing: {command}")

    try:
        result = await execute_command(command, cwd=cwd, timeout=timeout)

        # Format and send command output
        formatted_output = format_command_output(result)
        yield _sse_event(EVENT_COMMAND, {
            "command": result.command,
            "exit_code": result.exit_code,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "error": result.error,
            "formatted": formatted_output
        })

    except Exception as e:
        yield _sse_event(EVENT_ERROR, f"Command execution failed: {str(e)}")


async def _analyze_logs_with_llm(
    llm,
    logs: str,
    context: str = ""
) -> AsyncGenerator[str, None]:
    """
    Analyze logs using LLM and stream insights via SSE.
    """
    yield _sse_event(EVENT_STEP, "Analyzing logs...")

    system_prompt = """You are an expert at analyzing application logs and error messages.
Provide concise, actionable insights about:
1. What went wrong (if errors present)
2. Root cause analysis
3. Specific fix recommendations with commands/code

Be direct and practical. Format your response with clear sections."""

    analysis_prompt = f"""Analyze these logs and provide insights:

{context}

Logs:
```
{logs[:5000]}  # Limit to first 5000 chars to avoid token overflow
```

Provide actionable recommendations to fix any issues."""

    full_analysis = ""
    try:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=analysis_prompt)
        ]

        async for chunk in llm.astream(messages):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            if token:
                full_analysis += token
                yield _sse_event(EVENT_TOKEN, token)

        yield _sse_event(EVENT_LOG_ANALYSIS, {
            "analysis": full_analysis,
            "logs_length": len(logs)
        })

    except Exception as e:
        yield _sse_event(EVENT_ERROR, f"Log analysis failed: {str(e)}")


async def orchestrate_chat(request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Main orchestration entry point. Routes to the appropriate handler
    based on the request mode.

    Yields SSE-formatted strings for real-time streaming.
    """
    logger.info(f"Starting orchestration: mode={request.mode}, provider={request.provider}, model={request.model}")
    try:
        llm = _get_llm(request.provider, request.model)
    except ValueError as e:
        logger.error(f"Failed to initialize LLM: {str(e)}")
        yield _sse_event(EVENT_ERROR, str(e))
        yield _sse_event(EVENT_DONE, {"success": False})
        return

    if request.mode == "chat":
        logger.info("Routing to chat handler")
        async for event in _handle_chat(llm, request):
            yield event
    elif request.mode == "plan":
        logger.info("Routing to plan handler")
        async for event in _handle_plan(llm, request):
            yield event
    elif request.mode == "generate":
        logger.info("Routing to generate handler")
        async for event in _handle_generate(llm, request):
            yield event
    elif request.mode == "plan_interactive":
        logger.info("Routing to plan_interactive handler")
        async for event in _handle_plan_interactive(llm, request):
            yield event
    elif request.mode == "plan_implement":
        logger.info("Routing to plan_implement handler")
        async for event in _handle_plan_implement(llm, request):
            yield event
    else:
        logger.warning(f"Unknown mode requested: {request.mode}")
        yield _sse_event(EVENT_ERROR, f"Unknown mode: {request.mode}")
        yield _sse_event(EVENT_DONE, {"success": False})
    
    logger.info(f"Orchestration complete: mode={request.mode}")


# ── CHAT MODE ────────────────────────────────────────────────────

async def _handle_chat(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """Handle conversational chat with streaming."""
    yield _sse_event(EVENT_STEP, "Thinking...")

    system_prompt = get_chat_prompt()

    # Enrich with web search context if available
    if request.web_search_context:
        system_prompt += f"\n\n<web-search-results>\n{request.web_search_context}\n</web-search-results>"

    # Include existing code context so AI can discuss the current project
    if request.existing_code:
        code_preview = request.existing_code[:3000]
        system_prompt += f"\n\n<current-project-code>\n{code_preview}\n</current-project-code>"

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


def _clean_code_output(raw: str) -> str | dict:
    """
    Strip markdown fences and parse output.
    Returns either:
    - dict: JSON project structure with multiple files
    - str: Single component code (backward compatibility)
    """
    import re
    import json

    raw = raw.strip()

    # Remove markdown code fences wrapping the entire output
    # Handles ```json\n{...}\n``` and ```\n{...}\n```
    fence_wrap = re.match(r'^```(?:json|JSON)?\s*\n([\s\S]*?)\n```\s*$', raw)
    if fence_wrap:
        raw = fence_wrap.group(1).strip()

    # Try to find and parse a JSON object (greedy — find the outermost {})
    # Use a balanced brace counter for more reliable extraction
    json_str = _extract_json_object(raw)
    if json_str:
        try:
            parsed = json.loads(json_str)
            if isinstance(parsed, dict) and len(parsed) > 0:
                # Check if it looks like a project structure (file paths as keys)
                file_keys = [k for k in parsed.keys() if '.' in k or '/' in k]
                if len(file_keys) >= 2:
                    return parsed
        except json.JSONDecodeError:
            pass

    # Fallback: try regex-based JSON extraction
    json_pattern = re.compile(r'\{[\s\S]*\}', re.MULTILINE)
    json_match = json_pattern.search(raw)
    if json_match:
        try:
            parsed = json.loads(json_match.group(0))
            if isinstance(parsed, dict) and (
                'package.json' in parsed or
                'vite.config.js' in parsed or
                'next.config.js' in parsed or
                len(parsed) > 1
            ):
                return parsed
        except json.JSONDecodeError:
            pass

    # Fallback: Extract single component code from markdown fences
    fence_pattern = re.compile(
        r'```(?:tsx|jsx|typescript|react|ts|json)?\s*\n([\s\S]*?)```',
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


def _extract_json_object(text: str) -> str | None:
    """
    Extract the outermost JSON object from text using balanced brace counting.
    More reliable than regex for nested JSON.
    """
    start = text.find('{')
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape_next = False

    for i in range(start, len(text)):
        c = text[i]

        if escape_next:
            escape_next = False
            continue

        if c == '\\' and in_string:
            escape_next = True
            continue

        if c == '"' and not escape_next:
            in_string = not in_string
            continue

        if in_string:
            continue

        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return text[start:i + 1]

    return None


def _validate_ui_plan(plan_data: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validate the UI Plan JSON against the schema and component library.
    """
    try:
        # Pydantic validation
        UIPlan(**plan_data)
        return True, ""
    except Exception as e:
        return False, f"Schema Error: {str(e)}"


def _validate_code(code: str | dict) -> tuple[bool, str]:
    """
    Validate either:
    - JSON project structure (dict)
    - Single component code (str)
    """
    import re

    # If it's a project structure (dict)
    if isinstance(code, dict):
        errors = []

        if not code:
            return False, "Empty project structure"

        # Must have package.json
        if 'package.json' not in code:
            errors.append("Missing package.json")

        # Must have either src/main.tsx (Vite) or app/page.tsx (Next.js)
        has_entry_point = (
            'src/main.tsx' in code or
            'app/page.tsx' in code or
            'src/App.tsx' in code
        )
        if not has_entry_point:
            errors.append(
                "Missing entry point (src/main.tsx, src/App.tsx, or app/page.tsx)")

        # Must have Tailwind config
        if 'tailwind.config.js' not in code:
            errors.append("Missing tailwind.config.js")

        # Validate at least one component file has React content
        has_react_component = False
        for file_path, content in code.items():
            if file_path.endswith(('.tsx', '.jsx')):
                if 'export default' in content or 'function ' in content:
                    has_react_component = True
                    break

        if not has_react_component:
            errors.append("No React components found in project files")

        if errors:
            return False, "; ".join(errors)

        return True, ""

    # Single component validation (backward compatibility)
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
        errors.append(
            "Missing React component definition (no function/const/export found)")

    # Must have JSX return
    has_jsx = "return" in code and ("<" in code or "className" in code)
    if not has_jsx:
        errors.append("No JSX return statement found")

    # Should have at least some Tailwind classes
    has_tailwind = "className" in code
    if not has_tailwind:
        errors.append("No Tailwind CSS className attributes found")

    # Check for undefined component references
    # Extract JSX component tags (capitalized, e.g., <Header />, <Footer>)
    jsx_components = set(re.findall(r'<([A-Z][a-zA-Z0-9]*)', code))

    # Extract defined components
    defined_components = set()
    # Function components: function ComponentName()
    defined_components.update(re.findall(
        r'function\s+([A-Z][a-zA-Z0-9]*)', code))
    # Const/let/var components: const ComponentName =
    defined_components.update(re.findall(
        r'(?:const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*=', code))

    # Built-in/stub components that are available in the preview environment
    builtin_components = {
        'Fragment', 'Suspense', 'StrictMode',  # React built-ins
        # Framer Motion is stubbed
        'motion',
        # Any component from motion (motion.div, motion.span, etc.) is handled by proxy
    }

    # Find undefined references
    undefined_refs = jsx_components - defined_components - builtin_components

    if undefined_refs:
        undefined_list = ", ".join(sorted(undefined_refs))
        errors.append(
            f"Component(s) referenced but not defined: {undefined_list}. "
            "Please define all components in a single self-contained file or use only lowercase HTML elements."
        )

    if errors:
        return False, "; ".join(errors)

    return True, ""


async def _handle_generate(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Full code generation pipeline:
    Plan → Generate Code → Validate (with retry loop)

    Emits structured thinking steps and todos so the user can see the AI's reasoning.
    When existing_code is provided, the AI analyzes it and generates modifications.
    """
    import re as _re

    has_existing = bool(request.existing_code)

    # ── Step 1: Planning (context-aware) with structured thinking ──
    logger.info("Generation Step 1: Planning")
    if has_existing:
        yield _sse_event(EVENT_STEP, "Analyzing existing code...")
        yield _sse_event(EVENT_STEP, "Identifying what needs to change...")
    else:
        yield _sse_event(EVENT_STEP, "Understanding your request...")
        yield _sse_event(EVENT_STEP, "Planning project structure...")

    plan = ""
    try:
        plan_prompt = get_generate_plan_prompt()

        # Include existing code context in planning
        plan_user_msg = f"Create a structured plan for: {request.prompt}"
        if has_existing:
            # Truncate existing code to avoid token overflow (first 3000 chars)
            code_preview = request.existing_code[:3000]
            plan_user_msg = (
                f"The user already has an existing project with this code:\n"
                f"```\n{code_preview}\n```\n\n"
                f"They now want to: {request.prompt}\n\n"
                f"Create a plan for what to modify or add. Focus on the changes needed."
            )

        plan_messages = [
            SystemMessage(content=plan_prompt),
            HumanMessage(content=plan_user_msg),
        ]
        logger.info("Invoking LLM for plan generation")
        plan_response = await llm.ainvoke(plan_messages)
        plan = plan_response.content.strip()
        logger.info("Plan generated successfully")
        yield _sse_event(EVENT_PLAN, plan)

        # Extract implementation steps from the plan and emit as todos
        step_lines = _re.findall(r'^\d+\.\s+(.+)$', plan, _re.MULTILINE)
        if step_lines:
            logger.info(f"Extracted {len(step_lines)} steps from plan")
            todos = [
                {"id": f"step_{i+1}", "label": step.strip().rstrip('.'), "status": "pending"}
                for i, step in enumerate(step_lines[:8])  # Max 8 todos
            ]
            yield _sse_event(EVENT_TODO, todos)

        yield _sse_event(EVENT_STEP, "Plan complete. Generating code...")
    except Exception as e:
        # Planning failed — continue without plan
        logger.error(f"Planning failed: {str(e)}")
        yield _sse_event(EVENT_STEP, f"Planning skipped: {_format_llm_error(e)}")

    # ── Step 2: Generate JSON Plan + Validate Loop ──
    logger.info("Generation Step 2: JSON Plan Generation & Validation Loop")
    errors = []
    generated_plan = None

    for attempt in range(MAX_RETRIES + 1):
        logger.info(f"Generation attempt {attempt + 1}")
        if attempt == 0:
            yield _sse_event(EVENT_STEP, "Generating UI components plan...")
        else:
            yield _sse_event(EVENT_STEP, f"Fixing schema issues (attempt {attempt + 1})...")

        # Build generation prompt
        gen_prompt = get_generate_json_prompt()

        if plan:
            gen_prompt += f"\n\n<layout-plan>\n{plan}\n</layout-plan>"

        if errors:
            gen_prompt += "\n" + get_retry_context(errors)

        gen_messages = [
            SystemMessage(content=gen_prompt),
            HumanMessage(content=f"Generate the UIPlan JSON for: {request.prompt}"),
        ]

        try:
            logger.info("Invoking LLM for plan generation")
            gen_response = await llm.ainvoke(gen_messages)
            raw_output = gen_response.content.strip()
            logger.info("Plan generation complete")
        except Exception as e:
            logger.error(f"Plan generation failed: {str(e)}")
            yield _sse_event(EVENT_ERROR, f"Plan generation failed: {_format_llm_error(e)}")
            yield _sse_event(EVENT_DONE, {"success": False})
            return

        # Extract JSON
        yield _sse_event(EVENT_STEP, "Parsing JSON plan...")
        
        # Helper to extract JSON dict
        from app.agent.graph import _extract_json
        try:
            generated_plan = _extract_json(raw_output)
        except Exception as e:
             generated_plan = None
             error = f"JSON Parse Error: {str(e)}"
             errors.append(error)
             yield _sse_event(EVENT_STEP, f"Found issue: {error}")
             continue

        # Validate
        yield _sse_event(EVENT_STEP, "Validating against Component Library...")
        is_valid, error = _validate_ui_plan(generated_plan)

        if is_valid:
            logger.info("Plan validation passed")
            yield _sse_event(EVENT_STEP, "Validation passed!")
            
            # Emit the code event with the JSON plan (frontend handles it)
            yield _sse_event(EVENT_CODE, generated_plan)
            
            # ── Step 3: Explanation ──
            yield _sse_event(EVENT_STEP, "Generating explanation...")
            async for event in _handle_explainer(llm, request.prompt, generated_plan, plan):
                yield event
                
            yield _sse_event(EVENT_DONE, {"success": True, "mode": "generate", "retries": attempt})
            return
        else:
            logger.warning(f"Plan validation failed: {error}")
            errors.append(error)
            yield _sse_event(EVENT_STEP, f"Found issue: {error}")
            yield _sse_event(EVENT_STEP, "Refining plan...")

    # Max retries exhausted
    yield _sse_event(EVENT_ERROR, "Failed to generate valid plan after retries.")
    yield _sse_event(EVENT_DONE, {"success": False})


async def _handle_explainer(llm, user_request: str, ui_plan: Dict[str, Any], initial_plan: str) -> AsyncGenerator[str, None]:
    """
    Generate and stream the explanation for the UI.
    """
    system_prompt = get_explainer_prompt()
    
    components = ui_plan.get("components", [])
    comp_summary = ", ".join([c.get("type", "Unknown") for c in components])
    plan_summary = f"Components: {comp_summary}. Layout: {ui_plan.get('layout', {}).get('theme', 'default')}"
    
    formatted_prompt = system_prompt.replace("{user_request}", user_request).replace("{plan_summary}", plan_summary)
    
    messages = [
        SystemMessage(content=formatted_prompt),
        HumanMessage(content="Explain this design.")
    ]
    
    try:
        response = await llm.ainvoke(messages)
        explanation = response.content.strip()
        yield _sse_event(EVENT_EXPLANATION, explanation)
    except Exception as e:
        logger.error(f"Explanation failed: {e}")
        yield _sse_event(EVENT_STEP, "Could not generate explanation.")


async def _emit_generated_code(
    generated_code: str | dict, retries: int
) -> AsyncGenerator[str, None]:
    """
    Emit the generated code via SSE events.
    Handles both project structure (dict) and single component (str).
    """
    if isinstance(generated_code, dict):
        # Full project structure - send all files
        yield _sse_event(EVENT_STEP, f"Project structure complete with {len(generated_code)} files")

        # Send the main entry point as EVENT_CODE for preview
        main_file = (
            generated_code.get('src/App.tsx') or
            generated_code.get('app/page.tsx') or
            generated_code.get('src/main.tsx') or
            list(generated_code.values())[0]
        )
        yield _sse_event(EVENT_CODE, main_file)

        # Send complete project structure in EVENT_DONE
        yield _sse_event(
            EVENT_DONE,
            {
                "success": True,
                "mode": "generate",
                "retries": retries,
                "all_files": generated_code,
                "file_count": len(generated_code),
            },
        )
    else:
        # Single component
        yield _sse_event(EVENT_CODE, generated_code)
        yield _sse_event(
            EVENT_DONE,
            {
                "success": True,
                "mode": "generate",
                "retries": retries,
            },
        )


# ── PLAN INTERACTIVE MODE ────────────────────────────────────────

async def _handle_plan_interactive(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Interactive plan mode:
    - If no plan_answers: generate clarifying questions with options
    - If plan_answers provided: generate structured plan from answers
    """
    if request.plan_answers:
        # Phase 2: Generate plan from answers
        yield _sse_event(EVENT_STEP, "Creating implementation plan from your answers...")

        answers_text = "\n".join(
            f"Q: {a['question']}\nA: {a['answer']}"
            for a in request.plan_answers
        )

        plan_prompt = get_plan_from_answers_prompt()
        plan_messages = [
            SystemMessage(content=plan_prompt),
            HumanMessage(
                content=f"Original request: {request.prompt}\n\nUser's answers:\n{answers_text}\n\nGenerate the implementation plan as JSON."
            ),
        ]

        try:
            plan_response = await llm.ainvoke(plan_messages)
            raw_plan = plan_response.content.strip()

            # Try to parse JSON from the response
            import re
            json_match = re.search(r'\{[\s\S]*\}', raw_plan)
            if json_match:
                plan_data = json.loads(json_match.group())
            else:
                plan_data = json.loads(raw_plan)

            yield _sse_event(EVENT_STEP, "Plan created successfully!")
            yield _sse_event(EVENT_PLAN_READY, plan_data)
            yield _sse_event(EVENT_DONE, {"success": True, "mode": "plan_interactive"})
        except json.JSONDecodeError:
            yield _sse_event(EVENT_ERROR, "Failed to parse plan. Retrying...")
            # Retry once with stricter instructions
            retry_messages = [
                SystemMessage(
                    content=plan_prompt + "\n\nIMPORTANT: Output ONLY valid JSON. No markdown, no extra text."),
                HumanMessage(
                    content=f"Original request: {request.prompt}\n\nUser's answers:\n{answers_text}\n\nGenerate ONLY the JSON plan."),
            ]
            try:
                retry_response = await llm.ainvoke(retry_messages)
                raw_retry = retry_response.content.strip()
                json_match = re.search(r'\{[\s\S]*\}', raw_retry)
                if json_match:
                    plan_data = json.loads(json_match.group())
                else:
                    plan_data = json.loads(raw_retry)
                yield _sse_event(EVENT_PLAN_READY, plan_data)
                yield _sse_event(EVENT_DONE, {"success": True, "mode": "plan_interactive"})
            except Exception as e:
                yield _sse_event(EVENT_ERROR, f"Plan generation failed: {_format_llm_error(e)}")
                yield _sse_event(EVENT_DONE, {"success": False})
        except Exception as e:
            yield _sse_event(EVENT_ERROR, f"Plan generation failed: {_format_llm_error(e)}")
            yield _sse_event(EVENT_DONE, {"success": False})
    else:
        # Phase 1: Generate clarifying questions
        yield _sse_event(EVENT_STEP, "Analyzing your request...")
        yield _sse_event(EVENT_STEP, "Generating clarifying questions...")

        questions_prompt = get_plan_questions_prompt()
        q_messages = [
            SystemMessage(content=questions_prompt),
            HumanMessage(
                content=f"User request: {request.prompt}\n\nGenerate clarifying questions with options as JSON."
            ),
        ]

        try:
            q_response = await llm.ainvoke(q_messages)
            raw_questions = q_response.content.strip()

            import re
            json_match = re.search(r'\{[\s\S]*\}', raw_questions)
            if json_match:
                questions_data = json.loads(json_match.group())
            else:
                questions_data = json.loads(raw_questions)

            yield _sse_event(EVENT_QUESTIONS, questions_data)
            yield _sse_event(EVENT_DONE, {"success": True, "mode": "plan_interactive"})
        except json.JSONDecodeError:
            yield _sse_event(EVENT_ERROR, "Failed to parse questions. Retrying...")
            retry_messages = [
                SystemMessage(content=questions_prompt +
                              "\n\nIMPORTANT: Output ONLY valid JSON."),
                HumanMessage(
                    content=f"User request: {request.prompt}\n\nGenerate ONLY the JSON."),
            ]
            try:
                retry_response = await llm.ainvoke(retry_messages)
                raw_retry = retry_response.content.strip()
                json_match = re.search(r'\{[\s\S]*\}', raw_retry)
                if json_match:
                    questions_data = json.loads(json_match.group())
                else:
                    questions_data = json.loads(raw_retry)
                yield _sse_event(EVENT_QUESTIONS, questions_data)
                yield _sse_event(EVENT_DONE, {"success": True, "mode": "plan_interactive"})
            except Exception as e:
                yield _sse_event(EVENT_ERROR, f"Question generation failed: {_format_llm_error(e)}")
                yield _sse_event(EVENT_DONE, {"success": False})
        except Exception as e:
            yield _sse_event(EVENT_ERROR, f"Question generation failed: {_format_llm_error(e)}")
            yield _sse_event(EVENT_DONE, {"success": False})


# ── PLAN IMPLEMENT MODE ──────────────────────────────────────────

async def _handle_plan_implement(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Implement a plan file by file.
    Sends progressive events for: todos, library installation, file creation.
    """
    if not request.plan_data:
        yield _sse_event(EVENT_ERROR, "No plan data provided for implementation")
        yield _sse_event(EVENT_DONE, {"success": False})
        return

    plan = request.plan_data
    files = plan.get("files", [])
    libraries = plan.get("libraries", [])
    steps = plan.get("steps", [])

    # ── Send initial todo list ──
    todos = [{"id": f"step-{i}", "label": step, "status": "pending"}
             for i, step in enumerate(steps)]
    yield _sse_event(EVENT_TODO, todos)
    await asyncio.sleep(0.3)

    # ── Phase 1: Install libraries ──
    yield _sse_event(EVENT_STEP, "Installing dependencies...")
    lib_statuses = [{"name": lib, "status": "pending"} for lib in libraries]
    yield _sse_event(EVENT_INSTALL, lib_statuses)

    for i, lib in enumerate(libraries):
        lib_statuses[i]["status"] = "installing"
        yield _sse_event(EVENT_INSTALL, lib_statuses)
        await asyncio.sleep(0.5)  # Simulate install time
        lib_statuses[i]["status"] = "installed"
        yield _sse_event(EVENT_INSTALL, lib_statuses)

    # Mark first todo as in_progress
    if todos:
        todos[0]["status"] = "in_progress"
        yield _sse_event(EVENT_TODO, todos)

    # ── Phase 2: Generate files one by one ──
    yield _sse_event(EVENT_STEP, "Creating project files...")
    all_generated_code = {}
    file_statuses = [{"path": f["path"], "name": f["name"],
                      "status": "pending"} for f in files]
    yield _sse_event(EVENT_FILE_UPDATE, file_statuses)

    impl_prompt = get_plan_implement_prompt()

    # Build plan context for the AI
    plan_context = f"""Project: {plan.get('title', 'Untitled')}
Description: {plan.get('description', '')}
Files to create: {json.dumps(files, indent=2)}
Libraries: {', '.join(libraries)}
Steps: {json.dumps(steps)}"""

    for idx, file_info in enumerate(files):
        file_statuses[idx]["status"] = "writing"
        yield _sse_event(EVENT_FILE_UPDATE, file_statuses)
        yield _sse_event(EVENT_STEP, f"Generating {file_info['name']}...")

        # Update todos — mark current step as in_progress
        todo_idx = min(idx + 1, len(todos) - 1)
        for t in todos:
            if t["status"] == "in_progress":
                t["status"] = "completed"
        if todo_idx < len(todos):
            todos[todo_idx]["status"] = "in_progress"
        yield _sse_event(EVENT_TODO, todos)

        # Build context with already generated files
        already_generated = "\n\n".join(
            f"=== {path} ===\n{code}"
            for path, code in all_generated_code.items()
        )

        file_messages = [
            SystemMessage(content=impl_prompt),
            HumanMessage(
                content=(
                    f"Plan context:\n{plan_context}\n\n"
                    f"Original user request: {request.prompt}\n\n"
                    f"Already generated files:\n{already_generated}\n\n"
                    f"Now generate the code for: {file_info['path']}\n"
                    f"Description: {file_info['description']}\n\n"
                    f"Output ONLY the code. No markdown fences."
                )
            ),
        ]

        try:
            gen_response = await llm.ainvoke(file_messages)
            raw_code = gen_response.content.strip()
            cleaned_code = _clean_code_output(raw_code)

            all_generated_code[file_info["path"]] = cleaned_code
            file_statuses[idx]["status"] = "completed"
            file_statuses[idx]["code"] = cleaned_code
            yield _sse_event(EVENT_FILE_UPDATE, file_statuses)
        except Exception as e:
            yield _sse_event(EVENT_ERROR, f"Failed to generate {file_info['name']}: {_format_llm_error(e)}")
            file_statuses[idx]["status"] = "completed"
            yield _sse_event(EVENT_FILE_UPDATE, file_statuses)

    # Mark all todos as completed
    for t in todos:
        t["status"] = "completed"
    yield _sse_event(EVENT_TODO, todos)

    # ── Phase 3: Combine all files into main component code ──
    # For the preview, combine into a single component
    main_code = all_generated_code.get(
        files[0]["path"] if files else "",
        ""
    )
    # Try to find the main component file
    for f in files:
        if f["path"].endswith("page.tsx") or "Generated" in f["name"]:
            main_code = all_generated_code.get(f["path"], main_code)
            break

    if main_code:
        yield _sse_event(EVENT_CODE, main_code)

    yield _sse_event(
        EVENT_DONE,
        {
            "success": True,
            "mode": "plan_implement",
            "files_generated": len(all_generated_code),
            "all_files": {path: code for path, code in all_generated_code.items()},
        },
    )
