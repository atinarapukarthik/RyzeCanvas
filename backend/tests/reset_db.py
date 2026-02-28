"""
Script to drop and recreate database tables with the latest schema.
Useful when the model schema changes.
"""
import asyncio
import sys
from sqlalchemy import text
from app.db.session import engine

async def reset_db():
    """Drop all tables and recreate them."""
    if engine is None:
        print("❌ DATABASE_URL not configured")
        return

    try:
        print("⚠️  Dropping all tables...")
        async with engine.begin() as conn:
            # Drop tables in reverse order of dependencies
            await conn.execute(text("DROP TABLE IF EXISTS projects CASCADE"))
            await conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
        print("✅ Tables dropped.")

        # Now recreate the tables by running init_db
        print("📦 Recreating tables with latest schema...")
        from app.core.init_db import init_db
        await init_db()

        print("✅ Database reset complete!")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(reset_db())
