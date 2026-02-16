"""
Production-Ready Chat Orchestrator for RyzeCanvas.
Refactored to support the XML "Artifact Protocol" for robust code generation.

Provides a unified interface for all chat interactions:
- Chat mode: Conversational responses via LLM
- Plan mode: Architectural breakdowns via LLM
- Generate mode: Full React/Tailwind code generation pipeline using Artifacts

Supports Server-Sent Events (SSE) for real-time streaming to the frontend.
"""
from app.agent.command_executor import execute_command, format_command_output
from app.core.component_library import UIPlan
from app.agent.system_prompt import (
    get_chat_prompt,
    get_plan_prompt,
    get_generate_plan_prompt,
    get_generate_json_prompt,
    get_explainer_prompt,
    get_plan_questions_prompt,
    get_plan_from_answers_prompt,
)
from app.core.config import settings
import json
import asyncio
import logging
import httpx
import os
import re
from typing import AsyncGenerator, Dict, Any, Optional, Literal, List
from dataclasses import dataclass, field

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("orchestrator")


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
EVENT_WEB_SEARCH = "web_search"    # Web search results


@dataclass
class ChatRequest:
    """Incoming chat request from the frontend."""
    prompt: str
    mode: Literal["chat", "plan", "generate",
                  "plan_interactive", "plan_implement", "ui_composer"] = "chat"
    provider: str = "openai"
    model: str = "gpt-4o"
    conversation_history: list = field(default_factory=list)
    web_search_context: Optional[str] = None
    plan_answers: Optional[list] = None
    plan_data: Optional[dict] = None
    existing_code: Optional[str] = None
    theme_context: Optional[str] = None


@dataclass
class RyzeAction:
    """Represents a single action within an artifact."""
    type: str  # 'file' or 'shell'
    content: str
    path: Optional[str] = None


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


def _sanitize_path(path: str) -> str:
    """Ensure the path is safe and strictly within the workspace."""
    workspace_dir = os.path.abspath(os.path.join(os.getcwd(), "..", "workspace"))
    # Normalize path to remove ../../ stuff
    full_path = os.path.abspath(os.path.join(workspace_dir, path))
    if not full_path.startswith(workspace_dir):
        raise ValueError(f"Security Warning: Attempted to write outside workspace: {path}")
    return full_path


