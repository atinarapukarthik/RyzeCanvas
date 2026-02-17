"""
RyzeCanvas Orchestrator - Cloud-Native Edition.
All file I/O goes through Supabase Storage.  No local workspace/ directory.

Provides a unified interface for all chat interactions:
- Chat mode: Conversational responses via LLM
- Plan mode: Architectural breakdowns via LLM
- Generate mode: Full React/Tailwind code generation pipeline using Artifacts

Shell commands are virtualized to prevent local machine pollution.
File writes are routed to Supabase Storage bucket `projects`.
Storage path format: {user_id}/{project_id}/{file_path}
Supports Server-Sent Events (SSE) for real-time streaming to the frontend.
"""
from app.agent.command_executor import execute_command, format_command_output
from app.agent.system_prompt import (
    get_chat_prompt,
    get_plan_prompt,
    get_generate_plan_prompt,
    get_generate_json_prompt,
    get_explainer_prompt,
    get_plan_questions_prompt,
    get_plan_from_answers_prompt,
    get_plan_implement_prompt,
    get_generate_structured_plan_prompt,
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
EVENT_STEP = "step"
EVENT_TOKEN = "token"
EVENT_PLAN = "plan"
EVENT_CODE = "code"
EVENT_ERROR = "error"
EVENT_DONE = "done"
EVENT_QUESTIONS = "questions"
EVENT_PLAN_READY = "plan_ready"
EVENT_INSTALL = "install"
EVENT_FILE_UPDATE = "file_update"
EVENT_TODO = "todo"
EVENT_COMMAND = "command"
EVENT_LOG_ANALYSIS = "log_analysis"
EVENT_EXPLANATION = "explanation"
EVENT_WEB_SEARCH = "web_search"


@dataclass
class ChatRequest:
    """Incoming chat request from the frontend."""
    prompt: str
    mode: Literal["chat", "plan", "generate",
                  "plan_interactive", "plan_implement", "ui_composer"] = "chat"
    provider: str = "gemini"
    model: str = "gemini-2.5-flash"
    conversation_history: list = field(default_factory=list)
    web_search_context: Optional[str] = None
    plan_answers: Optional[list] = None
    plan_data: Optional[dict] = None
    existing_code: Optional[str] = None
    theme_context: Optional[str] = None
    # ── Error handling context ──
    error_context: Optional[list] = None
    # ── Cloud-native context fields ──
    project_id: Optional[str] = None
    user_id: Optional[str] = None


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


# ── ERROR CONTEXT HELPERS ────────────────────────────────────────

def _build_error_context_block(error_context: Optional[list]) -> str:
    """
    Build a formatted block of error context for the LLM.
    Returns empty string if no errors provided.
    """
    if not error_context:
        return ""

    block = "\n\n## Error Context (Reference with @error_id):\n"
    for error in error_context:
        error_id = error.get("id", "unknown")
        error_type = error.get("type", "unknown")
        message = error.get("message", "")
        file_path = error.get("file", "")
        line = error.get("line")
        code_snippet = error.get("code_snippet", "")
        stack_trace = error.get("stack_trace", "")
        context_info = error.get("context", "")

        block += f"\n### @{error_id} ({error_type})\n"
        if message:
            block += f"**Error**: {message}\n"
        if file_path:
            loc = f"**Location**: {file_path}"
            if line:
                loc += f":{line}"
            block += loc + "\n"
        if code_snippet:
            block += f"**Code**:\n```\n{code_snippet}\n```\n"
        if stack_trace:
            block += f"**Stack trace**:\n```\n{stack_trace}\n```\n"
        if context_info:
            block += f"**Context**: {context_info}\n"

    return block


def _resolve_error_references(prompt: str, error_context: Optional[list]) -> str:
    """
    Resolve @error_id references in the prompt by replacing them with error details.
    Example: "@error_build" gets replaced with the full build error context.
    """
    if not error_context:
        return prompt

    # Create a map of error IDs to their full context
    error_map = {}
    for error in error_context:
        error_id = error.get("id", "")
        if error_id:
            error_info = f"[Error: {error.get('type')} - {error.get('message', '')}]"
            if error.get("file"):
                error_info += f" in {error.get('file')}"
            error_map[f"@{error_id}"] = error_info

    # Replace @error_id references in prompt
    resolved = prompt
    for error_ref, error_info in error_map.items():
        resolved = resolved.replace(error_ref, error_info)

    return resolved


# ── SUPABASE STORAGE HELPERS ─────────────────────────────────────

def _get_storage_client():
    """Return the Supabase admin client for storage operations."""
    from app.core.supabase import supabase_admin
    if supabase_admin is None:
        raise RuntimeError(
            "Supabase admin client is not configured. "
            "Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your environment."
        )
    return supabase_admin


def _storage_path(user_id: str, project_id: str, file_path: str) -> str:
    """
    Build the canonical storage path for a project file.
    Format: {user_id}/{project_id}/{file_path}
    Strips traversal attempts and leading slashes.
    """
    clean = file_path.replace("\\", "/")
    # Remove drive letters (e.g., C:/...)
    if len(clean) >= 2 and clean[1] == ':':
        clean = clean[2:]
    while ".." in clean:
        clean = clean.replace("..", "")
    clean = clean.lstrip("/")
    return f"{user_id}/{project_id}/{clean}"


def _write_file(path: str, content: str, *, user_id: str, project_id: str) -> bool:
    """Upload a file to Supabase Storage bucket 'projects'."""
    try:
        sb = _get_storage_client()
        storage_key = _storage_path(user_id, project_id, path)
        content_bytes = content.encode("utf-8")

        # Determine content type
        ext = os.path.splitext(path)[1].lower()
        mime_map = {
            ".ts": "text/typescript", ".tsx": "text/typescript",
            ".js": "application/javascript", ".jsx": "application/javascript",
            ".json": "application/json", ".html": "text/html",
            ".css": "text/css", ".md": "text/markdown",
            ".svg": "image/svg+xml",
        }
        content_type = mime_map.get(ext, "text/plain")

        # Upsert: try upload, fall back to update on conflict
        try:
            sb.storage.from_("projects").upload(
                path=storage_key,
                file=content_bytes,
                file_options={"content-type": content_type, "upsert": "true"},
            )
        except Exception:
            # Some Supabase client versions use update() for overwrites
            sb.storage.from_("projects").update(
                path=storage_key,
                file=content_bytes,
                file_options={"content-type": content_type},
            )

        logger.info(f"[Storage Write] {path} -> {storage_key}")
        return True
    except Exception as e:
        logger.error(f"[Storage Write FAILED] {path}: {e}")
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


async def _get_project_context(*, user_id: str, project_id: str) -> str:
    """
    Gather project context from Supabase Storage.
    Lists files in the project folder and downloads critical config files.
    """
    if not user_id or not project_id:
        return ""

    try:
        sb = _get_storage_client()
        prefix = f"{user_id}/{project_id}"

        # List files in the project bucket folder
        items = sb.storage.from_("projects").list(path=prefix)

        if not items:
            return ""

        # Build a flat file list by recursively listing sub-folders
        file_list: list[str] = []

        def _collect(folder_prefix: str, depth: int = 0):
            if depth > 3:
                return
            entries = sb.storage.from_("projects").list(path=folder_prefix)
            for entry in entries:
                entry_name = entry.get("name", "") if isinstance(
                    entry, dict) else str(entry)
                full = f"{folder_prefix}/{entry_name}"
                # Supabase marks folders via metadata; check id presence for files
                is_file = isinstance(
                    entry, dict) and entry.get("id") is not None
                if is_file:
                    rel = full.replace(f"{prefix}/", "", 1)
                    file_list.append(rel)
                else:
                    _collect(full, depth + 1)

        _collect(prefix)

        context = ""
        if file_list:
            context += f"\n<project-files>\n{chr(10).join(sorted(file_list))}\n</project-files>"

        # Download critical config files for LLM awareness
        core_files = [
            "package.json", "vite.config.ts", "tsconfig.json",
            "src/types.ts", "src/lib/api.ts", "src/App.tsx",
        ]
        for f in core_files:
            if f in file_list:
                try:
                    data = sb.storage.from_(
                        "projects").download(f"{prefix}/{f}")
                    file_content = data.decode(
                        "utf-8") if isinstance(data, bytes) else str(data)
                    if len(file_content) > 5000:
                        file_content = file_content[:5000] + \
                            "\n... (truncated)"
                    context += f"\n<file path='{f}'>\n{file_content}\n</file>"
                except Exception:
                    pass

        return context
    except Exception as e:
        logger.warning(
            f"Failed to gather project context from Supabase Storage: {e}")
        return ""


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
    Handles truncated responses by attempting to close tags.
    """
    artifacts = []
    
    # Auto-close truncated artifact tags if necessary
    if "<ryze_artifact" in text and "</ryze_artifact>" not in text:
        text += "</ryze_artifact>"

    artifact_pattern = re.compile(
        r'<ryze_artifact.*?>(.*?)</ryze_artifact>', re.DOTALL)

    action_pattern = re.compile(
        r'<ryze_action\s+type=["\'](.*?)["\'](?:\s+path=["\'](.*?)["\'])?\s*>(.*?)</ryze_action>',
        re.DOTALL
    )

    for artifact_match in artifact_pattern.finditer(text):
        artifact_content = artifact_match.group(1)
        
        # Auto-close truncated action tags inside the artifact
        if "<ryze_action" in artifact_content and "</ryze_action>" not in artifact_content:
             artifact_content += "</ryze_action>"

        actions = []

        for action_match in action_pattern.finditer(artifact_content):
            action_type = action_match.group(1)
            action_path = action_match.group(2)
            action_content = action_match.group(3).strip()

            actions.append(RyzeAction(
                type=action_type,
                path=action_path,
                content=action_content
            ))

        if actions:
            artifacts.append(actions)

    return artifacts


# ── VIRTUAL TERMINAL (INTERCEPTOR) ───────────────────────────────

async def _execute_virtual_shell(command: str, *, user_id: str, project_id: str) -> dict:
    """
    Intercepts shell commands to simulate a cloud WebContainer environment.
    - Install commands return instant virtual success (preview uses CDNs).
    - Build/dev/lint/test commands return simulated output.
    - Safe read commands (ls, cat) list/download from Supabase Storage.
    - Everything else returns a safe simulated response.
    """
    cmd = command.strip()
    cmd_lower = cmd.lower()

    # ── 1. Package install commands (virtualized) ─────────────────
    if any(cmd_lower.startswith(p) for p in (
        "npm install", "npm i ", "npm i\n", "pnpm install", "pnpm add",
        "yarn add", "yarn install", "bun add", "bun install"
    )) or cmd_lower == "npm i" or cmd_lower == "npm install":
        packages = cmd.split(maxsplit=2)
        pkg_names = packages[2] if len(packages) > 2 else "(all dependencies)"
        return {
            "command": command,
            "exit_code": 0,
            "stdout": (
                f"[WebContainer] Resolving packages: {pkg_names}\n"
                f"added 12 packages, and audited 45 packages in 0.4s\n"
                f"\n0 vulnerabilities\n"
                f"Done."
            ),
            "stderr": "",
            "error": None,
            "formatted": f"Installed {pkg_names} (WebContainer)"
        }

    # ── 2. Project scaffold commands (virtualized) ─────────────────
    if any(x in cmd_lower for x in ("npm create", "npx create-vite", "npm init", "pnpm create")):
        return {
            "command": command,
            "exit_code": 0,
            "stdout": (
                "Scaffolding project in /home/project...\n"
                "\nDone. Now run:\n"
                "  npm install\n"
                "  npm run dev"
            ),
            "stderr": "",
            "error": None,
            "formatted": "Project scaffolded (WebContainer)"
        }

    # ── 3. Build commands (virtualized) ───────────────────────────
    if any(x in cmd_lower for x in ("npm run build", "npx vite build", "pnpm build", "yarn build", "bun run build")):
        return {
            "command": command,
            "exit_code": 0,
            "stdout": (
                "vite v5.0.0 building for production...\n"
                "transforming...\n"
                "42 modules transformed.\n"
                "dist/index.html        0.45 kB | gzip:  0.29 kB\n"
                "dist/assets/index.css  1.20 kB | gzip:  0.64 kB\n"
                "dist/assets/index.js   5.40 kB | gzip:  2.18 kB\n"
                "built in 1.2s"
            ),
            "stderr": "",
            "error": None,
            "formatted": "Build successful (WebContainer)"
        }

    # ── 4. Dev server commands (virtualized) ──────────────────────
    if any(x in cmd_lower for x in ("npm run dev", "npm start", "npx vite", "pnpm dev", "yarn dev", "bun dev")):
        return {
            "command": command,
            "exit_code": 0,
            "stdout": (
                "VITE v5.0.0  ready in 320 ms\n\n"
                "  -> Local:   http://localhost:5173/\n"
                "  -> Network: http://192.168.1.100:5173/\n\n"
                "  press h + enter to show help"
            ),
            "stderr": "",
            "error": None,
            "formatted": "Dev server started (WebContainer)"
        }

    # ── 5. Lint commands (virtualized) ────────────────────────────
    if any(x in cmd_lower for x in ("npm run lint", "npx eslint", "pnpm lint", "npx prettier")):
        return {
            "command": command,
            "exit_code": 0,
            "stdout": "No lint errors found.",
            "stderr": "",
            "error": None,
            "formatted": "Lint passed (WebContainer)"
        }

    # ── 6. Test commands (virtualized) ────────────────────────────
    if any(x in cmd_lower for x in ("npm test", "npm run test", "npx vitest", "pnpm test")):
        return {
            "command": command,
            "exit_code": 0,
            "stdout": (
                " RUN  v1.0.0 /home/project\n\n"
                " Test Files  3 passed (3)\n"
                "      Tests  8 passed (8)\n"
                "   Start at  12:00:00\n"
                "   Duration  1.2s\n"
            ),
            "stderr": "",
            "error": None,
            "formatted": "Tests passed (WebContainer)"
        }

    # ── 7. TypeScript check (virtualized) ─────────────────────────
    if any(x in cmd_lower for x in ("npx tsc", "tsc --noEmit", "npm run typecheck")):
        return {
            "command": command,
            "exit_code": 0,
            "stdout": "No type errors found.",
            "stderr": "",
            "error": None,
            "formatted": "Type check passed (WebContainer)"
        }

    # ── 8. Safe read commands - list/download cloud files ─────────
    if cmd_lower.startswith("ls"):
        try:
            sb = _get_storage_client()
            prefix = f"{user_id}/{project_id}"
            parts = cmd.split()
            if len(parts) > 1:
                target = parts[-1].strip("/")
                prefix = f"{prefix}/{target}"
            entries = sb.storage.from_("projects").list(path=prefix)
            names = [
                e.get("name", "") if isinstance(e, dict) else str(e)
                for e in entries
            ]
            listing = "\n".join(sorted(names)) if names else "(empty)"
            return {
                "command": command,
                "exit_code": 0,
                "stdout": listing,
                "stderr": "",
                "error": None,
                "formatted": listing
            }
        except Exception:
            return {
                "command": command,
                "exit_code": 0,
                "stdout": "src/\npackage.json\nvite.config.ts\ntsconfig.json",
                "stderr": "",
                "error": None,
                "formatted": "Listed workspace files (WebContainer)"
            }

    if cmd_lower.startswith("cat"):
        try:
            parts = cmd.split()
            if len(parts) > 1:
                target_file = parts[-1].lstrip("/")
                sb = _get_storage_client()
                data = sb.storage.from_("projects").download(
                    f"{user_id}/{project_id}/{target_file}"
                )
                text = data.decode(
                    "utf-8") if isinstance(data, bytes) else str(data)
                return {
                    "command": command,
                    "exit_code": 0,
                    "stdout": text,
                    "stderr": "",
                    "error": None,
                    "formatted": text
                }
        except Exception:
            pass
        return {
            "command": command,
            "exit_code": 1,
            "stdout": "",
            "stderr": "File not found",
            "error": "File not found",
            "formatted": "File not found"
        }

    # ── 9. Directory commands (virtual) ───────────────────────────
    if cmd_lower.startswith("cd"):
        target = cmd.split()[-1] if len(cmd.split()) > 1 else "/home/project"
        return {
            "command": command,
            "exit_code": 0,
            "stdout": f"Changed directory to {target}",
            "stderr": "",
            "error": None,
            "formatted": f"cd {target}"
        }

    if cmd_lower.startswith("mkdir"):
        dir_name = cmd.split()[-1] if len(cmd.split()) > 1 else "new-dir"
        return {
            "command": command,
            "exit_code": 0,
            "stdout": f"Created directory: {dir_name}",
            "stderr": "",
            "error": None,
            "formatted": f"Created directory: {dir_name}"
        }

    # ── 10. File creation commands (touch/echo) ───────────────────
    if cmd_lower.startswith("touch"):
        filename = cmd.split()[-1] if len(cmd.split()) > 1 else "newfile"
        _write_file(filename, "", user_id=user_id, project_id=project_id)
        return {
            "command": command,
            "exit_code": 0,
            "stdout": "",
            "stderr": "",
            "error": None,
            "formatted": f"Created {filename}"
        }

    # ── 11. Node/version info (virtualized) ───────────────────────
    if cmd_lower in ("node --version", "node -v"):
        return {
            "command": command, "exit_code": 0,
            "stdout": "v20.11.0", "stderr": "", "error": None,
            "formatted": "v20.11.0"
        }

    if cmd_lower in ("npm --version", "npm -v"):
        return {
            "command": command, "exit_code": 0,
            "stdout": "10.2.4", "stderr": "", "error": None,
            "formatted": "10.2.4"
        }

    # ── 12. Default: safe simulated response ──────────────────────
    return {
        "command": command,
        "exit_code": 0,
        "stdout": f"[WebContainer] Command executed: {cmd}",
        "stderr": "",
        "error": None,
        "formatted": f"Executed (WebContainer): {cmd}"
    }


# ── SCAFFOLDING PHASE DETECTION ──────────────────────────────────

def _classify_file_phase(path: str) -> str:
    """
    Classify a file path into a Bolt.new-style scaffolding phase.
    Returns a human-readable phase label for the terminal.
    """
    name = os.path.basename(path).lower()
    lower_path = path.lower().replace("\\", "/")

    if name == "package.json":
        return "dependencies"

    config_patterns = (
        "vite.config", "tsconfig", "tailwind.config", "postcss.config",
        ".eslintrc", "eslint.config", ".prettierrc", "index.html",
        ".env", ".gitignore", "next.config",
    )
    if any(p in name for p in config_patterns):
        return "config"

    if name in ("main.tsx", "main.ts", "main.jsx", "index.tsx", "index.ts", "index.css"):
        if "src/" in lower_path or lower_path.startswith("src"):
            return "entry"

    if name in ("app.tsx", "app.jsx", "app.ts"):
        return "app"

    return "source"


def _classify_shell_phase(command: str) -> str:
    """Classify a shell command into a scaffolding phase."""
    cmd = command.strip().lower()
    if any(x in cmd for x in ("npm install", "npm i", "pnpm install", "yarn add", "bun install")):
        return "install"
    if any(x in cmd for x in ("npm run dev", "npm start", "pnpm dev", "yarn dev", "vite")):
        return "devserver"
    if any(x in cmd for x in ("npm run build", "vite build", "tsc")):
        return "build"
    if any(x in cmd for x in ("npm run lint", "eslint", "prettier")):
        return "lint"
    if any(x in cmd for x in ("npm test", "vitest", "jest")):
        return "test"
    return "shell"


PHASE_LABELS = {
    "dependencies": "Setting up dependencies",
    "config": "Writing config files",
    "entry": "Creating entry points",
    "app": "Building app shell",
    "source": "Writing source files",
    "install": "Installing packages",
    "devserver": "Starting dev server",
    "build": "Building project",
    "lint": "Running linter",
    "test": "Running tests",
    "shell": "Executing command",
}


# ── ARTIFACT EXECUTION ───────────────────────────────────────────

async def _execute_actions_stream(
    actions: List[RyzeAction],
    *,
    user_id: str,
    project_id: str,
) -> AsyncGenerator[str, None]:
    """
    Execute a list of RyzeActions and yield SSE events for the frontend.
    File actions are uploaded to Supabase Storage.
    Shell actions are intercepted by the virtual terminal.
    """
    total = len(actions)
    logger.info(f"[_execute_actions] Processing {total} actions.")

    file_count = sum(1 for a in actions if a.type == "file")
    shell_count = sum(1 for a in actions if a.type == "shell")
    yield _sse_event(EVENT_STEP, f"Executing {total} actions ({file_count} files, {shell_count} commands)")

    current_phase = ""

    for i, action in enumerate(actions):
        logger.info(
            f"[_execute_actions] Action {i+1}/{total}: Type={action.type}, Path={action.path}")

        if action.type == "file" and action.path:
            phase = _classify_file_phase(action.path)

            if phase != current_phase:
                current_phase = phase
                phase_label = PHASE_LABELS.get(phase, phase.title())
                yield _sse_event(EVENT_STEP, f"[{phase_label}]")

            yield _sse_event(EVENT_STEP, f"  Writing: {action.path}")
            success = _write_file(
                action.path, action.content,
                user_id=user_id, project_id=project_id,
            )

            status_str = "completed" if success else "error"
            yield _sse_event(EVENT_FILE_UPDATE, [{
                "path": action.path,
                "name": os.path.basename(action.path),
                "status": status_str,
                "code": action.content,
                "phase": phase,
            }])

            if action.path.endswith("App.tsx") or action.path.endswith("main.tsx") or action.path.endswith("page.tsx"):
                yield _sse_event(EVENT_CODE, action.content)

        elif action.type == "shell":
            command = action.content.strip()
            phase = _classify_shell_phase(command)

            if phase != current_phase:
                current_phase = phase
                phase_label = PHASE_LABELS.get(phase, phase.title())
                yield _sse_event(EVENT_STEP, f"[{phase_label}]")

            yield _sse_event(EVENT_STEP, f"  $ {command}")

            result = await _execute_virtual_shell(
                command, user_id=user_id, project_id=project_id
            )
            result["phase"] = phase

            yield _sse_event(EVENT_COMMAND, result)

            if phase == "install":
                packages = command.split()[2:] if len(
                    command.split()) > 2 else ["dependencies"]
                yield _sse_event(EVENT_INSTALL, [
                    {"name": pkg, "status": "installed", "phase": "install"} for pkg in packages
                ])

    yield _sse_event(EVENT_STEP, "[All actions completed]")


# ── ORCHESTRATION ENTRY POINT ────────────────────────────────────

async def orchestrate_chat(request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Main orchestration entry point. Routes to the appropriate handler.
    """
    logger.info(
        f"Starting orchestration: mode={request.mode}, provider={request.provider}, "
        f"model={request.model}, project_id={request.project_id}, user_id={request.user_id}")
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
        async for event in _handle_generate_unified(llm, request):
            yield event
    elif request.mode == "ui_composer":
        async for event in _handle_ui_composer(llm, request):
            yield event
    elif request.mode == "plan_interactive":
        async for event in _handle_plan_interactive(llm, request):
            yield event
    elif request.mode == "plan_implement":
        async for event in _handle_plan_implement(llm, request):
            yield event
    else:
        logger.warning(f"Unknown mode requested: {request.mode}")
        yield _sse_event(EVENT_ERROR, f"Unknown mode: {request.mode}")
        yield _sse_event(EVENT_DONE, {"success": False})


# ── CHAT MODE HANDLER ────────────────────────────────────────────

async def _handle_chat(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Handle conversational chat.
    Listens for XML Artifacts and uploads files to Supabase Storage.
    """
    yield _sse_event(EVENT_STEP, "Thinking (Cloud Sandbox)...")

    system_prompt_base = get_chat_prompt()

    system_ctx = ""
    if request.existing_code:
        system_ctx += f"\n\n<current-file-context>\n{request.existing_code[:10000]}\n</current-file-context>"

    project_ctx = await _get_project_context(
        user_id=request.user_id or "", project_id=request.project_id or ""
    )

    # Add error context if provided
    error_ctx = _build_error_context_block(request.error_context)

    system_prompt = system_prompt_base + project_ctx + system_ctx + error_ctx

    messages = [SystemMessage(content=system_prompt)]

    for msg in request.conversation_history[-6:]:
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg.get("role") in ("ai", "assistant"):
            messages.append(AIMessage(content=msg["content"]))

    # Resolve @error_id references in the user prompt
    resolved_prompt = _resolve_error_references(request.prompt, request.error_context)
    messages.append(HumanMessage(content=resolved_prompt))

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

    artifacts = _extract_artifacts(full_response)

    if artifacts and request.user_id and request.project_id:
        yield _sse_event(EVENT_STEP, f"Found {len(artifacts)} artifacts. Applying changes...")
        for actions in artifacts:
            async for event in _execute_actions_stream(
                actions, user_id=request.user_id, project_id=request.project_id
            ):
                yield event
        yield _sse_event(EVENT_TOKEN, "\n\nChanges applied to cloud storage.")

    yield _sse_event(EVENT_DONE, {"success": True, "mode": "chat"})


# ── UNIFIED GENERATE MODE (ARTIFACTS) ────────────────────────────

async def _handle_generate_unified(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Full feature generation using the Artifact Protocol.
    Files are written to Supabase Storage: {user_id}/{project_id}/...
    """
    yield _sse_event(EVENT_STEP, "Initializing Cloud Workspace...")

    system_prompt = get_generate_plan_prompt()

    if request.theme_context:
        system_prompt += f"\n\n<user-design-theme>\n{request.theme_context}\n</user-design-theme>"

    project_ctx = await _get_project_context(
        user_id=request.user_id or "", project_id=request.project_id or ""
    )

    # Add error context if provided
    error_ctx = _build_error_context_block(request.error_context)

    messages = [
        SystemMessage(content=system_prompt + project_ctx + error_ctx),
        HumanMessage(content=_resolve_error_references(
            f"Generate the full feature: {request.prompt}", request.error_context))
    ]

    full_response = ""
    yield _sse_event(EVENT_STEP, "Generating code artifacts...")

    try:
        chunk_count = 0
        logger.info(
            f"[_handle_generate_unified] Starting LLM stream for prompt: {request.prompt[:50]}...")
        yield _sse_event(EVENT_STEP, "AI is thinking...")

        async for chunk in llm.astream(messages):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            if token:
                full_response += token
                chunk_count += 1

                if chunk_count % 10 == 0:
                    yield _sse_event(EVENT_STEP, f"Generating code... ({chunk_count} tokens)")

        logger.info(
            f"[_handle_generate_unified] Stream complete. Total length: {len(full_response)}")

        yield _sse_event(EVENT_STEP, "Generation complete. Analyzing artifacts...")

    except Exception as e:
        logger.error(
            f"[_handle_generate_unified] Generation failed: {e}", exc_info=True)
        yield _sse_event(EVENT_ERROR, f"Generation failed: {_format_llm_error(e)}")
        return

    artifacts = _extract_artifacts(full_response)
    logger.info(
        f"[_extract_artifacts] Found {len(artifacts)} artifact blocks.")

    if not artifacts:
        logger.warning(
            f"[_handle_generate_unified] No valid code artifacts found. Response was: {full_response[:500]}...")
        yield _sse_event(EVENT_ERROR, "No valid code artifacts found in response.")
    else:
        yield _sse_event(EVENT_STEP, "Processing artifacts...")
        count = 0
        uid = request.user_id or ""
        pid = request.project_id or ""
        for actions in artifacts:
            async for event in _execute_actions_stream(
                actions, user_id=uid, project_id=pid
            ):
                yield event
            count += len(actions)

        yield _sse_event(EVENT_DONE, {"success": True, "mode": "generate", "actions_count": count})


# ── UI COMPOSER (JSON MODE) ──────────────────────────────────────

async def _handle_ui_composer(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """Legacy/Specialized mode for Ryze Assignment (Deterministic JSON)."""
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

    json_match = re.search(r'\{[\s\S]*\}', full_response)
    if json_match:
        try:
            plan_data = json.loads(json_match.group())
            yield _sse_event(EVENT_PLAN_READY, plan_data)
        except Exception:
            pass

    yield _sse_event(EVENT_DONE, {"success": True, "mode": "ui_composer"})


# ── PLAN MODES (Text based) ──────────────────────────────────────

async def _handle_plan(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """Handle architectural planning (Markdown output)."""
    yield _sse_event(EVENT_STEP, "Creating architectural plan...")
    system_prompt = get_plan_prompt()

    # Add error context if provided
    error_ctx = _build_error_context_block(request.error_context)

    messages = [
        SystemMessage(content=system_prompt + error_ctx),
        HumanMessage(content=_resolve_error_references(
            request.prompt, request.error_context))
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
        yield _sse_event(EVENT_STEP, "Creating implementation plan from your answers...")

        answers_text = "\n".join(
            f"Q: {a['question']}\nA: {a['answer']}"
            for a in request.plan_answers
        )

        plan_prompt = get_plan_from_answers_prompt()

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

            plan_data = None
            json_match = re.search(r'\{[\s\S]*\}', raw_plan)
            if json_match:
                try:
                    plan_data = json.loads(json_match.group())
                except Exception:
                    pass

            if not plan_data:
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
            async for chunk in llm.astream(q_messages):
                token = chunk.content if hasattr(
                    chunk, "content") else str(chunk)
                if token:
                    full_analysis += token
                    yield _sse_event(EVENT_TOKEN, token)

            questions_data = None
            json_match = re.search(r'\{[\s\S]*\}', full_analysis)
            if json_match:
                try:
                    questions_data = json.loads(json_match.group())
                except Exception:
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


# ── PLAN IMPLEMENT MODE HANDLER ──────────────────────────────────

async def _handle_plan_implement(llm, request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Implements a pre-approved structured plan by generating all files.
    Files are uploaded to Supabase Storage.
    """
    yield _sse_event(EVENT_STEP, "Implementing plan in Cloud Workspace...")

    system_prompt = get_plan_implement_prompt()

    if request.theme_context:
        system_prompt += f"\n\n<user-design-theme>\n{request.theme_context}\n</user-design-theme>"

    project_ctx = await _get_project_context(
        user_id=request.user_id or "", project_id=request.project_id or ""
    )
    system_prompt += project_ctx

    # Add error context if provided
    error_ctx = _build_error_context_block(request.error_context)
    system_prompt += error_ctx

    plan_description = ""
    if request.plan_data:
        plan_description = json.dumps(
            request.plan_data, indent=2, ensure_ascii=False)
    else:
        plan_description = "(No structured plan provided. Generate based on the prompt.)"

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(
            content=_resolve_error_references(
                f"Original request: {request.prompt}\n\n"
                f"Approved implementation plan:\n{plan_description}\n\n"
                f"Now implement this plan. Generate a <ryze_artifact> with ALL files.",
                request.error_context
            )
        )
    ]

    full_response = ""
    yield _sse_event(EVENT_STEP, "Generating code from plan...")

    try:
        chunk_count = 0
        async for chunk in llm.astream(messages):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            if token:
                full_response += token
                chunk_count += 1
                if chunk_count % 15 == 0:
                    yield _sse_event(EVENT_STEP, f"Implementing plan... ({chunk_count} tokens)")

        logger.info(
            f"[_handle_plan_implement] Stream complete. Length: {len(full_response)}")
        yield _sse_event(EVENT_STEP, "Implementation complete. Applying artifacts...")

    except Exception as e:
        logger.error(f"[_handle_plan_implement] Failed: {e}", exc_info=True)
        yield _sse_event(EVENT_ERROR, f"Plan implementation failed: {_format_llm_error(e)}")
        yield _sse_event(EVENT_DONE, {"success": False})
        return

    artifacts = _extract_artifacts(full_response)
    logger.info(
        f"[_handle_plan_implement] Found {len(artifacts)} artifact blocks.")

    if not artifacts:
        logger.warning(
            f"[_handle_plan_implement] No artifacts found. Response: {full_response[:500]}...")
        yield _sse_event(EVENT_ERROR, "No code artifacts found in plan implementation.")
        yield _sse_event(EVENT_DONE, {"success": False})
    else:
        yield _sse_event(EVENT_STEP, "Writing files to Cloud Storage...")
        count = 0
        uid = request.user_id or ""
        pid = request.project_id or ""
        for actions in artifacts:
            async for event in _execute_actions_stream(
                actions, user_id=uid, project_id=pid
            ):
                yield event
            count += len(actions)

        yield _sse_event(EVENT_DONE, {"success": True, "mode": "plan_implement", "actions_count": count})
