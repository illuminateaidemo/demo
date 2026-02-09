"""
Security utilities: password hashing and JWT token management.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import get_settings

settings = get_settings()

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Return a bcrypt hash of *plain_password*."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return ``True`` if *plain_password* matches *hashed_password*."""
    return pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------


class TokenPayload(BaseModel):
    """Decoded JWT payload."""

    sub: str
    exp: Optional[datetime] = None
    iat: Optional[datetime] = None
    role: Optional[str] = None


def create_access_token(
    subject: str,
    role: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[dict[str, Any]] = None,
) -> str:
    """Create a signed JWT access token.

    Parameters
    ----------
    subject:
        The token ``sub`` claim (typically the user ID or email).
    role:
        Optional user role embedded in the token.
    expires_delta:
        Custom expiration offset; defaults to the configured
        ``ACCESS_TOKEN_EXPIRE_MINUTES``.
    extra_claims:
        Additional key/value pairs to include in the payload.

    Returns
    -------
    str
        Encoded JWT string.
    """
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
    }
    if role is not None:
        payload["role"] = role
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> TokenPayload:
    """Decode and validate a JWT access token.

    Parameters
    ----------
    token:
        The raw JWT string.

    Returns
    -------
    TokenPayload
        Parsed payload.

    Raises
    ------
    JWTError
        If the token is invalid or expired.
    """
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )
    return TokenPayload(**payload)
