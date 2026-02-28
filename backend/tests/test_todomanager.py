import asyncio
import json
import traceback
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.agent.architect import get_architect_agent
from app.agent.todo_manager import TodoManager

async def test_nodes_1_and_2():
    print("="*60)
    print("Initializing Node 1: The Architect...")
    prompt = "Create a 'Solo Leveling' inspired productivity app with a dark theme, neon blue highlights, focusing on a Dashboard and Quest list."
    print("Testing Architect with Gemini (faster fallback)...")
    try:
        # Run Architect
        agent = get_architect_agent(model_provider="ollama")
        response = agent.generate_manifest(prompt)
        manifest = response.get("manifest", {})
        print(f"\nNode 1 Success! Manifest generated with {len(manifest.get('fileManifest', []))} files.")
        
        print("\n" + "="*60)
        print("Initializing Node 2: The TodoManager (State Sync)...")
        # Init TodoManager with manifest
        manager = TodoManager(manifest)
        
        print("Using LLM to group manifest into Milestones/Tasks...")
        todo_state = manager.generate_tasks_via_llm(model_provider="gemini")
        
        print("\n====== EXTRACTED TODOS (JSON) ======")
        print(json.dumps(todo_state, indent=2))
        
        # Test the state logic
        print("\n====== TESTING STATE SYNC ======")
        next_task = manager.get_next_task()
        print(f"Next Task from TodoManager: {next_task['name']}")
        print(f"Files to generate: {next_task['files']}")
        
        print("\nNode 2 test completed successfully!")
    except Exception as e:
        print(f"Error during execution: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_nodes_1_and_2())
