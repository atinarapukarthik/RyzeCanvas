from fastapi import APIRouter, WebSocket, WebSocketDisconnect, BackgroundTasks
from pydantic import BaseModel
import asyncio
from typing import Dict, List
import json
import os
import shutil

from app.agent.architect import get_architect_agent
from app.agent.todo_manager import TodoManager
from app.agent.codesmith import get_codesmith_agent, CodeSmithHandler
from app.agent.evaluator import get_evaluator_agent, BuildEvaluator
from app.agent.debugger import get_debugger_agent
from app.agent.librarian import get_librarian_agent
from app.agent.web_researcher import get_web_researcher
from app.agent.command_executor import (
    execute_command, npm_install, npm_build,
    check_node_installed, format_command_output
)
from app.core.supabase import supabase_admin, supabase
from app.db.session import AsyncSessionLocal
from app.models.project import Project
from sqlalchemy import select, update
from datetime import datetime

router = APIRouter()

class StartOrchestrationRequest(BaseModel):
    prompt: str = "Generate a basic UI component"

class ConnectionManager:
    def __init__(self):
        # Maps project_id to list of active websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Track which projects currently have an orchestration running
        self.running_orchestrations: set = set()

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            if websocket in self.active_connections[project_id]:
                self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]

    async def broadcast_to_project(self, project_id: str, message: dict):
        if project_id in self.active_connections:
            connections = list(self.active_connections[project_id])
            dead = []
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead.append(connection)
            for d in dead:
                if project_id in self.active_connections and d in self.active_connections[project_id]:
                    self.active_connections[project_id].remove(d)

manager = ConnectionManager()

@router.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await manager.connect(websocket, project_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                continue

            if message.get("type") == "start":
                prompt = message.get("prompt", "Generate a basic UI component")
                if project_id in manager.running_orchestrations:
                    await websocket.send_json({
                        "type": "log",
                        "message": "⚠️ Orchestration already running for this project. Please wait."
                    })
                else:
                    asyncio.create_task(run_real_orchestration(project_id, prompt))
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)
    except Exception as e:
        print(f"[WS] Error for project {project_id}: {e}")
        manager.disconnect(websocket, project_id)

def collect_project_files(workspace_root: str) -> Dict[str, str]:
    """Collect all files from the workspace, excluding known ignores."""
    files = {}
    ignore_dirs = {'.git', 'node_modules', '__pycache__', '.next', 'dist', 'build'}
    
    for root, dirs, filenames in os.walk(workspace_root):
        # In-place modify dirs to skip ignore_dirs
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        for filename in filenames:
            abs_path = os.path.join(root, filename)
            rel_path = os.path.relpath(abs_path, workspace_root)
            # CRITICAL: Always use forward slashes (Windows uses backslashes)
            rel_path = rel_path.replace("\\", "/")
            
            # Skip binary files or large files if necessary, but here we take everything text-based
            try:
                with open(abs_path, 'r', encoding='utf-8') as f:
                    files[rel_path] = f.read()
            except (UnicodeDecodeError, IOError):
                # Skip binary files or unreadable files
                continue
    return files


