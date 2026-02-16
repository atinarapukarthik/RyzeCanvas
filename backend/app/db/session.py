"""
Database session management for async SQLAlchemy.
Provides the async engine and session factory.
"""
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings


# Create async engine and session factory if DATABASE_URL is configured
engine = None
AsyncSessionLocal = None

if settings.DATABASE_URL:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=True,  # Set to False in production
        future=True
    )

    # Session factory
    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )
else:
    print("[WARN] DATABASE_URL is not configured. Direct Postgres connection is disabled.")
    print("Application will attempt to use Supabase API if configured.")

# Base class for declarative models
Base = declarative_base()


async def get_db() -> AsyncSession:
    """
    Dependency function to get database session.
    Yields a session and ensures it's closed after use.
    """
    if not AsyncSessionLocal:
        raise HTTPException(
            status_code=503,
            detail="SQLAlchemy Database is not configured. Direct Postgres connection required for this endpoint."
        )
        
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
