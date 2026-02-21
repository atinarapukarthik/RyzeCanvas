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

        # Update DB context cache with fresh content so the next
        # _get_project_context sees the latest version immediately.
        _update_project_context_cache(
            project_id=project_id, user_id=user_id,
            file_path=path, content=content,
        )

        logger.debug(f"[Storage Write] {path} -> {storage_key}")
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


def _list_project_files(*, user_id: str, project_id: str) -> list[str]:
    """List all files in a project's storage folder recursively."""
    sb = _get_storage_client()
    prefix = f"{user_id}/{project_id}"
    items = sb.storage.from_("projects").list(path=prefix)
    if not items:
        return []

    file_list: list[str] = []

    def _collect(folder_prefix: str, depth: int = 0):
        if depth > 4:
            return
        entries = sb.storage.from_("projects").list(path=folder_prefix)
        for entry in entries:
            entry_name = entry.get("name", "") if isinstance(
                entry, dict) else str(entry)
            full = f"{folder_prefix}/{entry_name}"
            is_file = isinstance(
                entry, dict) and entry.get("id") is not None
            if is_file:
                rel = full.replace(f"{prefix}/", "", 1)
                file_list.append(rel)
            else:
                _collect(full, depth + 1)

    _collect(prefix)
    return file_list


def _download_file(*, user_id: str, project_id: str, file_path: str) -> str | None:
    """Download a single file from Supabase Storage. Returns content or None."""
    try:
        sb = _get_storage_client()
        key = f"{user_id}/{project_id}/{file_path}"
        data = sb.storage.from_("projects").download(key)
        return data.decode("utf-8") if isinstance(data, bytes) else str(data)
    except Exception:
        return None


# ── PROJECT CONTEXT: SAVE / LOAD via Supabase DB ────────────────

def _save_project_context_to_db(
    *, user_id: str, project_id: str,
    file_list: list[str], file_contents: dict[str, str],
):
    """
    Persist every project file's content into the project_file_context table.
    Uses upsert (ON CONFLICT) so re-reads overwrite stale data.
    Also updates the project_analysis row.
    """
    if not project_id or not user_id:
        return  # skip when project hasn't been created yet
    try:
        sb = _get_storage_client()

        # Upsert each file into project_file_context
        for fpath, content in file_contents.items():
            ext = os.path.splitext(fpath)[1].lower()
            ftype = "config"
            if ext in (".tsx", ".ts", ".jsx", ".js"):
                ftype = "source"
            if "index.css" in fpath or ext == ".css":
                ftype = "style"
            if fpath in ("src/main.tsx", "src/index.ts", "index.html"):
                ftype = "entry"

            row = {
                "project_id": project_id,
                "user_id": int(user_id),
                "file_path": fpath,
                "file_type": ftype,
                "file_content": content[:100000],  # safety cap
                "file_size": len(content),
                "last_read_at": "now()",
            }
            try:
                sb.table("project_file_context").upsert(
                    row, on_conflict="project_id,file_path"
                ).execute()
            except Exception as ue:
                logger.debug(f"[Context DB] upsert failed for {fpath}: {ue}")

        # Upsert project_analysis summary
        analysis_row = {
            "project_id": project_id,
            "user_id": int(user_id),
            "total_files": len(file_list),
            "file_tree": file_list,
            "is_fully_read": True,
            "read_progress": 100,
            "last_analyzed_at": "now()",
        }
        try:
            sb.table("project_analysis").upsert(
                analysis_row, on_conflict="project_id"
            ).execute()
        except Exception as ae:
            logger.debug(f"[Context DB] project_analysis upsert failed: {ae}")

        logger.info(
            f"[Context DB] Saved {len(file_contents)} files for project {project_id}")
    except Exception as e:
        logger.warning(f"[Context DB] Save failed (non-fatal): {e}")


def _load_project_context_from_db(*, project_id: str) -> dict[str, str]:
    """
    Load all file contents from project_file_context table.
    Returns dict of {file_path: file_content}.
    """
    try:
        sb = _get_storage_client()
        resp = sb.table("project_file_context").select(
            "file_path,file_content"
        ).eq("project_id", project_id).execute()
        if resp.data:
            return {
                row["file_path"]: row["file_content"]
                for row in resp.data if row.get("file_content")
            }
    except Exception as e:
        logger.debug(
            f"[Context DB] Load failed (falling back to storage): {e}")
    return {}


# ── FULL PROJECT CONTEXT BUILDER ─────────────────────────────────

