import os, logging
logging.disable(99)
from supabase import create_client

# We'll just look at the error being triggered by running the exact code
import asyncio
from app.api.v1.endpoints.orchestration import run_real_orchestration

async def test():
    try:
        await run_real_orchestration("3cb8bc9a-d2be-47ce-8b93-2629a0e6f59d", "Build a dashboard ui")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
