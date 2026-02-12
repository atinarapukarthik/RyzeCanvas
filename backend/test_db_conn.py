
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def test_conn():
    print(f"Testing connection to: {settings.DATABASE_URL}")
    if not settings.DATABASE_URL:
        print("Error: DATABASE_URL is None")
        return
    
    engine = create_async_engine(settings.DATABASE_URL)
    try:
        async with engine.connect() as conn:
            print("✅ Connection successful!")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_conn())
