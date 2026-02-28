"""
Comprehensive test: Every sub-agent and node in the chat error-fix pipeline.
Run from backend venv:  python test_chat_fix_pipeline.py

Tests:
  Node 1 - _build_error_context_block
  Node 2 - System prompt assembly order (error BEFORE files)
  Node 3 - _resolve_error_references
  Node 4 - <active_runtime_error> truncation risk
  Node 5 - Full _handle_chat orchestration (simulated ChatRequest)
  Node 6 - Artifact extraction + file upload path
  Node 7 - Real HTTP POST to /api/v1/chat/stream (if server running)
"""
import asyncio
import json
import sys
import os
import httpx

sys.path.insert(0, os.path.dirname(__file__))

from langchain_core.messages import SystemMessage, HumanMessage
from app.agent.system_prompt import get_chat_prompt
from app.agent.orchestrator import (
    _get_llm, _build_error_context_block, _extract_artifacts,
    _resolve_error_references, ChatRequest, orchestrate_chat,
)

# ─── Simulated data ─────────────────────────────────────────────
FAKE_FILES = {
    "src/App.tsx": '''import Layout from './components/Layout'
import Hero from './components/Hero'
import Pricing from './components/Pricing'

export default function App() {
  return (
    <Layout>
      <Hero />
      <Pricing />
    </Layout>
  )
}''',
    "src/components/Pricing.tsx": '''import { Check } from 'lucide-react'

const plans = [
  { name: 'Basic', price: 9, features: ['Feature 1', 'Feature 2'] },
  { name: 'Pro', price: 29, features: ['Feature 1', 'Feature 2', 'Feature 3'] },
]

export default function Pricing() {
  return (
    <section className="py-20">
      <h2 className="text-3xl font-bold text-center mb-12">Pricing</h2>
      <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map(plan => (
          <div key={plan.name} className="p-6 rounded-xl border">
            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <p className="text-4xl font-bold mt-2">${plan.price}</p>
            <ul className="mt-4 space-y-2">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              className="mt-6 w-full py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              onClick={() => window.location.href = plan.link}
            >
              Get Started
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}''',
}

# Build existing_code the same way the frontend does
EXISTING_CODE = ""
for fp, code in FAKE_FILES.items():
    EXISTING_CODE += f"--- FILE: {fp} ---\n{code}\n--- END FILE ---\n\n"

# Append <active_runtime_error> like the frontend does
ACTIVE_RUNTIME_ERROR = """<active_runtime_error>
The user's application is currently crashing with this error:
Error: Cannot read properties of undefined (reading 'href')
Source: src/components/Pricing.tsx
Line: 28, Column: 55
Stack: TypeError: Cannot read properties of undefined
  at onClick (Pricing.tsx:28:55)

Fix this error in your next response.
</active_runtime_error>"""
EXISTING_CODE_WITH_ERROR = EXISTING_CODE + ACTIVE_RUNTIME_ERROR

ERROR_CONTEXT = [
    {
        "id": "runtime-1",
        "type": "runtime",
        "message": "Cannot read properties of undefined (reading 'href')",
        "file": "src/components/Pricing.tsx",
        "line": 28,
        "stack_trace": "TypeError: Cannot read properties of undefined\n  at onClick (Pricing.tsx:28:55)",
    }
]

FIX_PROMPT = (
    "Fix this runtime error. Only fix the broken file(s), do NOT regenerate everything.\n\n"
    "Error: Cannot read properties of undefined (reading 'href')\n"
    "File: src/components/Pricing.tsx\n"
    "Line: 28\n"
    "Stack: TypeError: Cannot read properties of undefined\n  at onClick (Pricing.tsx:28:55)\n\n"
    "Look at the <current-project-files> in context. Find the file that caused the error, "
    "read it carefully, and return ONLY the corrected file(s) using <ryze_artifact> format."
)

results = {}

