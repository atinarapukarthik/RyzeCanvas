import asyncio
import json
import traceback
import sys
import os
import shutil

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.agent.architect import get_architect_agent
from app.agent.todo_manager import TodoManager
from app.agent.codesmith import get_codesmith_agent, CodeSmithHandler

async def test_nodes_1_2_3():
    workspace_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_workspace")
    if os.path.exists(workspace_root):
        shutil.rmtree(workspace_root)
    os.makedirs(workspace_root, exist_ok=True)
    
    print("="*60)
    print("Initializing Node 1: The Architect...")
    prompt = "Create a basic 'Solo Leveling' dark theme generic index page and simple CSS."
    # Using Gemini for fast generation during dev/testing
    try:
        agent = get_architect_agent(model_provider="ollama")
        response = agent.generate_manifest(prompt)
        manifest = response.get("manifest", {})
        print(f"\nNode 1 Success! Manifest generated with {len(manifest.get('fileManifest', []))} files.")
        
        print("\n" + "="*60)
        print("Initializing Node 2: The TodoManager (State Sync)...")
        manager = TodoManager(manifest)
        todo_state = manager.generate_tasks_via_llm(model_provider="gemini")
        next_task = manager.get_next_task()
        
        print("\n====== EXTRACTED TASK 1 ======")
        print(json.dumps(next_task, indent=2))
        
        print("\n" + "="*60)
        print("Initializing Node 3: The CodeSmith...")
        codesmith_agent = get_codesmith_agent(model_provider="gemini")
        handler = CodeSmithHandler(workspace_root=workspace_root)
        
        print(f"CodeSmith generating code for: {next_task['name']}...")
        context = json.dumps(manifest.get('designSystem', {}))
        
        agent_output = codesmith_agent.generate_code_for_task(
            task=next_task, 
            project_id=manifest.get("manifestId", "test-project-123"),
            context=context
        )
        
        print("====== CODESMITH RAW OUTPUT ======")
        print(agent_output[:500] + "...\n[TRUNCATED]")
        
        print("\nCommitting files to local workspace via CodeSmithHandler...")
        committed_files = handler.commit_files(agent_output)
        
        print(f"\n✅ Success! Committed {len(committed_files)} files to {workspace_root}:\n")
        for f in committed_files:
            print(f"- {f}")
        
    except Exception as e:
        print(f"Error during execution: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_nodes_1_2_3())
