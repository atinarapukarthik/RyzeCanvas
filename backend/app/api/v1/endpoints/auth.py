"""
Authentication endpoints for user registration and login.
JWT-based authentication with HTTP-only cookie support + refresh tokens.
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db, get_current_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
    create_reset_token,
    verify_reset_token,
    TOKEN_TYPE_REFRESH,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.token import Token, ForgotPasswordRequest, ResetPasswordRequest


router = APIRouter()

# Cookie settings
COOKIE_SECURE = settings.FRONTEND_URL.startswith("https")
COOKIE_SAMESITE = "lax"


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Set HTTP-only auth cookies on the response."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth",  # Only sent to auth endpoints
    )


def _clear_auth_cookies(response: Response):
    """Clear auth cookies from the response."""
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/api/v1/auth")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user.

    - **email**: Valid email address (must be unique)
    - **password**: User password (will be hashed)
    - **full_name**: User's full name
    """
    if db is not None:
        result = await db.execute(select(User).where(User.email == user_in.email))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        hashed_password = get_password_hash(user_in.password)
        db_user = User(
            email=user_in.email,
            hashed_password=hashed_password,
            full_name=user_in.full_name,
            role=user_in.role,
        )

        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user
    else:
        # Supabase API Fallback
        from app.core.supabase import supabase
        sb_response = supabase.table("users").select("*").eq("email", user_in.email).execute()
        if sb_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        hashed_password = get_password_hash(user_in.password)
        user_data = {
            "email": user_in.email,
            "hashed_password": hashed_password,
            "full_name": user_in.full_name,
            "role": user_in.role,
        }
        
        insert_resp = supabase.table("users").insert(user_data).execute()
        if not insert_resp.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to register user in Supabase"
            )
            
        return User(**insert_resp.data[0])


@router.post("/login")
async def login(
    response: Response,
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    Login with email/password.
    Sets HTTP-only cookies for access_token and refresh_token.
    Also returns tokens in JSON body for backwards compatibility.
    """
    if db is not None:
        result = await db.execute(select(User).where(User.email == form_data.username))
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        # Supabase API Fallback
        from app.core.supabase import supabase
        sb_response = supabase.table("users").select("*").eq("email", form_data.username).execute()
        if not sb_response.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_data = sb_response.data[0]
        if not verify_password(form_data.password, user_data["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Create a User object (shim)
        user = User(**user_data)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    # Create tokens
    token_data = {"sub": str(user.id)}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    # Set HTTP-only cookies
    _set_auth_cookies(response, access_token, refresh_token)

    # Also return in body for backward compat
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh")
async def refresh_tokens(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh the access token using the refresh token cookie.
    Issues new access + refresh tokens.
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token",
        )

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != TOKEN_TYPE_REFRESH:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    if not user_id:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Verify user still exists and is active
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Issue new token pair
    token_data = {"sub": str(user.id)}
    new_access_token = create_access_token(data=token_data)
    new_refresh_token = create_refresh_token(data=token_data)

    _set_auth_cookies(response, new_access_token, new_refresh_token)

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookies to log the user out."""
    _clear_auth_cookies(response)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current user information. Requires authentication."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_user_me(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile."""
    update_data = user_in.model_dump(exclude_unset=True)

    if "password" in update_data and update_data["password"]:
        hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
        current_user.hashed_password = hashed_password

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return current_user


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request a password reset token. Always returns success to prevent email enumeration."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user:
        token = create_reset_token(user.id)
        return {
            "message": "If an account exists for this email, a reset link has been sent.",
            "reset_token": token,
        }

    return {"message": "If an account exists for this email, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a valid reset token."""
    user_id = verify_reset_token(body.token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.hashed_password = get_password_hash(body.new_password)
    db.add(user)
    await db.commit()

    return {"message": "Password has been reset successfully"}
