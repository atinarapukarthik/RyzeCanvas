"""
TodoManager Agent for RyzeCanvas.
Node 2 in the high-performance orchestration engine.
"""
import json
import re
import uuid
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, ValidationError

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser

from app.core.config import settings

class Task(BaseModel):
    id: str
    name: str
    files: List[str]
    status: str
    description: str

class TodoState(BaseModel):
    project_id: str
    tasks: List[Task]

SYSTEM_PROMPT = """# Role: Project State & Todo Controller
You are the **TodoManager Agent**. You receive a technical manifest and must drive the project toward completion by managing milestone-level tasks.

## Directives:
1. **State Awareness:** You are the "Source of Truth" for progress. Never guess the state; always check the current task list.
2. **Milestone Grouping:** Break the manifest into 3-7 logical tasks.
   - Task 1: Foundation (Layout, CSS, Utils).
   - Tasks 2-5: Core Features (One task per page including its components).
   - Task 6: Data/Integration (Supabase/Neon setup).
3. **Sequential Execution:** Use `move_to_task` to signal the CodeSmith which files to work on next.
4. **No Fluff:** Do not create tasks for "Testing" or "Review." If the code is written, the task is complete.

## Communication:
When handed a manifest, output the task list in JSON format wrapped in ---TODO_START--- and ---TODO_END--- delimiters.

Example Formatting:
---TODO_START---
```json
{
  "project_id": "...",
  "tasks": [
    {
      "id": "task_1",
      "name": "Project Foundation",
      "files": ["app/layout.tsx", "lib/utils.ts", "app/globals.css"],
      "status": "todo",
      "description": "Initialize root layout, theme providers, and global utilities."
    }
  ]
}
```
---TODO_END---
"""

class TodoManager:
    def __init__(self, manifest: Dict):
        """
        Initializes the TodoManager with the raw manifest output from the Architect node.
        """
        self.project_id = manifest.get("manifestId", str(uuid.uuid4()))
        self.tasks = []
        self.current_task_index = 0
        self.manifest = manifest

    def generate_tasks_via_llm(self, model_provider: str = "openai", model_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Uses an LLM to smartly chunk the manifest files into milestones instead of statically grouping them.
        """
        temperature = 0.2
        if model_provider == "openai":
            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY not configured")
            model = ChatOpenAI(
                model=model_name or "gpt-4o",
                temperature=temperature,
                api_key=settings.OPENAI_API_KEY
            )
        elif model_provider == "anthropic":
            if not settings.ANTHROPIC_API_KEY:
                raise ValueError("ANTHROPIC_API_KEY not configured")
            model = ChatAnthropic(
                model=model_name or "claude-3-5-sonnet-20241022",
                temperature=temperature,
                api_key=settings.ANTHROPIC_API_KEY
            )
        elif model_provider == "gemini":
            if not settings.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY not configured")
            model = ChatGoogleGenerativeAI(
                model=model_name or "gemini-2.5-flash",
                temperature=temperature,
                google_api_key=settings.GEMINI_API_KEY,
                max_output_tokens=8192,
            )
        elif model_provider == "ollama":
            from langchain_ollama import ChatOllama
            model = ChatOllama(
                model=model_name or settings.OLLAMA_MODEL or "gpt-oss:120b-cloud",
                base_url=settings.OLLAMA_BASE_URL,
                temperature=temperature,
            )
        else:
            raise ValueError(f"Unsupported model_provider: {model_provider}")
        
        json_parser = JsonOutputParser(pydantic_object=TodoState)

        messages = [
            SystemMessage(content=SYSTEM_PROMPT + "\n\n" + json_parser.get_format_instructions()),
            HumanMessage(content=f"Create a milestone task list for this technical manifest:\n{json.dumps(self.manifest, indent=2)}")
        ]
        
        response = model.invoke(messages)
        raw_content = response.content

        return self._extract_todos(raw_content)

    def _extract_todos(self, raw_output: str) -> Dict[str, Any]:
        """
        Regex extractor to find the ---TODO_START--- payload.
        """
        pattern = r"---TODO_START---\s*```(?:json)?\s*(.*?)\s*```\s*---TODO_END---"
        match = re.search(pattern, raw_output, re.DOTALL)
        
        if match:
            json_content = match.group(1)
            try:
                parsed = json.loads(json_content)
            except json.JSONDecodeError as e:
                with open("todo_raw.log", "w", encoding="utf-8") as f:
                    f.write(raw_output)
                raise ValueError(f"Found TODO but JSON is malformed: {e}")
        else:
            json_block_pattern = r"```(?:json)?\s*(.*?)\s*```"
            backup_match = re.search(json_block_pattern, raw_output, re.DOTALL)
            if backup_match:
                parsed = json.loads(backup_match.group(1))
            else:
                try:
                    parsed = json.loads(raw_output)
                except json.JSONDecodeError:
                    with open("todo_raw.log", "w", encoding="utf-8") as f:
                        f.write(raw_output)
                    raise ValueError("No valid TODO list found in the agent's output.")
        
        # Load tasks into memory
        self.tasks = parsed.get("tasks", [])
        return parsed

    def get_next_task(self):
        """
        Retrieves the next pending task for Node 3 (CodeSmith).
        """
        if self.current_task_index < len(self.tasks):
            task = self.tasks[self.current_task_index]
            task["status"] = "in_progress"
            return task
        return None

    def mark_complete(self, task_id: str):
        """
        Marks a task complete and moves the needle forward.
        """
        for task in self.tasks:
            if task["id"] == task_id:
                task["status"] = "complete"
                self.current_task_index += 1
                return True
        return False