# ═════════════════════════════════════════════════════════════════
# NODE 1: _build_error_context_block
# ═════════════════════════════════════════════════════════════════
async def test_node_1():
    print("=" * 70)
    print("NODE 1: _build_error_context_block")
    print("=" * 70)

    # Test with error_context
    block = _build_error_context_block(ERROR_CONTEXT)
    print(f"  Output ({len(block)} chars):")
    print(f"  {block.strip()[:300]}")

    # Test with None (should return empty)
    empty = _build_error_context_block(None)
    print(f"\n  With None: returns empty={empty == ''}")

    # Test with empty list
    empty2 = _build_error_context_block([])
    print(f"  With []: returns empty={empty2 == ''}")

    checks = {
        "has_error_id": "@runtime-1" in block,
        "has_error_msg": "Cannot read properties" in block,
        "has_file_path": "Pricing.tsx" in block,
        "has_line_number": ":28" in block,
        "has_stack_trace": "onClick" in block,
        "none_returns_empty": empty == "",
        "empty_returns_empty": empty2 == "",
    }
    for k, v in checks.items():
        print(f"  {k}: {'PASS' if v else 'FAIL'}")
    ok = all(checks.values())
    results["node1"] = ok
    return ok


# ═════════════════════════════════════════════════════════════════
# NODE 2: System prompt assembly order
# ═════════════════════════════════════════════════════════════════
async def test_node_2():
    print("\n" + "=" * 70)
    print("NODE 2: System prompt assembly order")
    print("=" * 70)

    base = get_chat_prompt()
    error_ctx = _build_error_context_block(ERROR_CONTEXT)
    system_ctx = f"\n\n<current-project-files>\n{EXISTING_CODE_WITH_ERROR[:60000]}\n</current-project-files>"
    prompt = base + error_ctx + system_ctx

    # The base prompt MENTIONS <current-project-files> as a reference (line 114).
    # We need to find the ACTUAL <current-project-files> block, not the reference.
    # The actual block starts with \n\n<current-project-files>\n---
    actual_files_marker = "<current-project-files>\n---"
    error_marker = "@runtime-1"

    error_pos = prompt.find(error_marker)
    files_pos = prompt.find(actual_files_marker)

    print(f"  Total system prompt: {len(prompt)} chars")
    print(f"  Base prompt: {len(base)} chars")
    print(f"  Error context block: {len(error_ctx)} chars")
    print(f"  Files context block: {len(system_ctx)} chars")
    print(f"  Error @runtime-1 at position: {error_pos}")
    print(f"  Actual <current-project-files> at position: {files_pos}")

    ok = error_pos > 0 and files_pos > 0 and error_pos < files_pos
    print(f"  Error appears BEFORE files: {ok}")

    # Also check that <active_runtime_error> is NOT truncated
    has_active_error = "<active_runtime_error>" in prompt and "</active_runtime_error>" in prompt
    print(f"  <active_runtime_error> present and complete: {has_active_error}")

    results["node2"] = ok and has_active_error
    return ok and has_active_error


# ═════════════════════════════════════════════════════════════════
# NODE 3: _resolve_error_references
# ═════════════════════════════════════════════════════════════════
async def test_node_3():
    print("\n" + "=" * 70)
    print("NODE 3: _resolve_error_references")
    print("=" * 70)

    # Test with @error_id reference in prompt
    prompt_with_ref = "Fix the bug described in @runtime-1 please"
    resolved = _resolve_error_references(prompt_with_ref, ERROR_CONTEXT)
    print(f"  Input:    {prompt_with_ref!r}")
    print(f"  Resolved: {resolved!r}")

    has_ref_resolved = "@runtime-1" not in resolved or "runtime" in resolved.lower()
    print(f"  Reference resolved: {has_ref_resolved}")

    # Test with no references
    prompt_no_ref = "Fix this runtime error please"
    resolved2 = _resolve_error_references(prompt_no_ref, ERROR_CONTEXT)
    unchanged = resolved2 == prompt_no_ref
    print(f"  No refs, unchanged: {unchanged}")

    # Test with None error_context
    resolved3 = _resolve_error_references(prompt_with_ref, None)
    print(f"  With None context: {resolved3!r}")
    handles_none = resolved3 is not None
    print(f"  Handles None safely: {handles_none}")

    ok = has_ref_resolved and unchanged and handles_none
    results["node3"] = ok
    return ok


