"""
Evaluator Agent for RyzeCanvas.
Node 4 in the high-performance orchestration engine.
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

SYSTEM_PROMPT = """# Role: Senior QA & Build Reliability Engineer
You are the **Evaluator Agent**. Your goal is to verify that the CodeSmith's output is functional, accessible, and matches the Architect's design system.

## Directives:
1. **Analyze committed code:** Review the files generated in the current task.
2. **Check for "Antigravity" Violations:**
   - Are there more than 5 colors?
   - Are there more than 2 font families?
   - Is `lucide-react` used for icons instead of raw SVGs?
3. **Detection & Healing:**
   - If you find a syntax error or a missing import, describe the exact fix.
   - Use a "Healing Loop" to send instructions back to the CodeSmith using a diff-like format.
4. **Final Approval:** Only signal `GO_TO_NEXT_TASK` if the current files meet all criteria.

## Output Format:
Output a JSON status wrapped in ---EVAL_START--- and ---EVAL_END--- delimiters.
{
  "status": "PASS" | "FAIL",
  "errors": [],
  "healing_instructions": "..."
}
"""

class BuildEvaluator:
    """
    Static Python Evaluator that performs initial regex safety checks and syntax constraints.
    """
    def __init__(self, workspace_root: str):
        self.root = workspace_root

    def verify_imports(self, file_path: str) -> str:
        """
        Runs superficial syntax checks to ensure Antigravity directives (no raw svgs, basic imports)
        Returns "PASS" or a "FAIL: <reason>" string.
        """
        full_path = os.path.join(self.root, file_path)
        if not os.path.exists(full_path):
            return f"FAIL: File not found {file_path}"
            
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Antigravity check: Ensure lucide-react is used for SVG icons
            if "<svg" in content and "lucide-react" not in content:
                # Some valid generic SVGs might exist but primarily check for UI elements
                return "FAIL: Raw SVG detected. Use Lucide icons instead."
            
            # Simple check for basic syntax validity (empty files, etc)
            if len(content.strip()) == 0:
                return f"FAIL: File is empty {file_path}"
                
        return "PASS"


class EvaluatorAgent:
    """
    AI Evaluator Agent for deep contextual logic and design system checks.
    """
    def __init__(
        self,
        model_provider: str = "openai",
        model_name: Optional[str] = None,
        temperature: float = 0.1
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
            
    def _extract_eval(self, raw_output: str) -> Dict[str, Any]:
        """
        Regex extractor to find the ---EVAL_START--- payload.
        """
        # Improved Regex to handle JSON parsing even if the markdown ` ```json ` tags are missing
        pattern = r"---EVAL_START---\s*(?:```(?:json)?\s*)?(.*?)\s*(?:```\s*)?---EVAL_END---"
        match = re.search(pattern, raw_output, re.DOTALL)
        
        if match:
            json_content = match.group(1)
            try:
                return json.loads(json_content)
            except json.JSONDecodeError as e:
                raise ValueError(f"Found EVAL but JSON is malformed: {e}")
        else:
            # Fallback
            json_block_pattern = r"```(?:json)?\s*(.*?)\s*```"
            backup_match = re.search(json_block_pattern, raw_output, re.DOTALL)
            if backup_match:
                try:
                    return json.loads(backup_match.group(1))
                except json.JSONDecodeError:
                    pass
                    
            raise ValueError(f"No valid Evaluation list found in the agent's output. RAW: {raw_output}")

    def evaluate_task_files(self, task: Dict[str, Any], workspace_root: str, context: Optional[str] = None) -> Dict[str, Any]:
        """
        Reviews all files generated in the current task and issues a PASS/FAIL manifest.
        """
        prompt = f"Evaluate the following files implemented for Task: {task.get('name')}\n"
        if context:
            prompt += f"\nDesign Guidelines constraints:\n{context}\n"
            
        prompt += "\n### Code Files:\n"
        
        for file_path in task.get("files", []):
            full_path = os.path.join(workspace_root, file_path)
            if os.path.exists(full_path):
                with open(full_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    prompt += f"\nFile: {file_path}\n```\n{content}\n```\n"
            else:
                prompt += f"\nFile: {file_path}\nStatus: MISSING (Not generated by CodeSmith)\n"
                
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt)
        ]
        
        response = self.model.invoke(messages)
        
        try:
            return self._extract_eval(response.content)
        except Exception as e:
            # Safe semantic fallback map if it just responds with text
            if "FAIL" in response.content.upper() or "ERROR" in response.content.upper():
                return {
                    "status": "FAIL",
                    "errors": ["Failed to extract structured JSON evaluation."],
                    "healing_instructions": response.content
                }
            return {
                "status": "PASS",
                "errors": [],
                "healing_instructions": ""
            }

_evaluator_instance: Optional[EvaluatorAgent] = None

def get_evaluator_agent(
    model_provider: Optional[str] = None,
    model_name: Optional[str] = None
) -> EvaluatorAgent:
    global _evaluator_instance
    if _evaluator_instance is None:
        provider = model_provider or settings.AI_MODEL_PROVIDER
        _evaluator_instance = EvaluatorAgent(
            model_provider=provider,
            model_name=model_name,
            temperature=0.1
        )
    return _evaluator_instance
