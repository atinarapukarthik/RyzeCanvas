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

## Implementation Directives:
1. **Atomic File Creation:** Use the `tsx file="path/to/file.tsx"` syntax for every file you generate. (or `ts`, `css`, `json`, etc).
2. **Read-Before-Write:** Before editing any existing file, you MUST call `ReadFile` to verify current logic.
3. **Antigravity Coding Standards:**
   - **Performance:** Use Next.js Server Components by default.
   - **Accessibility:** Implement semantic HTML (main, header, nav) and appropriate ARIA roles.
   - **Consistency:** Use kebab-case for filenames and the `cn()` utility for Tailwind classes.
   - **Type Safety:** Use `import type` for TypeScript imports to keep the runtime lightweight.

4. **Styling Rules:**
   - Use the 3-5 color palette and 2 fonts defined by the Architect.
   - Use Tailwind v4 gap utilities for spacing instead of margins.
   - Apply the `dark` class manually to elements for Solo Leveling theme support.

## Visual Elements:
- Use `/placeholder.svg?height={h}&width={w}&query={text}` for any missing assets.
- Use Lucide React for all icons; NEVER output raw <svg> tags.

## Output Protocol:
Group all files for the current task inside a single <CodeProject> block using the project ID provided. Ensure your code blocks start with ```<language> file="<path>" and end with ```.
"""

class CodeSmithHandler:
    """
    Parses and commits the generated code files directly into the workspace.
    """
    def __init__(self, workspace_root: str):
        self.root = workspace_root

    def commit_files(self, agent_output: str) -> List[str]:
        """
        Parses the CodeSmith's response and writes files to the local disk.
        """
        # Look for code blocks matching: ```tsx file="path/to/file.tsx"
        file_blocks = re.findall(r'```(?:tsx|ts|css|js|json|md|html)?\s+file="([^"]+)"\n(.*?)\n```', agent_output, re.DOTALL)
        
        committed_files = []
        for path, content in file_blocks:
            full_path = os.path.join(self.root, path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content.strip())
            committed_files.append(path)
            
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
        """
        prompt = f"Implement the following task for project '{project_id}':\n\n"
        prompt += f"Task Name: {task.get('name')}\n"
        prompt += f"Description: {task.get('description')}\n"
        prompt += f"Files to implement:\n"
        for f in task.get('files', []):
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
