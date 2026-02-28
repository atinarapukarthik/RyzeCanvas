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
from app.agent.debugger import get_debugger_agent

class OrchestrationController:
    """
    Node 6: The Circuit Breaker logic gate overseeing the State Sync.
    """
    def __init__(self):
        self.retry_count = {}

    def trigger_structural_redesign(self, task_id: str):
        # In a real app, this sends a re-prompt payload back to Architect (Node 1)
        print("\n==================================")
        print("⚡ CIRCUIT BREAKER TRIPPED! ⚡")
        print("Escalating to Node 1: Architect for a complete redesign.")
        print("==================================\n")
        return {"action": "ESCALATE_TO_ARCHITECT"}

    def manage_loop(self, task_id: str, error_log: list, last_committed_code: str, manifest: dict):
        self.retry_count[task_id] = self.retry_count.get(task_id, 0) + 1
        
        print(f"\n🔁 Healing Loop Cycle: {self.retry_count[task_id]} / 3")
        
        if self.retry_count[task_id] > 2:
            print(f"⚠️ ERROR: Infinite loop detected for task '{task_id}'. Escalating to Architect...")
            return self.trigger_structural_redesign(task_id)
        
        print("🔍 Activating Node 5: The Debugger...")
        debugger = get_debugger_agent(model_provider="ollama")
        
        try:
            fix_strategy = debugger.analyze_and_fix(
                error_log=error_log,
                current_code=last_committed_code,
                manifest=manifest
            )
            print("\n====== DEBUGGER FIX STRATEGY ======")
            print(json.dumps(fix_strategy, indent=2))
            return {"action": "APPLY_PATCH", "patch": fix_strategy}
        except Exception as e:
            # If the debugger outputs `STATUS: ESCALATE` the regex will fail to parse JSON and throw an exception,
            # or the model natively passes that back. Treat exception as an escalation for now.
            print(f"Debugger triggered escalation or failed: {e}")
            return self.trigger_structural_redesign(task_id)

async def test_full_loop_v2():
    workspace_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_workspace_loop")
    if os.path.exists(workspace_root):
        shutil.rmtree(workspace_root)
    os.makedirs(workspace_root, exist_ok=True)
    
    controller = OrchestrationController()
    
    print("="*60)
    prompt = "Create a basic 'Solo Leveling' dark theme generic index component."
    
    try:
        # [NODE 1]: Architect
        print("\n[Node 1: Architect] Building Blueprint...")
        agent = get_architect_agent(model_provider="ollama")
        manifest_res = agent.generate_manifest(prompt)
        manifest = manifest_res.get("manifest", {})
        
        # [NODE 2]: TodoManager
        print("\n[Node 2: TodoManager] Chunking State...")
        manager = TodoManager(manifest)
        manager.generate_tasks_via_llm(model_provider="ollama")
        next_task = manager.get_next_task()
        
        # State Loop
        while next_task:
            print(f"\n[Node 3: CodeSmith] Executing chunk for {next_task['name']}...")
            codesmith_agent = get_codesmith_agent(model_provider="ollama")
            handler = CodeSmithHandler(workspace_root=workspace_root)
            
            # Simulated: CodeSmith generation
            agent_output = codesmith_agent.generate_code_for_task(
                task=next_task, project_id=manifest.get("manifestId", "test-project-123")
            )
            committed_files = handler.commit_files(agent_output)
            
            loop_passed = False
            
            while not loop_passed:
                # [NODE 4]: Evaluator
                print(f"\n[Node 4: Evaluator] Running Analysis on {len(committed_files)} files...")
                static_checker = BuildEvaluator(workspace_root=workspace_root)
                eval_agent = get_evaluator_agent(model_provider="ollama")
                eval_context = json.dumps(manifest.get('designSystem', {}))
                
                static_failures = []
                for file in committed_files:
                    result = static_checker.verify_imports(file)
                    if "FAIL" in result:
                        static_failures.append(result)
                        
                eval_result = eval_agent.evaluate_task_files(next_task, workspace_root, eval_context)
                
                all_errors = static_failures + eval_result.get("errors", [])
                
                if eval_result.get("status") == "FAIL" or len(all_errors) > 0:
                    print("\n🚨 Build Failed!")
                    last_committed_code = ""
                    if len(committed_files) > 0:
                        with open(os.path.join(workspace_root, committed_files[0]), "r", encoding="utf-8") as f:
                            last_committed_code = f.read()

                    # Trigger Node 6 Circuit Breaker -> Node 5 Debugger
                    decision = controller.manage_loop(
                        task_id=next_task['id'],
                        error_log=all_errors,
                        last_committed_code=last_committed_code,
                        manifest=manifest
                    )
                    
                    if decision["action"] == "ESCALATE_TO_ARCHITECT":
                        print("Terminating loop to perform a redesign...")
                        return # Exit the entire orchestration cycle to reset state in a real env
                        
                    elif decision["action"] == "APPLY_PATCH":
                        print("🔧 Sending Patch context back to CodeSmith... (Loop Restarting)")
                        # In the real code we inject `patch` instruction into the CodeSmith invoke call here.
                        # For testing, we mock the CodeSmith fixing it by artificially passing the loop to test exit points.
                        # We'll just generate code again for demonstration
                        print("... CodeSmith applies patch...")
                        
                        agent_output = codesmith_agent.generate_code_for_task(
                            task=next_task, project_id=manifest.get("manifestId", "test-project-123"), context=str(decision["patch"])
                        )
                        committed_files = handler.commit_files(agent_output)
                        # The inner While will now restart and go back to Node 4 (Evaluator) to verify the patch
                        
                else:
                    print("\n✅ Build Passed! State Locked. Moving to next capability.")
                    loop_passed = True
            
            manager.mark_complete(next_task['id'])
            next_task = manager.get_next_task()
            if next_task is None:
                print("\n🎉 ALL TASKS COMPLETE! ORCHESTRATION ENGINE SHUTTING DOWN.")
            
    except Exception as e:
        print(f"Error during execution: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_full_loop_v2())