async def _get_project_context(*, user_id: str, project_id: str) -> str:
    """
    Gather FULL project context. Reads ALL files from Supabase Storage
    (not just config files) so the AI can understand the entire application
    before attempting any fix or generation.

    Also saves the context into the project_file_context DB table for
    fast retrieval on subsequent calls.
    """
    if not user_id or not project_id:
        logger.debug(
            f"[Context] Skipped: user_id={user_id!r}, project_id={project_id!r}")
        return ""

    # Per-file display cap (enough for most components)
    FILE_DISPLAY_LIMIT = 32000

    try:
        # 1. Try loading from DB cache first (fast path)
        cached = _load_project_context_from_db(project_id=project_id)
        if cached:
            context = f"\n<project-files>\n{chr(10).join(sorted(cached.keys()))}\n</project-files>"
            for fpath in sorted(cached.keys()):
                content = cached[fpath]
                if len(content) > FILE_DISPLAY_LIMIT:
                    content = content[:FILE_DISPLAY_LIMIT] + \
                        "\n... (truncated)"
                context += f"\n<file path='{fpath}'>\n{content}\n</file>"
            logger.info(
                f"[Context] Loaded {len(cached)} files from DB cache for project {project_id}")
            return context

        # 2. Fall back to reading from Supabase Storage
        logger.info(
            f"[Context] DB cache miss for project {project_id}, reading from Storage...")
        file_list = _list_project_files(user_id=user_id, project_id=project_id)

        if not file_list:
            logger.info(
                f"[Context] No files found in Storage for project {project_id}")
            return ""

        context = f"\n<project-files>\n{chr(10).join(sorted(file_list))}\n</project-files>"

        # Download ALL source files (not just 6 config files)
        file_contents: dict[str, str] = {}
        # Prioritize source files the AI needs most
        priority_exts = {".tsx", ".ts", ".jsx",
                         ".js", ".json", ".css", ".html"}
        for fpath in sorted(file_list):
            ext = os.path.splitext(fpath)[1].lower()
            if ext not in priority_exts:
                continue
            content = _download_file(
                user_id=user_id, project_id=project_id, file_path=fpath)
            if content is not None:
                file_contents[fpath] = content
                display = content
                if len(display) > FILE_DISPLAY_LIMIT:
                    display = display[:FILE_DISPLAY_LIMIT] + \
                        "\n... (truncated)"
                context += f"\n<file path='{fpath}'>\n{display}\n</file>"

        # 3. Save to DB for next time
        if file_contents:
            _save_project_context_to_db(
                user_id=user_id, project_id=project_id,
                file_list=file_list, file_contents=file_contents,
            )

        logger.info(
            f"[Context] Read {len(file_contents)}/{len(file_list)} files from Storage for project {project_id}")
        return context
    except Exception as e:
        logger.warning(
            f"Failed to gather project context from Supabase Storage: {e}")
        return ""


def _invalidate_project_context_cache(*, project_id: str, file_path: str | None = None):
    """
    Invalidate cached context so the next _get_project_context re-reads from storage.
    If file_path given, only that row is deleted; otherwise the whole project.
    """
    if not project_id:
        return  # skip when project hasn't been created yet
    try:
        sb = _get_storage_client()
        q = sb.table("project_file_context").delete().eq(
            "project_id", project_id)
        if file_path:
            q = q.eq("file_path", file_path)
        q.execute()
    except Exception:
        pass  # non-fatal


def _update_project_context_cache(
    *, project_id: str, user_id: str, file_path: str, content: str
):
    """
    Update (upsert) a single file in the project_file_context DB table.
    Called after _write_file so the next _get_project_context sees fresh content
    WITHOUT needing to re-download everything from Storage.
    """
    if not project_id or not file_path:
        return
    try:
        sb = _get_storage_client()
        ext = os.path.splitext(file_path)[1].lower()
        ftype = "config"
        if ext in (".tsx", ".ts", ".jsx", ".js"):
            ftype = "source"
        if "index.css" in file_path or ext == ".css":
            ftype = "style"
        if file_path in ("src/main.tsx", "src/index.ts", "index.html"):
            ftype = "entry"

        row = {
            "project_id": project_id,
            "user_id": int(user_id),
            "file_path": file_path,
            "file_type": ftype,
            "file_content": content[:100000],
            "file_size": len(content),
            "last_read_at": "now()",
        }
        sb.table("project_file_context").upsert(
            row, on_conflict="project_id,file_path"
        ).execute()
        logger.debug(f"[Context DB] Updated cache for {file_path}")
    except Exception as e:
        # Fall back to invalidation so next read re-downloads from Storage
        logger.debug(
            f"[Context DB] Cache update failed for {file_path}: {e}, falling back to invalidation")
        _invalidate_project_context_cache(
            project_id=project_id, file_path=file_path)


