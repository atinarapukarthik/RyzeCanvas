import asyncio
import json
import traceback
from app.agent.architect import generate_architect_manifest
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.agent.architect import get_architect_agent

async def test_node_1():
    print("Initializing Node 1: The Architect...")
    prompt = "Create a 'Solo Leveling' inspired productivity app with a dark theme, neon blue highlights, focusing on a Dashboard and Quest list."
    print("Testing Architect with local DeepSeek LLM (ollama)...")
    try:
        agent = get_architect_agent(model_provider="ollama", model_name="deepseek-v3.1:671b-cloud")
        response = agent.generate_manifest(prompt)
        print("\nNode 1 test completed successfully!")
    except Exception as e:
        print(f"Error during execution: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_node_1())
