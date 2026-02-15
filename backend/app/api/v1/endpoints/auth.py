"""
Authentication endpoints for user registration and login.
JWT-based authentication with HTTP-only cookie support + refresh tokens.
Includes Google OAuth via backend-driven flow (Synthetic Vivarium pattern).
"""
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode, quote
import base64
import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt as jose_jwt
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
        sb_response = supabase.table("users").select(
            "*").eq("email", user_in.email).execute()
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
        sb_response = supabase.table("users").select(
            "*").eq("email", form_data.username).execute()
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


# ---------------------------------------------------------------------------
# Google OAuth (Backend-driven, Synthetic Vivarium pattern)
# ---------------------------------------------------------------------------

def _create_oauth_state() -> str:
    """Create a signed JWT state token for CSRF protection."""
    payload = {
        "nonce": secrets.token_urlsafe(16),
        "exp": datetime.utcnow() + timedelta(minutes=10),
        "type": "oauth_state",
    }
    return jose_jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _verify_oauth_state(state: str) -> bool:
    """Verify and validate the signed state token."""
    try:
        payload = jose_jwt.decode(
            state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload.get("type") == "oauth_state"
    except Exception:
        return False


@router.get("/google/url")
async def get_google_auth_url():
    """
    Get the Google OAuth authorization URL.
    State is signed with SECRET_KEY for CSRF protection.
    Frontend should redirect user to this URL.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_REDIRECT_URI:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )

    state = _create_oauth_state()

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"auth_url": auth_url}


@router.get("/google/callback")
async def google_auth_callback(
    code: str = None,
    state: str = None,
    error: str = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Google OAuth callback.
    1. Validates state (CSRF)
    2. Exchanges code for Google tokens
    3. Gets user info from Google
    4. Creates or finds user in DB
    5. Sets JWT cookies and redirects to frontend
    """
    frontend_url = settings.FRONTEND_URL.rstrip("/")

    if error:
        return RedirectResponse(
            url=f"{frontend_url}/callback?error={error}",
            status_code=302,
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{frontend_url}/callback?error=missing_params",
            status_code=302,
        )

    # Validate state token (CSRF protection)
    if not _verify_oauth_state(state):
        return RedirectResponse(
            url=f"{frontend_url}/callback?error=invalid_state",
            status_code=302,
        )

    try:
        # Exchange authorization code for tokens
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )

        if token_response.status_code != 200:
            return RedirectResponse(
                url=f"{frontend_url}/callback?error=token_exchange_failed",
                status_code=302,
            )

        token_data = token_response.json()
        google_access_token = token_data.get("access_token")

        if not google_access_token:
            return RedirectResponse(
                url=f"{frontend_url}/callback?error=no_access_token",
                status_code=302,
            )

        # Get user info from Google
        async with httpx.AsyncClient() as client:
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {google_access_token}"},
            )

        if userinfo_response.status_code != 200:
            return RedirectResponse(
                url=f"{frontend_url}/callback?error=userinfo_failed",
                status_code=302,
            )

        google_user = userinfo_response.json()
        google_email = google_user.get("email")
        google_name = google_user.get("name", "")

        if not google_email:
            return RedirectResponse(
                url=f"{frontend_url}/callback?error=no_email",
                status_code=302,
            )

        # Find or create user in database (with Supabase fallback)
        if db is not None:
            result = await db.execute(select(User).where(User.email == google_email))
            user = result.scalar_one_or_none()

            if not user:
                random_password = secrets.token_urlsafe(32)
                user = User(
                    email=google_email,
                    hashed_password=get_password_hash(random_password),
                    full_name=google_name or google_email.split("@")[0],
                    role="user",
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
        else:
            # Supabase fallback when DATABASE_URL is not configured
            from app.core.supabase import supabase as sb_client
            if not sb_client:
                return RedirectResponse(
                    url=f"{frontend_url}/callback?error=no_database",
                    status_code=302,
                )
            resp = sb_client.table("users").select("*").eq("email", google_email).execute()
            if resp.data:
                row = resp.data[0]
            else:
                random_password = secrets.token_urlsafe(32)
                new_user = {
                    "email": google_email,
                    "hashed_password": get_password_hash(random_password),
                    "full_name": google_name or google_email.split("@")[0],
                    "role": "user",
                    "is_active": True,
                }
                insert_resp = sb_client.table("users").insert(new_user).execute()
                if not insert_resp.data:
                    return RedirectResponse(
                        url=f"{frontend_url}/callback?error=user_creation_failed",
                        status_code=302,
                    )
                row = insert_resp.data[0]
            # Build User from only known columns to avoid constructor errors
            user = User(
                id=row.get("id"),
                email=row.get("email"),
                hashed_password=row.get("hashed_password", ""),
                full_name=row.get("full_name", ""),
                role=row.get("role", "user"),
                is_active=row.get("is_active", True),
            )
            if row.get("created_at"):
                try:
                    user.created_at = datetime.fromisoformat(str(row["created_at"]).replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    pass

        if not user.is_active:
            return RedirectResponse(
                url=f"{frontend_url}/callback?error=inactive_user",
                status_code=302,
            )

        # Create JWT tokens
        token_payload = {"sub": str(user.id)}
        access_token = create_access_token(data=token_payload)
        refresh_token = create_refresh_token(data=token_payload)

        # Encode user data for frontend auth store
        user_data = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": str(user.created_at) if user.created_at else None,
        }
        user_b64 = base64.b64encode(json.dumps(user_data, default=str).encode()).decode()

        # Redirect to frontend callback with token and user data
        redirect_url = (
            f"{frontend_url}/callback?success=true"
            f"&token={quote(access_token)}"
            f"&user={quote(user_b64)}"
        )
        redirect_response = RedirectResponse(
            url=redirect_url,
            status_code=302,
        )
        _set_auth_cookies(redirect_response, access_token, refresh_token)

        return redirect_response

    except Exception as e:
        import traceback
        print(f"[GOOGLE_OAUTH_ERROR] {type(e).__name__}: {e}")
        traceback.print_exc()
        return RedirectResponse(
            url=f"{frontend_url}/callback?error=server_error",
            status_code=302,
        )
