"""
Security utilities for password hashing and JWT token management.
Uses bcrypt for password hashing and python-jose for JWT encoding/decoding.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import jwt
from app.core.config import settings


# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify that a plain password matches the hashed version.

    Args:
        plain_password: The plain text password to verify
        hashed_password: The hashed password to compare against

    Returns:
        True if password matches, False otherwise
    """
    # Bcrypt has a 72-byte limit, so truncate the password before verification
    truncated_password = plain_password[:72]
    return pwd_context.verify(truncated_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password to hash

    Returns:
        Hashed password string
    """
    # Bcrypt has a 72-byte limit, so truncate the password before hashing
    truncated_password = password[:72]
    return pwd_context.hash(truncated_password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary of claims to encode in the token
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return encoded_jwt


def create_reset_token(user_id: int) -> str:
    """Create a password reset JWT token (expires in 15 minutes)."""
    expire = datetime.utcnow() + timedelta(minutes=15)
    return jwt.encode(
        {"sub": str(user_id), "type": "reset", "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def verify_reset_token(token: str) -> Optional[int]:
    """Verify a password reset token and return the user ID, or None if invalid."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "reset":
            return None
        user_id = payload.get("sub")
        return int(user_id) if user_id else None
    except (jwt.JWTError, ValueError):
        return None
