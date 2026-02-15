"""
FastAPI dependencies for database access and authentication.
Supports both HTTP-only cookie auth (preferred) and Bearer token auth (fallback).
"""
from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.security import verify_password, TOKEN_TYPE_ACCESS
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.schemas.token import TokenPayload


# OAuth2 scheme - optional so cookie auth can also work
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session."""
    if not AsyncSessionLocal:
        # If SQLAlchemy is not configured, this dependency will fail.
        # We allow it to be optional for endpoints that support Supabase API.
        yield None
        return

    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def get_supabase():
    """Dependency to get Supabase client."""
    from app.core.supabase import supabase
    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured. Please add SUPABASE_URL and SUPABASE_ANON_KEY."
        )
    return supabase


def _extract_token(request: Request, bearer_token: Optional[str] = None) -> str:
    """
    Extract JWT access token from request.
    Priority: 1) HTTP-only cookie 2) Authorization header
    """
    # 1. Check cookie first (most secure)
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token

    # 2. Fall back to Authorization header
    if bearer_token:
        return bearer_token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    request: Request,
    bearer_token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to get current authenticated user.
    Reads JWT from cookie (preferred) or Authorization header (fallback).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = _extract_token(request, bearer_token)

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if user_id is None:
            raise credentials_exception

        # Only allow access tokens (not refresh tokens)
        if token_type and token_type != TOKEN_TYPE_ACCESS:
            raise credentials_exception

        token_data = TokenPayload(sub=int(user_id))

    except (JWTError, ValueError):
        raise credentials_exception

    # Fetch user from database
    if db is not None:
        result = await db.execute(select(User).where(User.id == token_data.sub))
        user = result.scalar_one_or_none()
    else:
        # Fallback to Supabase API
        from app.core.supabase import supabase
        response = supabase.table("users").select(
            "*").eq("id", token_data.sub).execute()
        if response.data:
            row = response.data[0]
            user = User(
                id=row.get("id"),
                email=row.get("email"),
                hashed_password=row.get("hashed_password", ""),
                full_name=row.get("full_name", ""),
                role=row.get("role", "user"),
                is_active=row.get("is_active", True),
                github_token=row.get("github_token"),
                github_username=row.get("github_username"),
            )
            if row.get("created_at"):
                try:
                    from datetime import datetime
                    user.created_at = datetime.fromisoformat(
                        str(row["created_at"]).replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    pass
        else:
            user = None

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency to ensure current user is an admin."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin access required.",
        )
    return current_user
