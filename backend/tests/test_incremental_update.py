import asyncio
import json
import uuid
import uuid
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings
from app.api.v1.endpoints.orchestration import router
from fastapi import FastAPI
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket

async def main():
    # We will simulate the orchestration end-to-end using a simple HTTPClient or Websocket to the live server
    import websockets

    # 1. Create a project using the REST API
    import httpx
    
    server_url = "http://localhost:8000/api/v1"
    
    async with httpx.AsyncClient() as client:
        # Create a new dummy project
        data = {
            "name": "Test Update Incremental",
            "description": "Test",
            "code_json": "",
            "is_public": False,
            "provider": "ollama",
            "model": "gpt-oss:120b-cloud"
        }
        res = await client.post(f"{server_url}/projects/", json=data)
        
        if res.status_code != 200:
            print("Failed to create project:", res.text)
            return
            
        project_id = res.json()["id"]
        print(f"✅ Created Project: {project_id}")
        
    ws_uri = f"ws://localhost:8000/api/v1/orchestration/ws/{project_id}"
    
    print(f"Connecting to {ws_uri}")
    try:
        async with websockets.connect(ws_uri) as ws:
            print("Connected! Sending initial prompt: 'Create a simple landing page with a hero section'")
            start_payload = {
                "type": "start",
                "prompt": "Create a simple landing page with a hero section"
            }
            await ws.send(json.dumps(start_payload))
            
            # Read messages until we see "ALL TASKS COMPLETE"
            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                if data.get("type") == "log":
                    print("[LOG]", data.get("message"))
                    if "ALL TASKS COMPLETE" in data.get("message", ""):
                        print("✅ First phase completed.")
                        break
                        
            print("-" * 50)
            print("Sending UPDATE prompt: 'Add a dark mode toggle to the top right of the hero section'")
            
            update_payload = {
                "type": "start",
                "prompt": "Add a dark mode toggle to the top right of the hero section"
            }
            await ws.send(json.dumps(update_payload))
            
            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                
                if data.get("type") == "log":
                    print("[LOG]", data.get("message"))
                    if "ALL TASKS COMPLETE" in data.get("message", ""):
                        print("✅ Second phase completed.")
                        break
                        
                elif data.get("type") == "file_commit":
                    print(f"📝 FILE UPDATED: {data.get('fileName')}")
    except Exception as e:
        print("WebSocket exception:", e)

if __name__ == "__main__":
    asyncio.run(main())
