from __future__ import annotations

from typing import Callable
from uuid import UUID

from fastapi import Header, HTTPException, status

from app.core.security import InvalidTokenError, TokenExpiredError, decode_access_token
from app.schemas.auth import AuthUser


def get_current_user_optional(
    authorization: str | None = Header(default=None),
) -> AuthUser | None:
    """
    Extract and verify JWT from Authorization header if present.
    Returns AuthUser if valid, None if Authorization header is missing.
    Raises HTTPException(401) only if Authorization header is present but invalid/expired.
    """
    if not authorization:
        return None

    if not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTHENTICATION_REQUIRED", "message": "Bearer authentication token required."},
        )

    token = authorization[7:].strip()
    try:
        payload = decode_access_token(token)
    except TokenExpiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_EXPIRED", "message": str(exc)},
        ) from exc
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": str(exc)},
        ) from exc

    try:
        user_id = UUID(str(payload["sub"]))
        role = payload.get("role") or "buyer"
        artisan_id = UUID(str(payload["artisan_id"])) if payload.get("artisan_id") else None
        return AuthUser(
            id=user_id,
            name=payload.get("name") or "Authenticated User",
            email=payload.get("email"),
            role=role,
            artisan_id=artisan_id,
            is_active=True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Token payload contains invalid user metadata."},
        ) from exc


def get_current_user(
    authorization: str | None = Header(default=None),
) -> AuthUser:
    """Strict dependency requiring an authenticated user."""
    user = get_current_user_optional(authorization=authorization)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTHENTICATION_REQUIRED", "message": "Authentication is required."},
        )
    return user


def require_role(*allowed_roles: str) -> Callable[[AuthUser], AuthUser]:
    """Dependency factory restricting access to users with specified roles."""

    def role_checker(current_user: AuthUser = get_current_user) -> AuthUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "INSUFFICIENT_ROLE",
                    "message": f"Role '{current_user.role}' is not authorized to perform this operation.",
                },
            )
        return current_user

    return role_checker