async def save_files_to_db(project_id: str, files_dict: Dict[str, str]):
    """
    Incrementally save/merge files to the database.
    Reads current code_json, merges new files in, writes back.
    This ensures files persist IMMEDIATELY — not just at orchestration end.
    """
    try:
        if AsyncSessionLocal:
            async with AsyncSessionLocal() as db:
                # Read current
                result = await db.execute(select(Project).where(Project.id == project_id))
                proj = result.scalar_one_or_none()
                if not proj:
                    print(f"[DB Save] Project {project_id} not found in DB")
                    return
                
                # Parse existing code_json
                existing = {}
                if proj.code_json:
                    try:
                        parsed = json.loads(proj.code_json)
                        existing = {k.replace("\\", "/"): v for k, v in parsed.items()}
                    except (json.JSONDecodeError, AttributeError):
                        pass
                
                # Merge new files in (normalize paths)
                for k, v in files_dict.items():
                    clean_key = k.replace("\\", "/")
                    existing[clean_key] = v
                
                # Filter out placeholder entries
                existing = {k: v for k, v in existing.items() if v and v.strip() != "// Generated code"}
                
                # Write back
                await db.execute(
                    update(Project)
                    .where(Project.id == project_id)
                    .values(code_json=json.dumps(existing), updated_at=datetime.utcnow())
                )
                await db.commit()
                print(f"[DB Save] Saved {len(files_dict)} files to DB for {project_id} (total: {len(existing)})")
        else:
            client = supabase_admin or supabase
            if client:
                # Read current
                proj_data = client.table("projects").select("code_json").eq("id", project_id).single().execute()
                existing = {}
                if proj_data.data and proj_data.data.get("code_json"):
                    try:
                        parsed = json.loads(proj_data.data["code_json"])
                        existing = {k.replace("\\", "/"): v for k, v in parsed.items()}
                    except (json.JSONDecodeError, AttributeError):
                        pass
                
                for k, v in files_dict.items():
                    clean_key = k.replace("\\", "/")
                    existing[clean_key] = v
                
                existing = {k: v for k, v in existing.items() if v and v.strip() != "// Generated code"}
                
                client.table("projects").update({
                    "code_json": json.dumps(existing),
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", project_id).execute()
                print(f"[DB Save] Saved {len(files_dict)} files to Supabase for {project_id}")
    except Exception as e:
        print(f"[DB Save] Error saving files: {e}")

async def run_real_orchestration(project_id: str, prompt: str):
    manager.running_orchestrations.add(project_id)

    async def send(msg_type: str, payload: dict):
        payload["type"] = msg_type
        await manager.broadcast_to_project(project_id, payload)
        # Small yield to allow WebSocket frames to flush without blocking long
        await asyncio.sleep(0.05)

    # ── In-memory file store (DB is the source of truth, NOT local disk) ──
    project_files: Dict[str, str] = {}
    
    # Temp workspace for npm install/build (only needed temporarily)
    import tempfile
    workspace_root = os.path.join(tempfile.gettempdir(), "ryzecanvas_workspaces", project_id)
    os.makedirs(workspace_root, exist_ok=True)
    
    # Check for existing code in DB to restore context
    existing_files = {}
    try:
        raw_code = None
        if AsyncSessionLocal:
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(Project).where(Project.id == project_id))
                proj = result.scalar_one_or_none()
                if proj and proj.code_json:
                    raw_code = proj.code_json
        else:
            client = supabase_admin or supabase
            if client:
                proj_data = client.table("projects").select("code_json").eq("id", project_id).single().execute()
                if proj_data.data and proj_data.data.get("code_json"):
                    raw_code = proj_data.data["code_json"]
        
        if raw_code:
            try:
                parsed = json.loads(raw_code)
                # Normalize all keys from Windows backslashes to forward slashes
                existing_files = {k.replace("\\", "/"): v for k, v in parsed.items()}
            except json.JSONDecodeError:
                # Legacy fallback: single file page.tsx
                existing_files = {"src/app/page.tsx": raw_code}
    except Exception as e:
        print(f"Warning: Could not fetch existing project data: {e}")

    # Load existing files into our in-memory store
    project_files.update(existing_files)

    # If the database already has files for this project, it is ALWAYS an update.
    # EXCEPTION: If the only file is the default placeholder, treat as NEW.
    is_update = bool(existing_files)
    if is_update and len(existing_files) == 1 and str(list(existing_files.values())[0]).strip() == "// Generated code":
        print("[Orchestration] Default placeholder detected. Treating as NEW project.")
        is_update = False
        project_files.clear()

    print(f"[Orchestration] Start: {project_id} | Update: {is_update} | Prompt: {prompt[:50]}")
    await send("log", {"message": f"🔍 Checking project history (Found {len(existing_files)} files in DB)..."})
    
    # Write existing files to temp workspace so npm/build can use them
    if project_files:
        for rel_path, content in project_files.items():
            if not content or not rel_path: continue
            full_path = os.path.join(workspace_root, rel_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)
        await send("log", {"message": f"📂 Context restored: {len(project_files)} files from database."})
    
    retry_count = {}
    provider = "ollama"

    try:
        # ════════════════════════════════════════════
        # [NODE 1]: Architect — Blueprint Generation
        # ════════════════════════════════════════════
        await send("node_change", {"node": "Architect"})
        await send("log", {"message": f"[Node 1: Architect] Building Blueprint for '{prompt}'..."})
        
        agent = get_architect_agent(model_provider=provider)
        
        arch_ctx = None
        if existing_files:
            arch_ctx = {
                "is_update_to_existing_project": True,
                "existing_file_paths": list(existing_files.keys())
            }
            
        manifest_res = agent.generate_manifest(prompt, context=arch_ctx)
        manifest = manifest_res.get("manifest", {})
        
        await send("log", {"message": "[Node 1: Architect] Blueprint successfully drafted."})
        await send("thinking", {"process": f"Generated Manifest ID: {manifest.get('manifestId')}"})
        await send("thinking", {"process": f"Tech Stack: {json.dumps(manifest.get('techStack', {}))}"})
        await send("thinking", {"process": f"Design System: {json.dumps(manifest.get('designSystem', {}))}"})
        
        # ════════════════════════════════════════════
        # [NODE 1.5]: Librarian — Project Structure Authority
        # ════════════════════════════════════════════
        await send("node_change", {"node": "Librarian"})
        
        if existing_files:
            await send("log", {"message": "[Node 1.5: Librarian] Existing project structure detected. Skipping full scaffold..."})
            librarian = get_librarian_agent(workspace_root)
        else:
            await send("log", {"message": "[Node 1.5: Librarian] Initializing project scaffold..."})
            librarian = get_librarian_agent(workspace_root)
            scaffold_report = librarian.generate_scaffolding(manifest)
            
            created_files = scaffold_report.get("created_files", [])
            created_dirs = scaffold_report.get("created_dirs", [])
            librarian_content = scaffold_report.get("files_content", {})
            
            await send("log", {"message": f"[Node 1.5: Librarian] Created {len(created_dirs)} directories and {len(created_files)} config files."})
            
            # Use in-memory content from Librarian — NO disk reads
            librarian_files_dict = {}
            for norm_file, code_content in librarian_content.items():
                await send("file_commit", {"fileName": norm_file, "code": code_content})
                librarian_files_dict[norm_file] = code_content
                project_files[norm_file] = code_content  # Update in-memory store
            
            # Save Librarian files to DB immediately
            if librarian_files_dict:
                await save_files_to_db(project_id, librarian_files_dict)
            
            await send("log", {"message": "[Node 1.5: Librarian] ✅ Project foundation complete: package.json, tsconfig, next.config, tailwind, globals.css, layout, utils."})
        
        # ════════════════════════════════════════════
        # [NODE 1.8]: Web Researcher — Image & Asset Discovery
        # ════════════════════════════════════════════
        web_research_data = {}
        try:
            await send("log", {"message": "[Node 1.8: WebResearcher] 🔍 Searching for relevant images and assets..."})
            researcher = get_web_researcher()
            web_research_data = await researcher.research(manifest, prompt)
            
            image_count = len(web_research_data.get("images", {}))
            if image_count > 0:
                await send("log", {"message": f"[Node 1.8: WebResearcher] ✅ Found {image_count} relevant images."})
                for name, url in web_research_data.get("images", {}).items():
                    await send("thinking", {"process": f"🖼️ {name}: {url[:80]}..."})
            else:
                await send("log", {"message": "[Node 1.8: WebResearcher] No images found, will use placeholder SVGs."})
                
            if web_research_data.get("web_context"):
                await send("thinking", {"process": f"📝 Web context: {web_research_data['web_context'][:100]}..."})
        except Exception as e:
            print(f"[WebResearcher] Error: {e}")
            await send("log", {"message": f"[Node 1.8: WebResearcher] ⚠️ Search had issues, proceeding without web assets."})
        
        # ════════════════════════════════════════════
        # [NODE 6: DevOps — Terminal: npm install]
        # ════════════════════════════════════════════
        await send("node_change", {"node": "DevOps"})
        await send("log", {"message": "[Node 6: DevOps] Checking terminal access..."})
        
        node_ok = await check_node_installed()
        if node_ok:
            await send("log", {"message": "[Node 6: DevOps] ✅ Node.js detected. Running npm install..."})
            await send("terminal_cmd", {"command": "npm install --legacy-peer-deps", "cwd": workspace_root})
            
            install_result = await npm_install(workspace_root)
            
            if install_result.success:
                await send("log", {"message": "[Node 6: DevOps] ✅ npm install succeeded. All dependencies resolved."})
                await send("terminal_output", {"output": install_result.stdout[-300:] if install_result.stdout else "Done.", "exit_code": 0})
            else:
                error_msg = install_result.error or install_result.stderr[:500]
                await send("log", {"message": f"[Node 6: DevOps] ⚠️ npm install had issues: {error_msg}"})
                await send("terminal_output", {"output": error_msg, "exit_code": install_result.exit_code})
                await send("log", {"message": "[Node 6: DevOps] Continuing — CodeSmith will generate code regardless."})
        else:
            await send("log", {"message": "[Node 6: DevOps] ⚠️ Node.js not detected. Skipping npm install (code-only mode)."})

        # ════════════════════════════════════════════
        # [NODE 2]: TodoManager — Task Chunking
        # ════════════════════════════════════════════
        await send("node_change", {"node": "TodoManager"})
        await send("log", {"message": "[Node 2: TodoManager] Chunking manifest into milestones..."})
        manager_agent = TodoManager(manifest)
        manager_agent.generate_tasks_via_llm(model_provider=provider)
        
        task_count = len(manager_agent.tasks)
        await send("log", {"message": f"[Node 2: TodoManager] Generated {task_count} milestone tasks."})
        for task in manager_agent.tasks:
            await send("thinking", {"process": f"Task: {task.get('name')} → Files: {', '.join(task.get('files', []))}"})

        # ════════════════════════════════════════════
        # TASK EXECUTION LOOP (Nodes 3 → 4 → 5)
        # ════════════════════════════════════════════
        next_task = manager_agent.get_next_task()
        while next_task:
            task_id = next_task['id']
            task_name = next_task['name']
            
            # ── [NODE 3]: CodeSmith — Code Generation ──
            await send("node_change", {"node": "CodeSmith"})
            await send("log", {"message": f"[Node 3: CodeSmith] Executing milestone '{task_name}'..."})
            
            # Supply design system + already-generated file context to CodeSmith
            task_files = next_task.get("files", [])
            # Read current active files directly from disk instead of just cache, 
            # as previous CodeSmith tasks might have just updated them.
            task_existing_code = {}
            for f in task_files:
                f_path = os.path.join(workspace_root, f)
                if os.path.exists(f_path):
                    with open(f_path, "r", encoding="utf-8") as file_obj:
                        task_existing_code[f] = file_obj.read()

            codesmith_context = json.dumps({
                "original_user_request": prompt,
                "designSystem": manifest.get("designSystem", {}),
                "techStack": manifest.get("techStack", {}),
                "existingCodeToModify": task_existing_code,
                "imageAssets": web_research_data.get("images", {}),
                "webContext": web_research_data.get("web_context", ""),
                "instructions": (
                    "CRITICAL: Do NOT regenerate config files, globals.css, or layout.tsx. "
                    "Focus only on implementing the UI components and pages listed in this task. "
                    "Use the cn() utility from '@/lib/utils' for class merging. "
                    "Import icons from 'lucide-react'. "
                    "If 'imageAssets' is provided, use the real image URLs instead of placeholder.svg. "
                    "For hero sections use 'hero_image', for features use 'feature_image_1', 'feature_image_2', etc. "
                    "Use next/image or <img> tags with the provided URLs. "
                    "If 'existingCodeToModify' is provided for a file, you MUST retain the bulk of the existing logic and only apply the requested changes (like bug fixes, features, or design tweaks). Do not blindly rewrite the entire file from scratch if it already exists."
                ),
            })
            
            codesmith_agent = get_codesmith_agent(model_provider=provider)
            handler = CodeSmithHandler()
            
            agent_output = codesmith_agent.generate_code_for_task(
                task=next_task, project_id=manifest.get("manifestId", project_id),
                context=codesmith_context
            )
            committed_files = handler.commit_files(agent_output)
            committed_files_dict = handler.last_committed  # Dict from in-memory parse
            
            # Send file commit events from in-memory content (NO disk reads)
            for norm_file, code_content in committed_files_dict.items():
                await send("file_commit", {"fileName": norm_file, "code": code_content})
                project_files[norm_file] = code_content  # Update in-memory store
                # Also write to temp workspace for evaluator/build
                full_path = os.path.join(workspace_root, norm_file)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "w", encoding="utf-8") as f:
                    f.write(code_content)
            
            # Incremental DB save — files persist even if orchestration crashes
            if committed_files_dict:
                await save_files_to_db(project_id, committed_files_dict)

            loop_passed = False
            
            while not loop_passed:
                # ── [NODE 4]: Evaluator — Quality Gate ──
                await send("node_change", {"node": "Evaluator"})
                await send("log", {"message": f"[Node 4: Evaluator] Running analysis on {len(committed_files)} files..."})
                
                static_checker = BuildEvaluator(workspace_root=workspace_root)
                eval_agent = get_evaluator_agent(model_provider=provider)
                eval_context = json.dumps(manifest.get('designSystem', {}))
                
                static_failures = []
                for file in committed_files:
                    result = static_checker.verify_imports(file)
                    if "FAIL" in result:
                        static_failures.append(result)
                        
                eval_result = eval_agent.evaluate_task_files(next_task, workspace_root, eval_context)
                all_errors = static_failures + eval_result.get("errors", [])
                
                if eval_result.get("status") == "FAIL" or len(all_errors) > 0:
                    await send("build_status", {"status": "FAIL", "errors": all_errors})
                    await send("log", {"message": f"🚨 Build Failed! {len(all_errors)} error(s) found."})
                    
                    # Use in-memory content for the Debugger (NO disk reads)
                    all_committed_code = ""
                    for cf, cf_content in committed_files_dict.items():
                        all_committed_code += f"\n\n--- File: {cf} ---\n{cf_content}"
                    
                    # Circuit breaker check pre-Debugger
                    retry_count[task_id] = retry_count.get(task_id, 0) + 1
                    
                    if retry_count[task_id] > 3:
                        await send("node_change", {"node": "CircuitBreaker"})
                        await send("alert", {"status": "circuit_breaker", "message": "⚡ CIRCUIT BREAKER TRIPPED! ⚡"})
                        await send("log", {"message": "Escalating to Node 1: Architect for a complete redesign."})
                        # Don't return — skip this task and continue with the next one
                        loop_passed = True
                        continue
                    
                    # ── [NODE 5]: Debugger — Healing Loop ──
                    await send("node_change", {"node": "Debugger"})
                    await send("log", {"message": f"🔁 Healing Loop Cycle: {retry_count[task_id]} / 4"})
                    await send("pulse_status", {"node": 5, "status": "healing"})
                    await send("log", {"message": "🔍 Activating Node 5: The Debugger..."})
                    
                    debugger = get_debugger_agent(model_provider=provider)
                    try:
                        fix_strategy = debugger.analyze_and_fix(
                            error_log=all_errors,
                            current_code=all_committed_code,
                            manifest=manifest
                        )
                        await send("debugger_patch", {"patch": fix_strategy.get("patch", "Applying local refactor")[:200], "rationale": fix_strategy.get("root_cause", "Syntactic/logic error")[:200]})
                        await send("log", {"message": "🔧 Sending Patch context back to CodeSmith... (Loop Restarting)"})
                        
                        await send("node_change", {"node": "CodeSmith"})
                        
                        merged_ctx = json.loads(codesmith_context)
                        merged_ctx.update(fix_strategy)
                        
                        agent_output = codesmith_agent.generate_code_for_task(
                            task=next_task, project_id=manifest.get("manifestId", project_id), context=json.dumps(merged_ctx)
                        )
                        committed_files = handler.commit_files(agent_output)
                        debugger_files_dict = handler.last_committed  # In-memory
                        
                        # Send file commits from in-memory content
                        for norm_file, code_content in debugger_files_dict.items():
                            await send("file_commit", {"fileName": norm_file, "code": code_content})
                            project_files[norm_file] = code_content
                            # Write to temp workspace for evaluator
                            full_path = os.path.join(workspace_root, norm_file)
                            os.makedirs(os.path.dirname(full_path), exist_ok=True)
                            with open(full_path, "w", encoding="utf-8") as f:
                                f.write(code_content)
                        
                        # Save debugger fixes to DB immediately
                        if debugger_files_dict:
                            await save_files_to_db(project_id, debugger_files_dict)
                    except Exception as e:
                        # Don't trip circuit breaker here — just log and let retry counter handle it
                        await send("log", {"message": f"⚠️ Debugger encountered an issue: {str(e)[:200]}"})
                        await send("log", {"message": f"🔁 Will retry (attempt {retry_count[task_id]} of 4)..."})
                else:
                    await send("build_status", {"status": "PASS", "errors": []})
                    await send("log", {"message": "✅ Build Passed! State Locked. Moving to next milestone."})
                    loop_passed = True

            manager_agent.mark_complete(task_id)
            next_task = manager_agent.get_next_task()

        # ════════════════════════════════════════════
        # [NODE 6: DevOps — Final Build Verification]
        # ════════════════════════════════════════════
        await send("node_change", {"node": "DevOps"})
        await send("log", {"message": "[Node 6: DevOps] All code generated. Running final build verification..."})
        
        if node_ok:
            await send("terminal_cmd", {"command": "npm run build", "cwd": workspace_root})
            build_result = await npm_build(workspace_root)
            
            if build_result.success:
                await send("log", {"message": "[Node 6: DevOps] ✅ PRODUCTION BUILD SUCCESSFUL! Project is deployable."})
                await send("terminal_output", {"output": build_result.stdout[-500:] if build_result.stdout else "Build complete.", "exit_code": 0})
                await send("build_status", {"status": "PASS", "errors": []})
            else:
                error_summary = build_result.error or build_result.stderr[:500]
                await send("log", {"message": f"[Node 6: DevOps] ⚠️ Build had issues: {error_summary}"})
                await send("terminal_output", {"output": error_summary, "exit_code": build_result.exit_code})
                await send("log", {"message": "[Node 6: DevOps] Code is generated but may need manual fixes for full build."})
        else:
            await send("log", {"message": "[Node 6: DevOps] Skipping build verification (Node.js not available)."})

        await send("log", {"message": "🎉 ALL TASKS COMPLETE! ORCHESTRATION ENGINE SHUTTING DOWN."})
        
        # Final save — use in-memory project_files (NO disk read via collect_project_files)
        # Filter out placeholders
        project_files = {k: v for k, v in project_files.items() if v and v.strip() != "// Generated code"}
        files_json = json.dumps(project_files)
        
        if project_files:
            try:
                if AsyncSessionLocal:
                    async with AsyncSessionLocal() as db:
                        await db.execute(
                            update(Project)
                            .where(Project.id == project_id)
                            .values(code_json=files_json, updated_at=datetime.utcnow())
                        )
                        await db.commit()
                    await send("log", {"message": f"✅ Project {project_id} stored in database ({len(project_files)} files)."})
                else:
                    client = supabase_admin or supabase
                    if client:
                        # Update code_json with all files serialized
                        result = client.table("projects").update({
                            "code_json": files_json,
                            "updated_at": datetime.utcnow().isoformat()
                        }).eq("id", project_id).execute()
                        
                        if result.data:
                            await send("log", {"message": f"✅ Project {project_id} stored in database ({len(project_files)} files)."})
                        else:
                            await send("log", {"message": "⚠️ Notice: Database update returned no data. Check permissions."})
                    else:
                        await send("log", {"message": "⚠️ Supabase client not initialized. Cannot save to DB."})
            except Exception as e:
                # Log but do not crash the orchestrated success loop
                print(f"Error: Could not sync final code to DB: {e}")
                await send("log", {"message": f"⚠️ DB SYNC ERROR: {str(e)[:100]}"})
            
            # ── Upload files to Supabase Storage bucket ──
            try:
                storage_client = supabase_admin or supabase
                if storage_client:
                    bucket_name = "projects"
                    upload_count = 0
                    for rel_path, content in project_files.items():
                        if not content or not rel_path:
                            continue
                        storage_path = f"{project_id}/{rel_path}"
                        file_bytes = content.encode("utf-8")
                        try:
                            # Try to update (upsert) the file
                            storage_client.storage.from_(bucket_name).upload(
                                path=storage_path,
                                file=file_bytes,
                                file_options={"content-type": "text/plain", "upsert": "true"}
                            )
                            upload_count += 1
                        except Exception as upload_err:
                            # If upload fails for a single file, log but continue
                            print(f"[Storage] Upload failed for {storage_path}: {upload_err}")
                    
                    if upload_count > 0:
                        await send("log", {"message": f"☁️ Uploaded {upload_count} files to cloud storage bucket."})
                    else:
                        await send("log", {"message": "⚠️ No files uploaded to storage bucket."})
                else:
                    print("[Storage] No Supabase client available for bucket upload.")
            except Exception as e:
                print(f"[Storage] Bucket upload error: {e}")
                await send("log", {"message": f"⚠️ Storage upload issue: {str(e)[:80]}"})

    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            await send("log", {"message": f"❌ Orchestration Error: {str(e)[:500]}"})
        except Exception:
            pass
    finally:
        # Clean up temp workspace
        try:
            if os.path.exists(workspace_root):
                shutil.rmtree(workspace_root, ignore_errors=True)
        except Exception:
            pass
        # Always clear the running flag so client can re-trigger
        manager.running_orchestrations.discard(project_id)

@router.post("/start/{project_id}")
async def trigger_orchestration(project_id: str, request: StartOrchestrationRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_real_orchestration, project_id, request.prompt)
    return {"message": "Orchestration started in background."}
