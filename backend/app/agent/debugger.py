"""
Debugger Agent for RyzeCanvas.
Node 5 in the high-performance orchestration engine.
"""
import json
import re
from typing import Dict, Any, List, Optional

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.core.config import settings

SYSTEM_PROMPT = """# Role: Lead Debugger & Root Cause Specialist
You are the **Debugger Agent**. Your goal is to provide an unblockable fix strategy OR signal a structural failure.

## Anti-Loop Directives:
1. **Analyze History:** Review the previous 2 failed attempts. If you are suggesting the same fix again, STOP.
2. **Escalation Trigger:** If the fix requires changing more than 50% of the file, do not use `<QuickEdit>`. Instead, output `STATUS: ESCALATE`.
3. **Escalation Logic:** An escalation tells the **Architect** that the original blueprint was flawed and needs a redesign to stay within "Antigravity" limits.

## Final Output Protocol:
Wrap your solution in ---DEBUG_FIX_START--- and ---DEBUG_FIX_END--- delimiters.
Example:
---DEBUG_FIX_START---
{
  "root_cause": "The CodeSmith used 7 colors instead of the 4 defined in the design system.",
  "patch": "```tsx file=\"path/to/file.tsx\"\n// Fixed code here\\n```"
}
---DEBUG_FIX_END---
"""

class DebuggerAgent:
    """
    AI Debugger Agent that performs root cause analysis on failed builds and issues surgical patches.
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

    def _extract_fix(self, raw_output: str) -> Dict[str, Any]:
        """
        Regex extractor for the ---DEBUG_FIX_START--- payload.
        Returns a safe fallback if extraction fails — NEVER raises.
        """
        # Try primary delimiter extraction
        pattern = r"---DEBUG_FIX_START---\s*(?:```(?:json)?\s*)?(.*?)\s*(?:```\s*)?---DEBUG_FIX_END---"
        match = re.search(pattern, raw_output, re.DOTALL)
        
        if match:
            json_content = match.group(1)
            try:
                return json.loads(json_content)
            except json.JSONDecodeError:
                pass

        # Fallback: Try to find any JSON block
        json_block_pattern = r"```(?:json)?\s*(.*?)\s*```"
        backup_match = re.search(json_block_pattern, raw_output, re.DOTALL)
        if backup_match:
            try:
                return json.loads(backup_match.group(1))
            except json.JSONDecodeError:
                pass

        # Fallback: Try to find raw JSON object in the text
        json_obj_pattern = r'\{[^{}]*"root_cause"[^{}]*\}'
        obj_match = re.search(json_obj_pattern, raw_output, re.DOTALL)
        if obj_match:
            try:
                return json.loads(obj_match.group(0))
            except json.JSONDecodeError:
                pass

        # Safe fallback — use the raw text as the fix context
        # This prevents the circuit breaker from tripping just because
        # the Debugger LLM returned non-standard formatting
        print(f"[Debugger] WARNING: Could not parse structured fix. Using raw text as context.")
        return {
            "root_cause": "Debugger analysis (unstructured): " + raw_output[:300],
            "patch": raw_output,
        }

    def analyze_and_fix(self, error_log: List[str], current_code: str, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes the error logs, original manifest, and current code to generate a targeted `<QuickEdit>` fix.
        """
        prompt = "Analyze the follow build failure and output a strict JSON fix strategy.\n\n"
        prompt += "### Errors from Evaluator:\n"
        for err in error_log:
            prompt += f"- {err}\n"
            
        prompt += f"\n### Node 1 Architect Design Constraints:\n{json.dumps(manifest.get('designSystem', {}), indent=2)}\n"
        prompt += f"\n### Current Code Iteration:\n```\n{current_code}\n```\n"

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt)
        ]
        
        response = self.model.invoke(messages)
        return self._extract_fix(response.content)

_debugger_instance: Optional[DebuggerAgent] = None

def get_debugger_agent(
    model_provider: Optional[str] = None,
    model_name: Optional[str] = None
) -> DebuggerAgent:
    global _debugger_instance
    if _debugger_instance is None:
        provider = model_provider or settings.AI_MODEL_PROVIDER
        _debugger_instance = DebuggerAgent(
            model_provider=provider,
            model_name=model_name,
            temperature=0.2
        )
    return _debugger_instance
