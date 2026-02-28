#!/usr/bin/env python
"""Test code generation directly."""

import asyncio
from app.agent.orchestrator import orchestrate_chat, ChatRequest


async def test_generation():
    """Test a simple code generation."""
    request = ChatRequest(
        prompt="create a simple hello world app",
        mode="generate",
        provider="gemini",
        model="gemini-2.0-flash-exp",
        conversation_history=[],
    )

    print("Starting code generation test...")
    print("=" * 60)

    event_count = 0
    try:
        async for event in orchestrate_chat(request):
            event_count += 1
            # Show first 100 chars
            print(f"[Event {event_count}] {event[:100]}...")

            if event_count > 50:  # Safety limit
                print("\n[STOP] Too many events, stopping test")
                break

    except Exception as e:
        print(f"\n[ERROR] {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

    print("=" * 60)
    print(f"Total events received: {event_count}")

if __name__ == "__main__":
    asyncio.run(test_generation())