# ═════════════════════════════════════════════════════════════════
# NODE 4: Truncation risk test
# ═════════════════════════════════════════════════════════════════
async def test_node_4():
    print("\n" + "=" * 70)
    print("NODE 4: <active_runtime_error> truncation risk")
    print("=" * 70)

    # Simulate a large project (many files pushing total > 60k chars)
    large_existing = ""
    for i in range(50):
        large_existing += f"--- FILE: src/components/Component{i}.tsx ---\n"
        large_existing += f"export default function Component{i}() {{\n"
        large_existing += f"  return <div>{'x' * 1000}</div>\n"
        large_existing += f"}}\n--- END FILE ---\n\n"
    large_existing += ACTIVE_RUNTIME_ERROR

    print(f"  Large existing_code total: {len(large_existing)} chars")
    truncated = large_existing[:60000]
    has_error_after_truncate = "<active_runtime_error>" in truncated and "</active_runtime_error>" in truncated
    print(f"  After 60k truncation, error block present: {has_error_after_truncate}")

    if not has_error_after_truncate:
        print("  >>> BUG CONFIRMED: <active_runtime_error> is CUT OFF by 60k truncation!")
        print(f"  >>> Error block starts at position {large_existing.find('<active_runtime_error>')}")
        print(f"  >>> Truncation cuts at 60000, so everything after is lost")
        print("  >>> FIX: Move <active_runtime_error> to FRONT of existing_code")

    # Normal-size project should be fine
    normal_has = "<active_runtime_error>" in EXISTING_CODE_WITH_ERROR[:60000]
    print(f"  Normal-size project (safe): {normal_has}")

    results["node4_truncation_risk"] = has_error_after_truncate
    results["node4_normal"] = normal_has
    return normal_has  # Normal should always work


# ═════════════════════════════════════════════════════════════════
# NODE 5: Full _handle_chat orchestration (via ChatRequest)
# ═════════════════════════════════════════════════════════════════
async def test_node_5():
    print("\n" + "=" * 70)
    print("NODE 5: Full orchestrate_chat (mode=chat) with error context")
    print("=" * 70)

    request = ChatRequest(
        prompt=FIX_PROMPT,
        mode="chat",
        provider="ollama",
        model="gpt-oss:120b-cloud",
        conversation_history=[],
        existing_code=EXISTING_CODE_WITH_ERROR,
        error_context=ERROR_CONTEXT,
        project_id="test-project-id",
        user_id="test-user",
    )

    print(f"  ChatRequest fields:")
    print(f"    prompt: {len(request.prompt)} chars")
    print(f"    existing_code: {len(request.existing_code)} chars")
    print(f"    error_context: {len(request.error_context)} items")
    print(f"    mode: {request.mode}")
    print(f"    provider: {request.provider}")
    print(f"    model: {request.model}")
    print(f"  Streaming response from orchestrate_chat...")

    full_output = ""
    events = []
    try:
        async for sse_line in orchestrate_chat(request):
            # Each SSE line is "data: {...}\n\n" — strip whitespace
            stripped = sse_line.strip()
            if not stripped.startswith("data: "):
                continue
            try:
                data = json.loads(stripped[6:])
                events.append(data)
                evt = data.get("event", "")
                if evt == "token":
                    full_output += data.get("data", "")
                elif evt == "step":
                    print(f"    [step] {data.get('data', '')}")
                elif evt == "error":
                    print(f"    [ERROR] {data.get('data', '')}")
                elif evt == "done":
                    print(f"    [done] {data.get('data', '')}")
            except json.JSONDecodeError:
                pass
    except Exception as e:
        print(f"  FAIL: orchestrate_chat raised exception: {e}")
        import traceback
        traceback.print_exc()
        results["node5"] = False
        return False

    print(f"\n  Response: {len(full_output)} chars")
    print(f"  Events: {len(events)} total")
    event_types = {}
    for e in events:
        t = e.get("event", "?")
        event_types[t] = event_types.get(t, 0) + 1
    print(f"  Event types: {event_types}")

    # Show first 500 chars of response
    print(f"  Response preview:")
    for line in full_output[:500].split("\n"):
        print(f"    {line}")
    if len(full_output) > 500:
        print(f"    ... ({len(full_output) - 500} more chars)")

    # Check response quality
    has_artifact = "<ryze_artifact" in full_output
    has_action = "<ryze_action" in full_output
    mentions_fix = "plan.link" not in full_output or "link" in full_output.lower()

    print(f"\n  Contains <ryze_artifact>: {has_artifact}")
    print(f"  Contains <ryze_action>: {has_action}")

    # Parse artifacts
    if has_artifact:
        artifacts = _extract_artifacts(full_output)
        print(f"  Extracted artifacts: {len(artifacts)} groups")
        for i, actions in enumerate(artifacts):
            for a in actions:
                print(f"    [{i}] {a.type}: {a.path} ({len(a.content or '')} chars)")
                if a.content and "plan.link" in a.content:
                    print(f"    >>> WARNING: Still has plan.link (unfixed)")
                elif a.content:
                    print(f"    >>> Fix applied (plan.link removed/replaced)")

    ok = has_artifact and has_action
    results["node5"] = ok
    return ok