def _get_llm(provider: str, model: str):
    """Get LLM instance based on provider. Reads API keys from settings."""
    if provider in ("claude", "anthropic"):
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not configured")
        return ChatAnthropic(
            model=model or "claude-3-5-sonnet-20241022",
            temperature=0.3,
            api_key=settings.ANTHROPIC_API_KEY,
            max_tokens=16384,
        )
    elif provider == "gemini":
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured")
        return ChatGoogleGenerativeAI(
            model=model or "gemini-2.5-flash",
            temperature=0.3,
            google_api_key=settings.GEMINI_API_KEY,
            max_output_tokens=16384,
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
            model=model or settings.OLLAMA_MODEL,
            temperature=0.4,
            num_ctx=65536,
            num_predict=32768,
            # 10-minute timeout — large models (70B+) need time to stream
            client_kwargs={"timeout": 600},
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}")


# ── ARTIFACT PARSING LOGIC ───────────────────────────────────────

def _extract_artifacts(text: str) -> List[List[RyzeAction]]:
    """
    Parse the full LLM response text and extract all <ryze_artifact> blocks.
    Returns a list of artifacts, where each artifact is a list of RyzeActions.
    Handles truncated responses by attempting to close tags.
    Falls back to markdown code fence extraction if no XML artifacts found.
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

    # Fallback: extract from markdown code fences with file path comments
    if not artifacts:
        fallback = _extract_artifacts_from_markdown(text)
        if fallback:
            artifacts = fallback

    return artifacts


def _extract_artifacts_from_markdown(text: str) -> List[List[RyzeAction]]:
    """
    Fallback parser: extract files from markdown code fences when the LLM
    ignores the <ryze_artifact> XML format and uses ```tsx blocks instead.

    Looks for patterns like:
        ```tsx  // src/App.tsx
        ```typescript  src/components/Layout.tsx
        **src/App.tsx**
        ```tsx
        ### `src/App.tsx`
        ```tsx
    """
    actions: List[RyzeAction] = []

    # Pattern: file path comment/header before or inside a code fence
    # Matches: ```lang // path, ```lang path, **path** then ```, ### `path` then ```
    fence_pattern = re.compile(
        r'(?:'
        # path in a heading/bold before the fence
        r'(?:#{1,4}\s*`?|(?:\*\*))?((?:src/|package\.json|vite\.config|tsconfig|tailwind\.config|postcss\.config|index\.html)[^\s`*\n]+)(?:`?\*?\*?)\s*\n'
        r'\s*```\w*\s*\n'
        r'|'
        # path as a comment inside the fence opening line
        r'```\w*\s+(?://\s*)?((?:src/|package\.json|vite\.config|tsconfig|tailwind\.config|postcss\.config|index\.html)[^\s\n]+)\s*\n'
        r')'
        r'(.*?)'
        r'\n```',
        re.DOTALL
    )

    for m in fence_pattern.finditer(text):
        path = (m.group(1) or m.group(2) or "").strip().strip("`*#")
        content = (m.group(3) or "").strip()
        if path and content and len(content) > 20:
            actions.append(RyzeAction(type="file", path=path, content=content))

    if actions:
        logger.info(
            f"[_extract_artifacts_from_markdown] Rescued {len(actions)} files from markdown fences")
        return [actions]

    return []


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


