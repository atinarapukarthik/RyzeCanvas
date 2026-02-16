import asyncio
import os
import logging
from app.agent.orchestrator import _get_llm, _extract_artifacts, RyzeAction
from app.agent.system_prompt import get_generate_plan_prompt, IDENTITY_CORE, ARTIFACT_PROTOCOL
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.config import settings

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TEST_AGENT")

async def test_generation_flow():
    print("\n" + "="*80)
    print("🧪 STARTING ISOLATED AGENT TEST")
    print("="*80)

    # 1. Initialize LLM
    provider = settings.AI_MODEL_PROVIDER
    model = settings.GEMINI_API_KEY and "gemini-2.5-flash" or "gpt-4o"
    if provider == "ollama":
        model = settings.OLLAMA_MODEL
    
    print(f"\n[1] Initializing LLM ({provider}:{model})...")
    try:
        llm = _get_llm(provider, model)
        print("   ✅ LLM Initialized")
    except Exception as e:
        print(f"   ❌ LLM Failed: {e}")
        return

    # 2. Construct Prompt
    print("\n[2] Constructing System Prompt...")
    system_prompt = get_generate_plan_prompt()
    # Mock project context
    project_ctx = "\n<project-files>\nsrc/App.tsx\npackage.json\n</project-files>"
    
    full_system_prompt = system_prompt + project_ctx
    
    user_prompt = "Build a simple calculator component with specific buttons for +"
    
    messages = [
        SystemMessage(content=full_system_prompt),
        HumanMessage(content=user_prompt)
    ]
    print(f"   ✅ System Prompt Length: {len(full_system_prompt)} chars")
    print(f"   ✅ User Prompt: '{user_prompt}'")

    # 3. Invoke LLM
    print("\n[3] Invoking LLM (Streaming)...")
    full_response = ""
    start_time = asyncio.get_event_loop().time()
    
    try:
        async for chunk in llm.astream(messages):
            content = chunk.content if hasattr(chunk, "content") else str(chunk)
            print(content, end="", flush=True)
            full_response += content
            
        duration = asyncio.get_event_loop().time() - start_time
        print(f"\n\n   ✅ Generation Complete ({duration:.2f}s)")
        print(f"   ✅ Total Response Length: {len(full_response)} chars")

    except Exception as e:
        print(f"\n   ❌ Generation Failed: {e}")
        return

    # 4. Extract Artifacts
    print("\n[4] Testing XML Parsing...")
    artifacts = _extract_artifacts(full_response)
    
    if artifacts:
        print(f"   ✅ Found {len(artifacts)} Artifact Blocks")
        for i, artifact in enumerate(artifacts):
            print(f"      🔹 Artifact {i+1}: contains {len(artifact)} actions")
            for action in artifact:
                print(f"         - [{action.type}] {action.path or 'No Path'}")
    else:
        print("   ❌ No Artifacts Found!")
        print("   ⚠️  Possible Raw Output Issue. Check if XML tags are present in [3].")

    print("\n" + "="*80)
    print("🏁 TEST COMPLETE")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(test_generation_flow())