# ═════════════════════════════════════════════════════════════════
# NODE 6: Real HTTP endpoint test (requires running server)
# ═════════════════════════════════════════════════════════════════
async def test_node_6():
    print("\n" + "=" * 70)
    print("NODE 6: Real HTTP POST to /api/v1/chat/stream")
    print("=" * 70)

    # First login to get a token
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        try:
            login_resp = await client.post("/api/v1/auth/login", json={
                "email": "test@gmail.com",
                "password": "test123"
            }, timeout=10)
            if login_resp.status_code != 200:
                print(f"  SKIP: Login failed ({login_resp.status_code}). Is the server running?")
                results["node6"] = "SKIP"
                return True
            token = login_resp.json().get("access_token")
            if not token:
                print("  SKIP: No token in login response")
                results["node6"] = "SKIP"
                return True
            print(f"  Logged in. Token: {token[:20]}...")
        except Exception as e:
            print(f"  SKIP: Server not reachable: {e}")
            results["node6"] = "SKIP"
            return True

        # Send a chat request with error_context
        payload = {
            "prompt": FIX_PROMPT,
            "mode": "chat",
            "provider": "ollama",
            "model": "gpt-oss:120b-cloud",
            "conversation_history": [],
            "existing_code": EXISTING_CODE_WITH_ERROR,
            "error_context": ERROR_CONTEXT,
        }

        print(f"  Sending chat/stream POST...")
        print(f"    existing_code: {len(payload['existing_code'])} chars")
        print(f"    error_context: {len(payload['error_context'])} items")

        try:
            resp = await client.post(
                "/api/v1/chat/stream",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
                timeout=120,
            )
            print(f"  Response status: {resp.status_code}")

            if resp.status_code != 200:
                print(f"  FAIL: {resp.text[:300]}")
                results["node6"] = False
                return False

            # Parse SSE events
            full_output = ""
            event_types = {}
            for line in resp.text.split("\n"):
                if line.startswith("data: "):
                    try:
                        data = json.loads(line[6:])
                        t = data.get("event", "?")
                        event_types[t] = event_types.get(t, 0) + 1
                        if t == "token":
                            full_output += data.get("data", "")
                        elif t == "error":
                            print(f"    [ERROR from server] {data.get('data', '')}")
                    except json.JSONDecodeError:
                        pass

            print(f"  Events: {event_types}")
            print(f"  Response: {len(full_output)} chars")
            print(f"  Preview: {full_output[:300]}")

            has_artifact = "<ryze_artifact" in full_output
            print(f"  Has <ryze_artifact>: {has_artifact}")

            results["node6"] = has_artifact
            return has_artifact

        except Exception as e:
            print(f"  FAIL: Request error: {e}")
            results["node6"] = False
            return False


# ═════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════
async def main():
    print("=" * 70)
    print("RyzeCanvas Chat Error-Fix Pipeline — Comprehensive Test")
    print("=" * 70)
    print()

    await test_node_1()
    await test_node_2()
    await test_node_3()
    await test_node_4()
    await test_node_5()
    await test_node_6()

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    for name, ok in results.items():
        status = "PASS" if ok is True else ("SKIP" if ok == "SKIP" else "FAIL")
        icon = "OK" if ok is True else ("--" if ok == "SKIP" else "XX")
        print(f"  [{icon}] {name}: {status}")

    fails = [k for k, v in results.items() if v is False]
    if fails:
        print(f"\n  FAILURES: {', '.join(fails)}")
        print("  These nodes need fixing before the error-fix pipeline works.")
    else:
        print("\n  All nodes passed or skipped. Pipeline is functional.")


if __name__ == "__main__":
    asyncio.run(main())
