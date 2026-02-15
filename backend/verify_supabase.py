import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import sys
import os

# Add the backend directory to sys.path to import app.core.config
sys.path.append(os.getcwd())

async def test_connection():
    try:
        from app.core.config import settings
        print(f"Attempting to connect to: {settings.DATABASE_URL}")
        
        engine = create_async_engine(settings.DATABASE_URL)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            print("\n✅ CONNECTION SUCCESSFUL!")
            print("Successfully connected to Supabase PostgreSQL database.")
            
    except Exception as e:
        print(f"\n❌ CONNECTION FAILED!")
        print(f"Error details: {e}")
        sys.exit(1)
    finally:
        if 'engine' in locals():
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_connection())