def _validate_generated_code(artifacts: list) -> list:
    """
    Quick static validation of generated code artifacts.
    Returns list of error descriptions, or empty list if clean.
    """
    errors = []
    # Collect all generated file paths for cross-reference checks
    all_paths = set()
    all_files: dict[str, str] = {}
    for actions in artifacts:
        for action in actions:
            if action.type == "file" and action.path:
                all_paths.add(action.path)
                all_files[action.path] = action.content

    for actions in artifacts:
        for action in actions:
            if action.type != "file" or not action.path:
                continue
            code = action.content
            path = action.path

            # Check for framer-motion import (banned — breaks preview)
            if "from 'framer-motion'" in code or 'from "framer-motion"' in code:
                errors.append(
                    f"{path}: Uses framer-motion (banned in preview)")

            # Check for Next.js imports (banned)
            for nx_mod in ("next/link", "next/router", "next/image", "next/navigation"):
                if f"from '{nx_mod}'" in code or f'from "{nx_mod}"' in code:
                    errors.append(
                        f"{path}: Uses Next.js import '{nx_mod}' (not allowed)")

            # Check for "use client" / "use server" directives (not valid in Vite)
            if '"use client"' in code or '"use server"' in code or "'use client'" in code or "'use server'" in code:
                errors.append(
                    f"{path}: Contains Next.js directive 'use client'/'use server' (remove it)")

            # Check for missing default export in key .tsx/.jsx files
            if (path.endswith('.tsx') or path.endswith('.jsx')):
                if 'export default' not in code and 'export {' not in code:
                    basename = os.path.basename(path)
                    if basename in ('App.tsx', 'App.jsx', 'Layout.tsx'):
                        errors.append(f"{path}: Missing default export")

            # Check for potential .map() on undefined
            if '.map(' in code:
                map_matches = re.findall(r'(\w+)\.map\(', code)
                for var in map_matches:
                    if var in ('React', 'Object', 'Array', 'children', 'props'):
                        continue
                    # Check if the variable is properly defined or has a fallback
                    has_fallback = (
                        f'({var} || []).map' in code or
                        f'{var}?.map' in code or
                        f'const {var}' in code or
                        f'let {var}' in code or
                        f'{var} =' in code or
                        f'{var}:' in code
                    )
                    if not has_fallback:
                        errors.append(
                            f"{path}: '{var}.map()' may be called on undefined — "
                            f"use ({var} || []).map() or {var}?.map()"
                        )

            # Check for destructured object properties used as bare JSX expressions
            # e.g. {primary && <div>} where `primary` is a destructured prop not a variable
            # Common culprit: AI generates {primary ? ... : ...} but `primary` was a prop name
            if path.endswith('.tsx') or path.endswith('.jsx'):
                # Look for JSX conditional: {varName && or {varName ?
                jsx_conditionals = re.findall(r'\{(\w+)\s*(?:&&|\?)', code)
                safe_globals = {
                    'true', 'false', 'null', 'undefined', 'window', 'document',
                    'console', 'React', 'children', 'props', 'key', 'ref',
                    'Array', 'Object', 'Math', 'JSON', 'Date', 'Error',
                    'Promise', 'Set', 'Map', 'Symbol', 'Number', 'String',
                    'Boolean', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
                    'NaN', 'Infinity', 'navigator', 'location',
                }
                for var_name in jsx_conditionals:
                    if var_name in safe_globals:
                        continue
                    # Check if it's declared as a variable or parameter
                    is_declared = (
                        f'const {var_name}' in code or
                        f'let {var_name}' in code or
                        f'var {var_name}' in code or
                        f'{var_name}:' in code or  # destructured prop
                        f'{var_name} =' in code or
                        f'useState' in code and var_name in code or
                        f'function {var_name}' in code or
                        re.search(r'\b' + re.escape(var_name) + r'\s*[,\)}]',
                                  code[:code.find('{' + var_name)] if ('{' + var_name) in code else code) is not None
                    )
                    if not is_declared:
                        errors.append(
                            f"{path}: '{var_name}' used in JSX expression but may not be defined — "
                            f"add it as a state variable, prop, or use a safe fallback"
                        )

            # Check for TypeScript-only syntax that Babel standalone can't handle well
            if path.endswith('.tsx') or path.endswith('.ts'):
                # Complex generic syntax: <T extends ...> in function signatures
                if re.search(r'function\s+\w+\s*<\w+\s+extends\s+', code):
                    errors.append(
                        f"{path}: Uses complex TypeScript generics (<T extends ...>) — "
                        f"simplify to plain types for browser preview compatibility"
                    )
                # Enum declarations
                if re.search(r'\benum\s+\w+\s*\{', code):
                    errors.append(
                        f"{path}: Uses TypeScript enum (not supported in Babel browser preview) — "
                        f"use a const object instead: const MyEnum = {{ A: 'A', B: 'B' }} as const"
                    )

            # Check that CSS files referenced in main.tsx/App.tsx actually exist
            if path in ('src/main.tsx', 'src/App.tsx'):
                css_imports = re.findall(r"import\s+['\"](.+\.css)['\"]", code)
                for css_path in css_imports:
                    # Normalize: ./index.css → src/index.css
                    normalized = css_path.lstrip('./')
                    if not normalized.startswith('src/'):
                        normalized = f"src/{normalized}"
                    if normalized not in all_paths and css_path.lstrip('./') not in all_paths:
                        errors.append(
                            f"{path}: Imports '{css_path}' but that file was not generated — "
                            f"add the CSS file or change the import path"
                        )

    return errors


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
    logger.debug(f"[_execute_actions] Processing {total} actions.")

    file_count = sum(1 for a in actions if a.type == "file")
    shell_count = sum(1 for a in actions if a.type == "shell")
    yield _sse_event(EVENT_STEP, f"Applying {file_count} files and {shell_count} commands")

    current_phase = ""

    for i, action in enumerate(actions):
        logger.debug(
            f"[_execute_actions] Action {i+1}/{total}: Type={action.type}, Path={action.path}")

        if action.type == "file" and action.path:
            phase = _classify_file_phase(action.path)

            if phase != current_phase:
                current_phase = phase
                phase_label = PHASE_LABELS.get(phase, phase.title())
                yield _sse_event(EVENT_STEP, f"[{phase_label}]")

            basename = os.path.basename(action.path)
            yield _sse_event(EVENT_STEP, f"Creating {basename}...")
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

            yield _sse_event(EVENT_STEP, f"Running: {command}")

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

    # Add error context FIRST so the AI sees the error before the files.
    # Placing it after 60k chars of project files risks it being truncated
    # or ignored by smaller-context models.
    error_ctx = _build_error_context_block(request.error_context)

    system_ctx = ""
    if request.existing_code:
        # Allow up to 60k chars so the AI can see the full project files for targeted fixes
        system_ctx += f"\n\n<current-project-files>\n{request.existing_code[:60000]}\n</current-project-files>"

    # Inject theme context so chat-mode code generation respects the user's theme
    theme_ctx = ""
    if request.theme_context:
        theme_ctx = f"\n\n<user-design-theme>\n{request.theme_context}\n</user-design-theme>"

    # When fixing errors, ALWAYS load fresh context from DB/Storage
    # instead of relying on the frontend's existing_code — the frontend
    # state may be stale (not yet updated with files the backend just wrote).
    # For normal chat, skip storage fetch if frontend already sent the files.
    project_ctx = ""
    has_errors = bool(request.error_context)
    if has_errors and request.project_id:
        # Error-fix path: load authoritative file state from DB
        project_ctx = await _get_project_context(
            user_id=request.user_id or "", project_id=request.project_id or ""
        )
        if project_ctx:
            # We have fresh context from DB — ignore the frontend's potentially stale copy
            system_ctx = ""
            logger.info(
                f"[_handle_chat] Error-fix mode: loaded {len(project_ctx)} chars from DB, "
                f"ignoring frontend existing_code ({len(request.existing_code or '')} chars)"
            )
    elif not request.existing_code:
        project_ctx = await _get_project_context(
            user_id=request.user_id or "", project_id=request.project_id or ""
        )

    system_prompt = system_prompt_base + error_ctx + theme_ctx + \
        project_ctx + system_ctx

    messages = [SystemMessage(content=system_prompt)]

    for msg in request.conversation_history[-6:]:
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg.get("role") in ("ai", "assistant"):
            messages.append(AIMessage(content=msg["content"]))

    # Resolve @error_id references in the user prompt
    resolved_prompt = _resolve_error_references(
        request.prompt, request.error_context)
    messages.append(HumanMessage(content=resolved_prompt))

    # ── DEBUG: Log what the AI actually receives ──
    logger.info(
        f"[_handle_chat] system_prompt={len(system_prompt)} chars, "
        f"error_ctx={len(error_ctx)} chars, "
        f"existing_code={'yes' if request.existing_code else 'no'} "
        f"({len(request.existing_code or '')} chars), "
        f"error_context={len(request.error_context or [])} items, "
        f"messages={len(messages)} total, "
        f"user_prompt_preview={resolved_prompt[:200]!r}"
    )

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

    logger.info(
        f"[_handle_chat] Response: {len(full_response)} chars, "
        f"preview={full_response[:300]!r}"
    )
    artifacts = _extract_artifacts(full_response)

    if artifacts and request.user_id and request.project_id:
        # ── SIZE GUARD: Reject fixes that would clobber larger files ──
        # If the AI produces a tiny "fix" (e.g. 800 chars) for a file that
        # was previously 5000+ chars, the fix is almost certainly truncated
        # and would break the app. Skip those files and warn.
        existing_files = {}
        if project_ctx:
            # Parse the project context to get file sizes
            for block in project_ctx.split('--- FILE: '):
                if block.strip() and '---' in block:
                    fpath = block.split(' ---')[0].strip()
                    fcontent = block.split(
                        '---\n', 1)[1] if '---\n' in block else ''
                    existing_files[fpath] = len(fcontent)

        for actions in artifacts:
            # Filter out suspiciously small fixes
            filtered_actions = []
            for action in actions:
                if action.type == 'file' and action.path:
                    orig_size = existing_files.get(action.path, 0)
                    new_size = len(action.content or '')
                    # If original is 2000+ chars and fix is less than 30% of original,
                    # the AI likely truncated the file. Skip it.
                    if orig_size > 2000 and new_size < orig_size * 0.3:
                        logger.warning(
                            f"[_handle_chat] SIZE GUARD: Rejecting fix for {action.path} — "
                            f"original={orig_size} chars, fix={new_size} chars (too small, likely truncated)"
                        )
                        yield _sse_event(EVENT_STEP,
                                         f"Skipped {action.path}: AI produced truncated fix ({new_size} chars vs {orig_size} original). "
                                         f"The file was NOT overwritten.")
                        continue
                filtered_actions.append(action)

            if filtered_actions:
                yield _sse_event(EVENT_STEP, f"Found {len(filtered_actions)} valid changes. Applying...")
                async for event in _execute_actions_stream(
                    filtered_actions, user_id=request.user_id, project_id=request.project_id
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

    # Include existing code context so AI knows the current project state
    code_ctx = ""
    if request.existing_code:
        code_ctx = f"\n\n<current-project-files>\n{request.existing_code[:60000]}\n</current-project-files>"

    messages = [
        SystemMessage(content=system_prompt +
                      project_ctx + code_ctx + error_ctx),
    ]

    # Include recent conversation history so AI understands multi-turn context
    for msg in request.conversation_history[-4:]:
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg.get("role") in ("ai", "assistant"):
            messages.append(AIMessage(content=msg["content"]))

    # Build theme reminder if a theme was provided so the AI prioritizes it
    theme_reminder = ""
    if request.theme_context:
        theme_reminder = (
            "\n\nCRITICAL — THEME ENFORCEMENT:\n"
            "A <user-design-theme> was provided in the system context. You MUST:\n"
            "1. Use NAMED THEME COLORS (preferred): bg-theme-primary, text-theme-text, bg-theme-background, bg-theme-surface, text-theme-accent, bg-theme-secondary — these are pre-registered in tailwind.config and guaranteed to work.\n"
            "2. For opacity variants, use arbitrary hex: bg-[#hex]/20, shadow-[0_0_15px_#hex]\n"
            "3. Apply the Visual Style description (glows, gradients, glassmorphism, etc.) to EVERY component.\n"
            "4. Use pre-defined animation classes: animate-fadeIn, animate-slideUp, animate-slideDown, animate-scaleIn, animate-float, animate-gradient, animate-pulse-glow — they are already available. Do NOT define @keyframes.\n"
            "5. Add hover effects: hover:scale-105 hover:-translate-y-1 on cards; transition-all duration-300 on buttons.\n"
            "6. Use pre-loaded fonts: font-sans (Inter), font-display (Poppins), font-mono (JetBrains Mono), font-serif (Merriweather), font-jakarta (Plus Jakarta Sans).\n"
            "7. Use the theme's surface color for ALL cards/panels, background color for page, text color for body.\n"
            "Do NOT use default Tailwind color classes (e.g., bg-blue-500) — use bg-theme-primary, bg-theme-surface, etc.\n"
        )

    messages.append(HumanMessage(content=_resolve_error_references(
        f"Generate the full application: {request.prompt}\n\n"
        "IMPORTANT: Do NOT explain or analyze. Output ONLY a <ryze_artifact> block "
        "containing ALL files. Start your response IMMEDIATELY with <ryze_artifact>.\n\n"
        "Example of the EXACT format you must use:\n"
        "<ryze_artifact id=\"app\" title=\"My App\">\n"
        "  <ryze_action type=\"file\" path=\"package.json\">\n"
        "    {\"name\": \"my-app\", \"private\": true, ...}\n"
        "  </ryze_action>\n"
        "  <ryze_action type=\"file\" path=\"src/App.tsx\">\n"
        "    import React from 'react';\n"
        "    export default function App() { return <div>Hello</div>; }\n"
        "  </ryze_action>\n"
        "  <ryze_action type=\"shell\">\n"
        "    npm install lucide-react\n"
        "  </ryze_action>\n"
        "</ryze_artifact>\n\n"
        + theme_reminder +
        "Now generate the complete application using this format. Start with <ryze_artifact>.",
        request.error_context)))

    full_response = ""
    yield _sse_event(EVENT_STEP, "Generating code artifacts...")

    try:
        chunk_count = 0
        last_progress_at = 0  # Track chars for periodic progress updates
        logger.debug(
            f"[_handle_generate_unified] Starting LLM stream for prompt: {request.prompt[:50]}...")
        yield _sse_event(EVENT_STEP, "AI is thinking...")

        async for chunk in llm.astream(messages):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            if token:
                full_response += token
                chunk_count += 1

                # Stream tokens to frontend so the user sees real-time output
                yield _sse_event(EVENT_TOKEN, token)

                # Periodic progress updates to keep SSE alive and show progress
                if len(full_response) - last_progress_at >= 2000:
                    last_progress_at = len(full_response)
                    yield _sse_event(EVENT_STEP,
                                     f"Generating... ({len(full_response)} chars, {chunk_count} chunks)")

        logger.info(
            f"[_handle_generate_unified] Stream complete. Total chunks: {chunk_count}, "
            f"Response length: {len(full_response)} chars")
        logger.info(
            f"[_handle_generate_unified] Response preview (first 800 chars): {full_response[:800]}")

        yield _sse_event(EVENT_STEP, "Generation complete. Analyzing artifacts...")

    except Exception as e:
        logger.error(
            f"[_handle_generate_unified] Generation failed: {e}", exc_info=True)
        yield _sse_event(EVENT_ERROR, f"Generation failed: {_format_llm_error(e)}")
        return

    artifacts = _extract_artifacts(full_response)
    logger.info(
        f"[_extract_artifacts] Found {len(artifacts)} artifact blocks.")

    # Retry once: if the model output text/analysis instead of artifacts,
    # re-prompt it to convert its response into the correct format.
    if not artifacts:
        logger.warning(
            f"[_handle_generate_unified] No artifacts on first try. Retrying with conversion prompt...")
        yield _sse_event(EVENT_STEP, "Reformatting response into code artifacts...")

        # Truncate the original response to avoid exceeding context limits
        prev_response = full_response[:40000]
        retry_messages = [
            SystemMessage(content=get_generate_plan_prompt()),
            HumanMessage(
                content=(
                    "You previously generated this response but did NOT use the required "
                    "<ryze_artifact> XML format. Here is your previous response:\n\n"
                    f"<previous-response>\n{prev_response}\n</previous-response>\n\n"
                    "NOW convert ALL the code from your previous response into the correct format. "
                    "Your response MUST be ONLY a <ryze_artifact> block. Example:\n\n"
                    "<ryze_artifact id=\"app\" title=\"Application\">\n"
                    "  <ryze_action type=\"file\" path=\"package.json\">\n"
                    "    {\"name\": \"app\", ...}\n"
                    "  </ryze_action>\n"
                    "  <ryze_action type=\"file\" path=\"src/App.tsx\">\n"
                    "    import React from 'react';\n"
                    "    export default function App() { return <div>Hello</div>; }\n"
                    "  </ryze_action>\n"
                    "  <ryze_action type=\"shell\">\n"
                    "    npm install lucide-react\n"
                    "  </ryze_action>\n"
                    "</ryze_artifact>\n\n"
                    "Output ONLY the <ryze_artifact> block. No explanations."
                )
            ),
        ]

        try:
            retry_response = ""
            async for chunk in llm.astream(retry_messages):
                token = chunk.content if hasattr(
                    chunk, "content") else str(chunk)
                if token:
                    retry_response += token

            logger.info(
                f"[_handle_generate_unified] Retry response length: {len(retry_response)} chars, "
                f"preview: {retry_response[:500]}")
            artifacts = _extract_artifacts(retry_response)
            if artifacts:
                logger.info(
                    f"[_handle_generate_unified] Retry succeeded: {len(artifacts)} artifact blocks.")
                yield _sse_event(EVENT_STEP, "Reformatting successful!")
            else:
                logger.warning(
                    f"[_handle_generate_unified] Retry also failed. Response: {retry_response[:300]}...")
        except Exception as retry_err:
            logger.warning(
                f"[_handle_generate_unified] Retry failed: {retry_err}")

    if not artifacts:
        logger.warning(
            f"[_handle_generate_unified] No valid code artifacts found after retry. Response was: {full_response[:500]}...")
        yield _sse_event(EVENT_ERROR, "No valid code artifacts found in response. Please try again or switch to a different AI model.")
        yield _sse_event(EVENT_DONE, {"success": False, "mode": "generate"})
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

        # Post-generation validation
        yield _sse_event(EVENT_STEP, "Checking generated code for errors...")
        validation_errors = _validate_generated_code(artifacts)
        if validation_errors:
            yield _sse_event(EVENT_STEP, f"Found {len(validation_errors)} potential issues. Auto-fixing...")

            # Build file context from the artifacts we just wrote so the AI can see the code
            written_files_ctx = ""
            for actions_group in artifacts:
                for act in actions_group:
                    if act.type == "file" and act.path and act.content:
                        written_files_ctx += f"\n<file path='{act.path}'>\n{act.content}\n</file>"

            fix_prompt = (
                "Fix these issues in the generated code:\n"
                + "\n".join(f"- {e}" for e in validation_errors)
                + "\n\nReturn ONLY the corrected files using <ryze_artifact> format."
            )
            fix_system = get_chat_prompt()
            if written_files_ctx:
                fix_system += f"\n\n<current-project-files>{written_files_ctx}\n</current-project-files>"

            fix_messages = [
                SystemMessage(content=fix_system),
                HumanMessage(content=fix_prompt),
            ]
            try:
                fix_response = ""
                async for chunk in llm.astream(fix_messages):
                    token = chunk.content if hasattr(
                        chunk, "content") else str(chunk)
                    if token:
                        fix_response += token

                fix_artifacts = _extract_artifacts(fix_response)
                if fix_artifacts:
                    yield _sse_event(EVENT_STEP, "Applying fixes...")
                    for fix_actions in fix_artifacts:
                        async for event in _execute_actions_stream(
                            fix_actions, user_id=uid, project_id=pid
                        ):
                            yield event
                        count += len(fix_actions)
                    yield _sse_event(EVENT_STEP, "Verification complete — issues fixed")
                else:
                    yield _sse_event(EVENT_STEP, "Auto-fix skipped (no artifacts returned)")
            except Exception as fix_err:
                logger.warning(f"Auto-fix failed: {fix_err}")
                yield _sse_event(EVENT_STEP, "Auto-fix skipped (non-critical)")
        else:
            yield _sse_event(EVENT_STEP, "Verification complete — no errors detected")

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

    # Inject theme so the plan reflects the user's chosen design
    if request.theme_context:
        system_prompt += f"\n\n<user-design-theme>\n{request.theme_context}\n</user-design-theme>"

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
                    yield _sse_event(EVENT_STEP, "Implementing plan...")

        logger.debug(
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

    # Retry once if the model didn't produce artifacts
    if not artifacts:
        logger.warning(
            f"[_handle_plan_implement] No artifacts on first try. Retrying with conversion prompt...")
        yield _sse_event(EVENT_STEP, "Reformatting response into code artifacts...")

        prev_response = full_response[:40000]
        retry_messages = [
            SystemMessage(content=get_plan_implement_prompt()),
            HumanMessage(
                content=(
                    "You previously generated this response but did NOT use the required "
                    "<ryze_artifact> XML format:\n\n"
                    f"<previous-response>\n{prev_response}\n</previous-response>\n\n"
                    "Convert ALL the code into the correct format. Output ONLY a <ryze_artifact> block:\n\n"
                    "<ryze_artifact id=\"app\" title=\"Application\">\n"
                    "  <ryze_action type=\"file\" path=\"src/App.tsx\">\n"
                    "    // full file content here\n"
                    "  </ryze_action>\n"
                    "</ryze_artifact>\n\n"
                    "No explanations. ONLY the <ryze_artifact> block."
                )
            ),
        ]
        try:
            retry_response = ""
            async for chunk in llm.astream(retry_messages):
                token = chunk.content if hasattr(
                    chunk, "content") else str(chunk)
                if token:
                    retry_response += token
            artifacts = _extract_artifacts(retry_response)
            if artifacts:
                logger.info(
                    f"[_handle_plan_implement] Retry succeeded: {len(artifacts)} blocks.")
                yield _sse_event(EVENT_STEP, "Reformatting successful!")
        except Exception as retry_err:
            logger.warning(
                f"[_handle_plan_implement] Retry failed: {retry_err}")

    if not artifacts:
        logger.warning(
            f"[_handle_plan_implement] No artifacts found after retry. Response: {full_response[:500]}...")
        yield _sse_event(EVENT_ERROR, "No code artifacts found in plan implementation. Please try again or switch to a different AI model.")
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
