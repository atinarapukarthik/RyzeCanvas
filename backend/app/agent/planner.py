"""
AI Planner Agent for RyzeCanvas.
Uses LangChain with OpenAI or Anthropic to generate structured UI plans.
"""
import json
import os
from typing import Dict, Any, Optional
from pydantic import ValidationError

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser

from app.core.component_library import (
    UIPlan,
    ALLOWED_COMPONENTS,
    COMPONENT_TEMPLATES,
    SYSTEM_PROMPT
)
from app.core.config import settings


class UIPlannerAgent:
    """
    AI Agent responsible for generating deterministic UI plans from natural language.
    Uses structured output to ensure consistent JSON generation.
    """
    
    def __init__(
        self,
        model_provider: str = "openai",  # "openai" or "anthropic"
        model_name: Optional[str] = None,
        temperature: float = 0.3  # Low temperature for more deterministic outputs
    ):
        """
        Initialize the UI Planner Agent.
        
        Args:
            model_provider: "openai" or "anthropic"
            model_name: Specific model name (defaults to best available)
            temperature: Model temperature (0.0-1.0, lower = more deterministic)
        """
        self.model_provider = model_provider
        self.temperature = temperature
        
        # Initialize the appropriate LLM
        if model_provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY not found in environment variables")
            
            self.model = ChatOpenAI(
                model=model_name or "gpt-4o",  # gpt-4o, gpt-4-turbo, gpt-3.5-turbo
                temperature=temperature,
                api_key=api_key
            )
        
        elif model_provider == "anthropic":
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not found in environment variables")
            
            self.model = ChatAnthropic(
                model=model_name or "claude-3-5-sonnet-20241022",  # claude-3-5-sonnet, claude-3-opus
                temperature=temperature,
                api_key=api_key
            )
        
        else:
            raise ValueError(f"Unsupported model_provider: {model_provider}")
        
        # Output parser for JSON
        self.json_parser = JsonOutputParser(pydantic_object=UIPlan)
        
        # Build system prompt with component info
        self.system_prompt = SYSTEM_PROMPT.format(
            allowed_components=", ".join(ALLOWED_COMPONENTS),
            component_templates=json.dumps(COMPONENT_TEMPLATES, indent=2)
        )
    
    def generate_ui_plan(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate a structured UI plan from a natural language prompt.
        
        Args:
            prompt: User's natural language description of the UI
            context: Optional context (previous plans, user preferences, etc.)
        
        Returns:
            Dictionary containing the UI plan (validated against UIPlan schema)
        
        Raises:
            Exception: If generation fails or output is invalid
        """
        try:
            # Build the user message
            user_message = prompt
            
            # Add context if provided
            if context:
                context_str = f"\n\nContext:\n{json.dumps(context, indent=2)}"
                user_message += context_str
            
            # Create messages
            messages = [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=f"Generate a UI plan for: {user_message}")
            ]
            
            # Invoke the model
            response = self.model.invoke(messages)
            
            # Extract content
            raw_content = response.content
            
            # Try to parse as JSON
            try:
                # Handle cases where the model wraps JSON in markdown
                if "```json" in raw_content:
                    # Extract JSON from markdown code block
                    json_start = raw_content.find("```json") + 7
                    json_end = raw_content.rfind("```")
                    raw_content = raw_content[json_start:json_end].strip()
                elif "```" in raw_content:
                    # Generic code block
                    json_start = raw_content.find("```") + 3
                    json_end = raw_content.rfind("```")
                    raw_content = raw_content[json_start:json_end].strip()
                
                # Parse JSON
                plan_dict = json.loads(raw_content)
                
                # Validate against Pydantic schema
                validated_plan = UIPlan(**plan_dict)
                
                # Return as dict
                return validated_plan.model_dump()
            
            except json.JSONDecodeError as e:
                raise ValueError(f"Failed to parse JSON from model output: {e}\nRaw output: {raw_content}")
            except ValidationError as e:
                raise ValueError(f"Generated plan failed validation: {e}\nPlan: {plan_dict}")
        
        except Exception as e:
            raise Exception(f"UI Plan generation failed: {str(e)}")
    
    async def generate_ui_plan_async(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Async version of generate_ui_plan for use in FastAPI endpoints.
        
        Args:
            prompt: User's natural language description
            context: Optional context dictionary
        
        Returns:
            Validated UI plan dictionary
        """
        # For now, we use the sync version
        # LangChain's async support can be added here if needed
        return self.generate_ui_plan(prompt, context)


# Global agent instance (lazy initialization)
_agent_instance: Optional[UIPlannerAgent] = None


def get_planner_agent(
    model_provider: Optional[str] = None,
    model_name: Optional[str] = None
) -> UIPlannerAgent:
    """
    Get or create the global planner agent instance.
    
    Args:
        model_provider: Override default model provider
        model_name: Override default model name
    
    Returns:
        UIPlannerAgent instance
    """
    global _agent_instance
    
    if _agent_instance is None:
        # Determine provider from env or default to openai
        provider = model_provider or os.getenv("AI_MODEL_PROVIDER", "openai")
        
        _agent_instance = UIPlannerAgent(
            model_provider=provider,
            model_name=model_name,
            temperature=0.3
        )
    
    return _agent_instance


# Convenience function for simple usage
async def generate_ui_plan(prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Main entry point for UI plan generation.
    
    Args:
        prompt: Natural language UI description
        context: Optional context
    
    Returns:
        Validated UI plan dictionary
    
    Example:
        >>> plan = await generate_ui_plan("Create a login screen with email and password")
        >>> print(plan['components'])
    """
    agent = get_planner_agent()
    return await agent.generate_ui_plan_async(prompt, context)


# Example usage and testing
if __name__ == "__main__":
    import asyncio
    
    async def test_planner():
        """Test the planner with sample prompts."""
        test_prompts = [
            "Create a login screen with email and password fields",
            "Build a dashboard with a navbar, sidebar, and three cards showing stats",
            "Design a contact form with name, email, and message fields"
        ]
        
        for prompt in test_prompts:
            print(f"\n{'='*60}")
            print(f"Prompt: {prompt}")
            print('='*60)
            
            try:
                plan = await generate_ui_plan(prompt)
                print("\nGenerated Plan:")
                print(json.dumps(plan, indent=2))
                
                print(f"\n✅ Success! Generated {len(plan['components'])} components")
            
            except Exception as e:
                print(f"\n❌ Error: {e}")
    
    # Run test
    asyncio.run(test_planner())
