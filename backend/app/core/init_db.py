"""
Database initialization script.
Creates tables and default admin user if database is empty.
"""
import asyncio
import traceback
from sqlalchemy import select, text
from app.db.session import engine, AsyncSessionLocal
from app.db.base import Base, User, Project, Chat
from app.core.security import get_password_hash


async def init_db():
    """
    Initialize database with tables and default data.
    Creates an admin user if no users exist.
    """
    if engine is None:
        print("[WARN] Skipping database initialization: DATABASE_URL not configured.")
        return

    # Create all tables
    async with engine.connect() as conn:
        try:
            curr_user = await conn.execute(text("SELECT current_user"))
            search_path = await conn.execute(text("SHOW search_path"))
            print(
                f"[DB] Debug: User={curr_user.fetchone()[0]}, Path={search_path.fetchone()[0]}")
        except Exception as e:
            print(f"[DB] Optional postgres check failed (expected if using SQLite): {e}")

    print(f"[DB] Creating tables for: {list(Base.metadata.tables.keys())}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Tables created (or already existed).")

    # Check if we need to create default admin
    async with AsyncSessionLocal() as session:
        try:
            # Use raw SQL to avoid metadata issues if tables were just created
            result = await session.execute(text("SELECT email FROM users LIMIT 1"))
            existing_user = result.fetchone()

            if not existing_user:
                # Create default admin user
                admin_user = User(
                    email="admin@ryze.ai",
                    hashed_password=get_password_hash("admin123"),
                    full_name="Admin User",
                    role="admin",
                    is_active=True
                )

                session.add(admin_user)
                await session.commit()

                print("[OK] Database initialized successfully!")
                print("[AUTH] Default admin user created:")
                print("   Email: admin@ryze.ai")
                print("   Password: admin123")
                print("   [WARN] Please change the password after first login!")
            else:
                print("[OK] Database already initialized.")
        except Exception as e:
            print(f"[ERROR] Database initialization failed error: {e}")
            traceback.print_exc()
            raise e


if __name__ == "__main__":
    asyncio.run(init_db())
