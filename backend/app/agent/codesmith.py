"""
CodeSmith Agent for RyzeCanvas.
Node 3 in the high-performance orchestration engine.
"""
import json
import re
import os
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.core.config import settings

SYSTEM_PROMPT = """# Role: Senior Full-Stack Implementation Agent
You are the **CodeSmith Agent**. Your task is to execute the implementation plan provided by the TodoManager. You write production-grade, accessible, and performant code.

## CRITICAL: Project Structure Rules
This project uses a **Next.js 15 App Router** with the `src/` directory prefix.
ALL source files MUST be under the `src/` directory. This is NON-NEGOTIABLE.

### Correct paths:
- Pages: `src/app/page.tsx`, `src/app/about/page.tsx`
- Components: `src/components/ui/hero.tsx`, `src/components/shared/navbar.tsx`
- Utilities: `src/lib/utils.ts`
- Hooks: `src/hooks/use-theme.ts`
- Types: `src/types/index.ts`

### WRONG paths (NEVER use these):
- ❌ `app/page.tsx` (missing `src/` prefix)
- ❌ `components/hero.tsx` (missing `src/` prefix)
- ❌ `lib/utils.ts` (missing `src/` prefix)

### Files you must NEVER create (already managed by the Librarian):
- ❌ `package.json`
- ❌ `tsconfig.json`
- ❌ `next.config.mjs`
- ❌ `tailwind.config.ts`
- ❌ `postcss.config.mjs`
- ❌ `src/app/globals.css`
- ❌ `src/app/layout.tsx`
- ❌ `src/lib/utils.ts`
- ❌ `next-env.d.ts`

## Implementation Directives:
1. **Atomic File Creation:** Use the `tsx file="src/path/to/file.tsx"` syntax for every file you generate.
2. **Antigravity Coding Standards:**
   - **Performance:** Use Next.js Server Components by default. Add `'use client'` only when needed (event handlers, hooks, browser APIs).
   - **Accessibility:** Implement semantic HTML (main, header, nav) and appropriate ARIA roles.
   - **Consistency:** Use kebab-case for filenames and the `cn()` utility from `@/lib/utils` for Tailwind classes.
   - **Type Safety:** Use `import type` for TypeScript type-only imports.

3. **Styling Rules:**
   - Use the color palette and fonts defined by the Architect (available as CSS variables in globals.css).
   - CSS variables available: `var(--color-primary)`, `var(--color-bg-dark)`, `var(--color-surface)`, `var(--color-accent)`, `var(--font-heading)`, `var(--font-body)`.
   - Use Tailwind v4 gap utilities for spacing instead of margins.

## Visual Elements:
- Use `/placeholder.svg?height={h}&width={w}&query={text}` for any missing assets.
- Use Lucide React for all icons; NEVER output raw <svg> tags.

## Import Conventions:
- Components: `import { Button } from '@/components/ui/button'`
- Utils: `import { cn } from '@/lib/utils'`
- Icons: `import { ArrowRight, Menu } from 'lucide-react'`

## Output Protocol:
Group all files for the current task inside a single response. Ensure your code blocks start with ```<language> file="src/<path>" and end with ```.

Example:
```tsx file="src/app/page.tsx"
// Your code here
```

```tsx file="src/components/ui/hero.tsx"
// Your code here
```
"""


# ──────────────────────────────────────────
# Path Normalization Utilities
# ──────────────────────────────────────────

# Paths that the Librarian owns — the CodeSmith should never overwrite these
LIBRARIAN_OWNED_FILES = {
    "package.json",
    "tsconfig.json",
    "next.config.mjs",
    "tailwind.config.ts",
    "postcss.config.mjs",
    "next-env.d.ts",
    "src/app/globals.css",
    "src/app/layout.tsx",
    "src/lib/utils.ts",
}


def normalize_file_path(path: str) -> Optional[str]:
    """
    Normalize a file path output by the LLM to ensure it conforms to the
    Librarian's `src/` directory structure.

    This is the critical fix: LLMs frequently output paths like:
      app/page.tsx        → should be src/app/page.tsx
      components/hero.tsx → should be src/components/ui/hero.tsx
      lib/helpers.ts      → should be src/lib/helpers.ts

    It also fixes issues where the LLM repeats 'src/' (e.g. src/src/app/page.tsx).
    Returns None if the file should be skipped (e.g. Librarian-owned files).
    """
    # Clean up the path
    path = path.strip().replace("\\", "/")

    # Remove leading ./ or /
    path = path.lstrip("./")

    # Keep removing leading "src/" until it's completely stripped
    has_src_prefix = False
    while path.startswith("src/"):
        has_src_prefix = True
        path = path[4:]

    # Skip Librarian-owned files (config files, globals.css, layout.tsx, utils.ts)
    owned_stripped = [
        p[4:] if p.startswith("src/") else p
        for p in LIBRARIAN_OWNED_FILES
    ]
    if path in owned_stripped:
        return None

    # Source code directories that must live under src/
    source_dirs = ["app/", "components/", "lib/", "hooks/", "types/", "styles/",
                   "utils/", "services/", "context/", "providers/", "store/",
                   "features/", "modules/", "pages/", "assets/"]

    needs_src = False
    for src_dir in source_dirs:
        if path.startswith(src_dir):
            needs_src = True
            break

    if needs_src or has_src_prefix:
        return "src/" + path

    # Root-level non-config files (like public/ assets) are fine as-is
    return path


