import pytest
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

@pytest.mark.asyncio
async def test_database_connection():
    """Test connection to the configured database."""
    print(f"Testing connection to: {settings.DATABASE_URL}")
    assert settings.DATABASE_URL is not None, "DATABASE_URL is not configured"
    
    engine = create_async_engine(settings.DATABASE_URL)
    try:
        async with engine.connect() as conn:
            # Simple query to verify connection
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))
            print("✅ Connection successful!")
    except Exception as e:
        pytest.fail(f"❌ Database connection failed: {e}")
    finally:
        await engine.dispose()