def _write_file(path: str, content: str):
    """Write generated file content to the local workspace directory."""
    try:
        full_path = _sanitize_path(path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
            
        logger.info(f"Wrote file: {path}")
        return True
    except Exception as e:
        logger.error(f"Failed to write file {path}: {e}")
        return False


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


async def _get_project_context() -> str:
    """
    Gather essential project context (file list, types, config) 
    to provide the AI with sight of the whole project.
    """
    context = ""
    workspace_dir = os.path.abspath(os.path.join(os.getcwd(), "..", "workspace"))
    
    if not os.path.exists(workspace_dir):
        return ""

    try:
        # 1. Get file list (depth 3)
        # Using python standard lib instead of shell command for cross-platform safety
        file_list = []
        for root, dirs, files in os.walk(workspace_dir):
            if 'node_modules' in dirs:
                dirs.remove('node_modules')
            if '.git' in dirs:
                dirs.remove('.git')
                
            for file in files:
                rel_path = os.path.relpath(os.path.join(root, file), workspace_dir)
                if rel_path.count(os.sep) < 3: # Depth limit
                    file_list.append(rel_path.replace("\\", "/"))

        context += f"\n<project-files>\n{chr(10).join(file_list)}\n</project-files>"

        # 2. Read Core Files
        core_files = ["src/types.ts", "src/types/index.ts", "package.json", "src/lib/api.ts", "vite.config.ts"]
        for rel_path in core_files:
            full_path = os.path.join(workspace_dir, rel_path)
            if os.path.exists(full_path):
                with open(full_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    context += f"\n<file path='{rel_path}'>\n{content}\n</file>"
                    
    except Exception as e:
        logger.warning(f"Failed to gather project context: {e}")
        
    return context


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
    elif provider == "ollama":
        from langchain_ollama import ChatOllama
        return ChatOllama(
             base_url=settings.OLLAMA_BASE_URL,
             model=settings.OLLAMA_MODEL,
             temperature=0.3,
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}")


# ── ARTIFACT PARSING LOGIC ───────────────────────────────────────

def _extract_artifacts(text: str) -> List[List[RyzeAction]]:
    """
    Parse the full LLM response text and extract all <ryze_artifact> blocks.
    Returns a list of artifacts, where each artifact is a list of RyzeActions.
    """
    artifacts = []
    
    # Regex to find artifact blocks
    artifact_pattern = re.compile(r'<ryze_artifact.*?>(.*?)</ryze_artifact>', re.DOTALL)
    
    # Regex to find actions inside an artifact
    # Captures: type="...", path="..." (optional), and the content
    action_pattern = re.compile(
        r'<ryze_action\s+type=["\'](.*?)["\'](?:\s+path=["\'](.*?)["\'])?\s*>(.*?)</ryze_action>',
        re.DOTALL
    )

    for artifact_match in artifact_pattern.finditer(text):
        artifact_content = artifact_match.group(1)
        actions = []
        
        for action_match in action_pattern.finditer(artifact_content):
            action_type = action_match.group(1)
            action_path = action_match.group(2)
            action_content = action_match.group(3).strip()
            
            # Clean up XML entities if needed, though usually LLMs output raw code
            # We assume the prompt instruction "No Markdown" keeps it clean
            
            actions.append(RyzeAction(
                type=action_type,
                path=action_path,
                content=action_content
            ))
        
        if actions:
            artifacts.append(actions)
            
    return artifacts


async def _execute_actions_stream(actions: List[RyzeAction]) -> AsyncGenerator[str, None]:
    """
    Execute a list of RyzeActions and yield SSE events for the frontend.
    """
    logger.info(f"[_execute_actions] Processing {len(actions)} actions.")
    for i, action in enumerate(actions):
        logger.info(f"[_execute_actions] Action {i+1}: Type={action.type}, Path={action.path}")
        if action.type == "file" and action.path:
            logger.info(f"[_execute_actions] Writing file: {action.path}")
            yield _sse_event(EVENT_STEP, f"Writing file: {action.path}")
            success = _write_file(action.path, action.content)
            
            status = "completed" if success else "error"
            yield _sse_event(EVENT_FILE_UPDATE, [{
                "path": action.path,
                "name": os.path.basename(action.path),
                "status": status,
                "code": action.content
            }])
            
            # If it's the main file, update the preview editor
            if action.path.endswith("App.tsx") or action.path.endswith("main.tsx") or action.path.endswith("page.tsx"):
                 yield _sse_event(EVENT_CODE, action.content)

        elif action.type == "shell":
            command = action.content.strip()
            logger.info(f"[_execute_actions] Executing command: {command}")
            yield _sse_event(EVENT_STEP, f"Running: {command}")
            
            # Execute command
            result = await execute_command(command, timeout=120)
            formatted_output = format_command_output(result)
            
            yield _sse_event(EVENT_COMMAND, {
                "command": result.command,
                "exit_code": result.exit_code,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "error": result.error,
                "formatted": formatted_output
            })
            
            # Simple heuristic for library install events
            if "npm install" in command or "npm i " in command:
                yield _sse_event(EVENT_INSTALL, [{"name": command, "status": "installed"}])


# ── ORCHESTRATION ENTRY POINT ────────────────────────────────────

async def orchestrate_chat(request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Main orchestration entry point. Routes to the appropriate handler.
    """
    logger.info(
        f"Starting orchestration: mode={request.mode}, provider={request.provider}, model={request.model}")
    try:
        llm = _get_llm(request.provider, request.model)
    except ValueError as e:
        logger.error(f"Failed to initialize LLM: {str(e)}")
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
        # Unified Generate Mode using Artifacts
        async for event in _handle_generate_unified(llm, request):
            yield event
    elif request.mode == "ui_composer":
        # Specialized deterministic mode (LangGraph-style JSON)
        # Note: You might want to link this to graph.py's run_agent instead
        # For now, we'll implement a simple handler here
        async for event in _handle_ui_composer(llm, request):
            yield event
    elif request.mode == "plan_interactive":
         async for event in _handle_plan_interactive(llm, request):
            yield event
    else:
        logger.warning(f"Unknown mode requested: {request.mode}")
        yield _sse_event(EVENT_ERROR, f"Unknown mode: {request.mode}")
        yield _sse_event(EVENT_DONE, {"success": False})


# ── CHAT MODE HANDLER ────────────────────────────────────────────

async def _handle_chat(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Handle conversational chat.
    Now listens for XML Artifacts instead of JSON updates.
    """
    yield _sse_event(EVENT_STEP, "Thinking...")

    system_prompt_base = get_chat_prompt()

    # Enrich with context
    system_ctx = ""
    if request.existing_code:
        system_ctx += f"\n\n<current-file-context>\n{request.existing_code[:10000]}\n</current-file-context>"

    project_ctx = await _get_project_context()
    system_prompt = system_prompt_base + project_ctx + system_ctx

    messages = [SystemMessage(content=system_prompt)]
    
    # Add history
    for msg in request.conversation_history[-6:]:
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg.get("role") in ("ai", "assistant"):
            messages.append(AIMessage(content=msg["content"]))
    
    messages.append(HumanMessage(content=request.prompt))

    full_response = ""
    try:
        async for chunk in llm.astream(messages):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            if token:
                full_response += token
                yield _sse_event(EVENT_TOKEN, token)
    except Exception as e:
            yield _sse_event(EVENT_ERROR, f"LLM error: {_format_llm_error(e)}")
            return

    # Post-processing: Check for Artifacts
    # In a true streaming parser, we'd do this incrementally.
    # For stability, we check after the turn.
    artifacts = _extract_artifacts(full_response)
    
    if artifacts:
        yield _sse_event(EVENT_STEP, f"Found {len(artifacts)} artifacts. Applying changes...")
        for actions in artifacts:
            async for event in _execute_actions_stream(actions):
                yield event
        yield _sse_event(EVENT_TOKEN, "\n\n✅ Changes applied.")

    yield _sse_event(EVENT_DONE, {"success": True, "mode": "chat"})


# ── UNIFIED GENERATE MODE (ARTIFACTS) ────────────────────────────

async def _handle_generate_unified(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Full feature generation using the Artifact Protocol.
    Replaces the old Plan -> Structure -> Implement pipeline with a "Bolt-style" one-shot approach.
    """
    yield _sse_event(EVENT_STEP, "Analyzing project & planning...")

    # Get the powerful Generate Prompt
    system_prompt = get_generate_plan_prompt()
    
    # Add Theme Context
    if request.theme_context:
        system_prompt += f"\n\n<user-design-theme>\n{request.theme_context}\n</user-design-theme>"

    project_ctx = await _get_project_context()
    
    messages = [
        SystemMessage(content=system_prompt + project_ctx),
        HumanMessage(content=f"Generate the full feature: {request.prompt}")
    ]

    full_response = ""
    yield _sse_event(EVENT_STEP, "Generating code artifacts...")

    try:
        # Stream the thought process and the XML
        chunk_count = 0
        logger.info(f"[_handle_generate_unified] Starting LLM stream for prompt: {request.prompt[:50]}...")
        yield _sse_event(EVENT_STEP, "AI is thinking...") # Initial UI feedback
        
        async for chunk in llm.astream(messages):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            if token:
                full_response += token
                chunk_count += 1
                
                if chunk_count % 10 == 0:
                    yield _sse_event(EVENT_STEP, f"Generating code... ({chunk_count} tokens)")
                    
                # We do NOT stream raw tokens to the UI anymore
                # yield _sse_event(EVENT_TOKEN, token)
                    
        logger.info(f"[_handle_generate_unified] Stream complete. Total length: {len(full_response)}")
        
        # VISUAL LOG: Show full AI response in terminal
        print("\n" + "="*60)
        print(f"🤖 AI RESPONSE ({request.model}):")
        print("-" * 60)
        print(full_response)
        print("-" * 60)
        print("="*60 + "\n")

        yield _sse_event(EVENT_STEP, "Generation complete. Analyzing artifacts...")
                
    except Exception as e:
        logger.error(f"[_handle_generate_unified] Generation failed: {e}", exc_info=True)
        yield _sse_event(EVENT_ERROR, f"Generation failed: {_format_llm_error(e)}")
        return

    # Extract and Execute Artifacts
    artifacts = _extract_artifacts(full_response)
    logger.info(f"[_extract_artifacts] Found {len(artifacts)} artifact blocks.")
    
    if not artifacts:
        logger.warning(f"[_handle_generate_unified] No valid code artifacts found. Response was: {full_response[:500]}...")
        yield _sse_event(EVENT_ERROR, "No valid code artifacts found in response.")
    else:
        yield _sse_event(EVENT_STEP, "Processing artifacts...")
        count = 0
        for actions in artifacts:
            async for event in _execute_actions_stream(actions):
                yield event
            count += len(actions)
        
        yield _sse_event(EVENT_DONE, {"success": True, "mode": "generate", "actions_count": count})


# ── UI COMPOSER (JSON MODE) ──────────────────────────────────────

async def _handle_ui_composer(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Legacy/Specialized mode for Ryze Assignment (Deterministic JSON).
    """
    yield _sse_event(EVENT_STEP, "Composing deterministic UI plan...")
    
    system_prompt = get_generate_json_prompt()
    if request.theme_context:
        system_prompt += f"\n\n<user-design-theme>{request.theme_context}</user-design-theme>"

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=request.prompt)
    ]

    full_response = ""
    try:
        async for chunk in llm.astream(messages):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            if token:
                full_response += token
                yield _sse_event(EVENT_TOKEN, token)
    except Exception as e:
        yield _sse_event(EVENT_ERROR, str(e))
        return

    # Try to parse JSON
    # Simple regex extraction for the JSON block
    import re
    json_match = re.search(r'\{[\s\S]*\}', full_response)
    if json_match:
        try:
            plan_data = json.loads(json_match.group())
            # We can emit a special event for the previewer
            yield _sse_event(EVENT_PLAN_READY, plan_data)
        except:
            pass
            
    yield _sse_event(EVENT_DONE, {"success": True, "mode": "ui_composer"})


# ── PLAN MODES (Text based) ──────────────────────────────────────

async def _handle_plan(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """Handle architectural planning (Markdown output)."""
    yield _sse_event(EVENT_STEP, "Creating architectural plan...")
    system_prompt = get_plan_prompt()
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=request.prompt)
    ]
    
    full_resp = ""
    async for chunk in llm.astream(messages):
        token = chunk.content if hasattr(chunk, "content") else str(chunk)
        if token:
            full_resp += token
            yield _sse_event(EVENT_TOKEN, token)
            
    yield _sse_event(EVENT_PLAN, full_resp)
    yield _sse_event(EVENT_DONE, {"success": True, "mode": "plan"})


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

        # Include design theme in plan generation from answers
        if request.theme_context:
            plan_prompt += f"\n\n<user-design-theme>\nThe user has selected this design theme. The plan must use these colors, style, and typography:\n{request.theme_context}\n</user-design-theme>"

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
            plan_data = None
            json_match = re.search(r'\{[\s\S]*\}', raw_plan)
            if json_match:
                try:
                    plan_data = json.loads(json_match.group())
                except:
                    pass
            
            if not plan_data:
                # Try fallback extractor
                extracted = _extract_json_object(raw_plan)
                if extracted:
                    plan_data = json.loads(extracted)

            if plan_data:
                yield _sse_event(EVENT_STEP, "Plan created successfully!")
                yield _sse_event(EVENT_PLAN_READY, plan_data)
                yield _sse_event(EVENT_DONE, {"success": True, "mode": "plan_interactive"})
            else:
                 yield _sse_event(EVENT_ERROR, "Failed to parse generated plan.")
                 yield _sse_event(EVENT_DONE, {"success": False})

        except Exception as e:
            yield _sse_event(EVENT_ERROR, f"Plan generation failed: {_format_llm_error(e)}")
            yield _sse_event(EVENT_DONE, {"success": False})
    else:
        # Phase 1: Generate clarifying questions
        yield _sse_event(EVENT_STEP, "Analyzing your request...")
        
        questions_prompt = get_plan_questions_prompt()
        q_messages = [
            SystemMessage(content=questions_prompt),
            HumanMessage(
                content=f"User request: {request.prompt}\n\nPlease analyze this request and then provide the clarifying questions JSON."
            ),
        ]

        full_analysis = ""
        try:
            # Stream the analysis/reasoning first so the user sees progress
            async for chunk in llm.astream(q_messages):
                token = chunk.content if hasattr(chunk, "content") else str(chunk)
                if token:
                    full_analysis += token
                    yield _sse_event(EVENT_TOKEN, token)

            # Extract JSON from the full response
            questions_data = None
            json_match = re.search(r'\{[\s\S]*\}', full_analysis)
            if json_match:
                try:
                    questions_data = json.loads(json_match.group())
                except:
                    pass
            
            if not questions_data:
                extracted = _extract_json_object(full_analysis)
                if extracted:
                    questions_data = json.loads(extracted)

            if questions_data:
                yield _sse_event(EVENT_QUESTIONS, questions_data)
                yield _sse_event(EVENT_DONE, {"success": True, "mode": "plan_interactive"})
            else:
                 yield _sse_event(EVENT_ERROR, "Failed to parse questions.")
                 yield _sse_event(EVENT_DONE, {"success": False})

        except Exception as e:
            yield _sse_event(EVENT_ERROR, f"Question generation failed: {_format_llm_error(e)}")
            yield _sse_event(EVENT_DONE, {"success": False})
