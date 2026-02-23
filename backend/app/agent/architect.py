"""
Architect Agent for RyzeCanvas.
The first node in a high-performance orchestration engine.
"""
import json
import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, ValidationError

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser

from app.core.config import settings


class TechStack(BaseModel):
    framework: str = Field(description="The frontend or backend framework")
    styling: str = Field(description="The CSS framework or methodology")
    icons: str = Field(description="The icon library")
    language: str = Field(description="The programming language")

class Colors(BaseModel):
    primary: str
    backgroundDark: str
    surfaceNeutrals: str
    accent: str

class Typography(BaseModel):
    heading: str
    body: str

class DesignSystem(BaseModel):
    colors: Colors
    typography: Typography

class FileManifestItem(BaseModel):
    path: str
    type: str
    purpose: str

class ArchitectManifest(BaseModel):
    manifestId: str
    projectName: str
    techStack: TechStack
    designSystem: DesignSystem
    fileManifest: List[FileManifestItem]
    dependencies: List[str]


SYSTEM_PROMPT = """# Role: Lead AI Software Architect
You are the first node in a high-performance orchestration engine. Your goal is to design a codebase following the "Antigravity" principle: weightless, modular, and debt-free.

## Core Directives:
1. **Analyze with <Thinking>:**
   - Always start by reasoning through the user's request inside <Thinking> tags.
   - Determine tech stack (Default: Next.js 15, Tailwind v4, Lucide Icons).
   - Establish a 3-5 color palette and 2-font typography system.

2. **Establish Context:**
   - Use `SearchRepo` to verify file structures before proposing new paths.
   - Ensure all filenames use kebab-case.

## CRITICAL: Output Format Rules
To ensure the backend can parse your response, you MUST follow this structure exactly:

1. Perform your reasoning inside `<Thinking>...</Thinking>` tags.
2. Immediately following the closing `</Thinking>` tag, provide the JSON manifest inside a code block.
3. Use the delimiter `---MANIFEST_START---` and `---MANIFEST_END---` to wrap the JSON code block.

Example:
<Thinking>
... architectural reasoning ...
</Thinking>

---MANIFEST_START---
```json
{
  "manifestId": "...",
  "projectName": "...",
  "techStack": { ... },
  "designSystem": { ... },
  "fileManifest": [...],
  "dependencies": [...]
}
```
---MANIFEST_END---
"""

class ArchitectAgent:
    """
    AI Agent responsible for transforming user requests into a concrete technical manifest.
    """
    def __init__(
        self,
        model_provider: str = "openai",
        model_name: Optional[str] = None,
        temperature: float = 0.2
    ):
        self.model_provider = model_provider
        self.temperature = temperature
        
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
            
    def _extract_manifest(self, raw_output: str) -> Dict[str, Any]:
        # Regex to capture everything between the custom delimiters
        pattern = r"---MANIFEST_START---\s*```(?:json)?\s*(.*?)\s*```\s*---MANIFEST_END---"
        match = re.search(pattern, raw_output, re.DOTALL)
        
        if match:
            json_content = match.group(1)
            try:
                return json.loads(json_content)
            except json.JSONDecodeError as e:
                raise ValueError(f"Found manifest but JSON is malformed: {e}")
        else:
            # Fallback: Try to find any JSON block if delimiters are missing
            json_block_pattern = r"```(?:json)?\s*(.*?)\s*```"
            backup_match = re.search(json_block_pattern, raw_output, re.DOTALL)
            if backup_match:
                return json.loads(backup_match.group(1))
                
        # Super-fallback: Try parsing the whole thing if the model just returns JSON (happens sometimes)
        try:
            return json.loads(raw_output)
        except json.JSONDecodeError as e:
            with open("manifest_raw.log", "w", encoding="utf-8") as f:
                f.write(raw_output)
            raise ValueError(f"No valid manifest found or JSON malformed: {e}. Raw output saved to manifest_raw.log")
    
    def generate_manifest(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate a structured UI plan/manifest from a user prompt.
        """
        try:
            json_parser = JsonOutputParser(pydantic_object=ArchitectManifest)
            
            user_message = prompt
            if context:
                user_message += f"\n\nContext:\n{json.dumps(context, indent=2)}"
            
            # Combine the base SYSTEM_PROMPT with the rigid Pydantic JSON requirements
            messages = [
                SystemMessage(content=SYSTEM_PROMPT + "\n\n" + json_parser.get_format_instructions()),
                HumanMessage(content=f"Create a technical manifest for: {user_message}")
            ]
            
            response = self.model.invoke(messages)
            raw_content = response.content
            
            manifest_dict = self._extract_manifest(raw_content)

            try:
                validated_manifest = ArchitectManifest(**manifest_dict)
                return {
                    "raw_response": raw_content,
                    "manifest": validated_manifest.model_dump()
                }
            except ValidationError as e:
                print(f"Validation Error raw dict keys: {list(manifest_dict.keys())}")
                if "dependencies" not in manifest_dict:
                    manifest_dict["dependencies"] = []
                try:
                    # Let's try one more time with forced dependencies if missing
                    validated_manifest = ArchitectManifest(**manifest_dict)
                    return {
                        "raw_response": raw_content,
                        "manifest": validated_manifest.model_dump()
                    }
                except Exception:
                    raise ValueError(f"Generated manifest failed validation: {e}\nDict: {json.dumps(manifest_dict, indent=2)}")
                
        except Exception as e:
            raise Exception(f"Architect Node execution failed: {str(e)}")

_architect_instance: Optional[ArchitectAgent] = None

def get_architect_agent(
    model_provider: Optional[str] = None,
    model_name: Optional[str] = None
) -> ArchitectAgent:
    global _architect_instance
    if _architect_instance is None:
        provider = model_provider or settings.AI_MODEL_PROVIDER
        _architect_instance = ArchitectAgent(
            model_provider=provider,
            model_name=model_name,
            temperature=0.2
        )
    return _architect_instance

async def generate_architect_manifest(prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    agent = get_architect_agent()
    # using sync function for now since there are no async definitions required for this small demo layer.
    return agent.generate_manifest(prompt, context)
