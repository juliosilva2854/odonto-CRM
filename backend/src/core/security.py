"""Security primitives — password hashing + JWT encode/decode."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from src.core.config import get_settings

_settings = get_settings()
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


# ── Password ────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


# ── JWT ────────────────────────────────────────────────────
class TokenError(Exception):
    """Raised when a token is invalid, expired, or malformed."""


def create_access_token(
    *,
    subject: uuid.UUID,
    clinic_id: uuid.UUID,
    role: str,
    extra: dict[str, Any] | None = None,
) -> str:
    """Subject = user_id. Carrega clinic_id e role no claim p/ multi-tenant rápido."""
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=_settings.JWT_EXPIRES_MIN)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "clinic_id": str(clinic_id),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
        "type": "access",
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, _settings.JWT_SECRET, algorithm=_settings.JWT_ALGORITHM)


def create_refresh_token(*, subject: uuid.UUID, clinic_id: uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=_settings.JWT_REFRESH_EXPIRES_DAYS)
    payload = {
        "sub": str(subject),
        "clinic_id": str(clinic_id),
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
        "type": "refresh",
    }
    return jwt.encode(payload, _settings.JWT_SECRET, algorithm=_settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, _settings.JWT_SECRET, algorithms=[_settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise TokenError(str(exc)) from exc