class CodeSmithHandler:
    """
    Parses and commits the generated code files directly into the workspace.
    Includes path normalization to prevent structural mismatches with the Librarian.
    """
    def __init__(self, workspace_root: str):
        self.root = workspace_root

    def commit_files(self, agent_output: str) -> List[str]:
        """
        Parses the CodeSmith's response and writes files to the local disk.
        Normalizes all paths to ensure they land inside the Librarian's src/ structure.
        Skips any Librarian-owned files the LLM tried to regenerate.
        """
        # Look for code blocks matching: ```tsx file="path/to/file.tsx"
        file_blocks = re.findall(
            r'```(?:tsx|ts|css|js|jsx|json|md|html)?\s+file="([^"]+)"\n(.*?)\n```',
            agent_output, re.DOTALL
        )

        committed_files = []
        for raw_path, content in file_blocks:
            # Normalize the path (add src/ prefix, block Librarian-owned files)
            normalized_path = normalize_file_path(raw_path)

            if normalized_path is None:
                # This is a Librarian-owned file — skip it
                print(f"[CodeSmith] SKIPPED Librarian-owned file: {raw_path}")
                continue

            full_path = os.path.join(self.root, normalized_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)

            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content.strip())
            committed_files.append(normalized_path)
            print(f"[CodeSmith] Committed: {raw_path} → {normalized_path}")

        return committed_files


class CodeSmithAgent:
    """
    AI Agent that generates the actual implementation code based on the current Milestone.
    """
    def __init__(
        self,
        model_provider: str = "openai",
        model_name: Optional[str] = None,
        temperature: float = 0.2
    ):
        self.model_provider = model_provider

        if model_provider == "openai":
            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY not configured")
            self.model = ChatOpenAI(
                model=model_name or "gpt-4o",
                temperature=temperature,
                api_key=settings.OPENAI_API_KEY
            )
        elif model_provider == "anthropic":
            if not settings.ANTHROPIC_API_KEY:
                raise ValueError("ANTHROPIC_API_KEY not configured")
            self.model = ChatAnthropic(
                model=model_name or "claude-3-5-sonnet-20241022",
                temperature=temperature,
                api_key=settings.ANTHROPIC_API_KEY
            )
        elif model_provider == "gemini":
            if not settings.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY not configured")
            self.model = ChatGoogleGenerativeAI(
                model=model_name or "gemini-2.5-flash",
                temperature=temperature,
                google_api_key=settings.GEMINI_API_KEY,
                max_output_tokens=8192,
            )
        elif model_provider == "ollama":
            from langchain_ollama import ChatOllama
            self.model = ChatOllama(
                model=model_name or settings.OLLAMA_MODEL or "gpt-oss:120b-cloud",
                base_url=settings.OLLAMA_BASE_URL,
                temperature=temperature,
            )
        else:
            raise ValueError(f"Unsupported model_provider: {model_provider}")

    def generate_code_for_task(self, task: Dict[str, Any], project_id: str, context: Optional[str] = None) -> str:
        """
        Request implementation for a specific TodoManager task.
        File paths in the task are normalized to use src/ prefix before being sent to the LLM.
        """
        # Normalize file paths in the task to ensure they use src/
        normalized_files = []
        for f in task.get('files', []):
            norm = normalize_file_path(f)
            if norm:
                normalized_files.append(norm)

        prompt = f"Implement the following task for project '{project_id}':\n\n"
        prompt += f"Task Name: {task.get('name')}\n"
        prompt += f"Description: {task.get('description')}\n"
        prompt += f"Files to implement (use these EXACT paths with src/ prefix):\n"
        for f in normalized_files:
            prompt += f"- {f}\n"

        if context:
            prompt += f"\nContext/Design Guidelines:\n{context}\n"

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt)
        ]

        response = self.model.invoke(messages)
        return response.content

_codesmith_instance: Optional[CodeSmithAgent] = None

def get_codesmith_agent(
    model_provider: Optional[str] = None,
    model_name: Optional[str] = None
) -> CodeSmithAgent:
    global _codesmith_instance
    if _codesmith_instance is None:
        provider = model_provider or settings.AI_MODEL_PROVIDER
        _codesmith_instance = CodeSmithAgent(
            model_provider=provider,
            model_name=model_name,
            temperature=0.2
        )
    return _codesmith_instance
