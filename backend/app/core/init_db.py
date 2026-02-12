"""
Database initialization script.
Creates tables and default admin user if database is empty.
"""
import asyncio
from sqlalchemy import select
from app.db.session import engine, AsyncSessionLocal
from app.db.base import Base, User, Project
from app.core.security import get_password_hash


async def init_db():
    """
    Initialize database with tables and default data.
    Creates an admin user if no users exist.
    """
    if engine is None:
        print("⚠️  Skipping database initialization: DATABASE_URL not configured.")
        return
        
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Check if we need to create default admin
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User))
        existing_users = result.scalars().all()
        
        if not existing_users:
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
            
            print("✅ Database initialized successfully!")
            print("🔑 Default admin user created:")
            print("   Email: admin@ryze.ai")
            print("   Password: admin123")
            print("   ⚠️  Please change the password after first login!")
        else:
            print("✅ Database already initialized.")


if __name__ == "__main__":
    asyncio.run(init_db())
