from __future__ import annotations

from typing import Any
from uuid import UUID

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.schemas.auth import (
    AuthUser,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.services.auth.repository import UserAlreadyExistsError, UserRepository


class AuthError(Exception):
    """Base exception for authentication errors."""


class InvalidCredentialsError(AuthError):
    """Raised when email or password verification fails."""


class UserInactiveError(AuthError):
    """Raised when an inactive account tries to login."""


class AuthService:
    """Service handling user registration, credential authentication, and JWT token issuance."""

    def __init__(self, repository: UserRepository | None = None) -> None:
        self._repo = repository or UserRepository()

    async def register(self, request: UserRegisterRequest) -> TokenResponse:
        """Register a new user, hash password, and issue JWT access token."""
        password_hash = hash_password(request.password)
        user = await self._repo.create_user(request=request, password_hash=password_hash)

        token_payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "artisan_id": str(user.artisan_id) if user.artisan_id else None,
        }
        access_token = create_access_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=user,
        )

    async def login(self, request: UserLoginRequest) -> TokenResponse:
        """Authenticate user credentials and issue a signed JWT access token."""
        user_row = await self._repo.get_user_by_email(request.email)
        if user_row is None:
            raise InvalidCredentialsError("Invalid email or password.")

        stored_hash = user_row.get("password_hash")
        if not stored_hash or not verify_password(request.password, stored_hash):
            raise InvalidCredentialsError("Invalid email or password.")

        if not user_row.get("is_active", True):
            raise UserInactiveError("This account is inactive. Please contact support.")

        user = AuthUser(
            id=user_row["id"],
            name=user_row["name"],
            email=user_row["email"],
            phone=user_row.get("phone"),
            role=user_row["role"],
            artisan_id=user_row.get("artisan_id"),
            is_active=user_row.get("is_active", True),
        )

        token_payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "artisan_id": str(user.artisan_id) if user.artisan_id else None,
        }
        access_token = create_access_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=user,
        )

    async def get_profile(self, user_id: UUID) -> AuthUser | None:
        return await self._repo.get_user_by_id(user_id)
