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
from app.agent.evaluator import get_evaluator_agent, BuildEvaluator

async def test_full_loop():
    workspace_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_workspace_loop")
    if os.path.exists(workspace_root):
        shutil.rmtree(workspace_root)
    os.makedirs(workspace_root, exist_ok=True)
    
    print("="*60)
    prompt = "Create a basic 'Solo Leveling' dark theme button component."
    
    try:
        # [NODE 1]: Architect
        print("\n[Node 1: Architect] Building Blueprint...")
        agent = get_architect_agent(model_provider="gemini")
        manifest_res = agent.generate_manifest(prompt)
        manifest = manifest_res.get("manifest", {})
        
        # [NODE 2]: TodoManager
        print("\n[Node 2: TodoManager] Chunking State...")
        manager = TodoManager(manifest)
        manager.generate_tasks_via_llm(model_provider="gemini")
        next_task = manager.get_next_task()
        
        # [NODE 3]: CodeSmith
        print(f"\n[Node 3: CodeSmith] Writing code for {next_task['name']}...")
        codesmith_agent = get_codesmith_agent(model_provider="gemini")
        handler = CodeSmithHandler(workspace_root=workspace_root)
        
        agent_output = codesmith_agent.generate_code_for_task(
            task=next_task, project_id=manifest["manifestId"]
        )
        committed_files = handler.commit_files(agent_output)
        
        # [NODE 4]: Evaluator
        print(f"\n[Node 4: Evaluator] Running Analysis on {len(committed_files)} files...")
        static_checker = BuildEvaluator(workspace_root=workspace_root)
        eval_agent = get_evaluator_agent(model_provider="gemini")
        
        static_failures = []
        for file in committed_files:
            result = static_checker.verify_imports(file)
            print(f"Static Link Check [{file}]: {result}")
            if "FAIL" in result:
                static_failures.append(result)
                
        # LLM Deep Verification
        print("Running AI logic ruleset evaluation...")
        eval_context = json.dumps(manifest.get('designSystem', {}))
        eval_result = eval_agent.evaluate_task_files(next_task, workspace_root, eval_context)
        
        print("\n====== EVALUATOR DECISION (JSON) ======")
        print(json.dumps(eval_result, indent=2))
        
        # Healing Loop Simulation
        if eval_result.get("status") == "FAIL" or len(static_failures) > 0:
            print("\n🚨 Build Failed! Triggering Healing Feedback to CodeSmith...")
            # We would loop back to CodeSmith here passing `healing_instructions`
        else:
            print("\n✅ Build Passed! Moving to Next Task.")
            manager.mark_complete(next_task['id'])
            
    except Exception as e:
        print(f"Error during execution: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_full_loop())
