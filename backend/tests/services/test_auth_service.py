from __future__ import annotations

from datetime import timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.core.security import (
    InvalidTokenError,
    TokenExpiredError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.schemas.auth import UserLoginRequest, UserRegisterRequest
from app.services.auth.repository import UserAlreadyExistsError, UserRepository
from app.services.auth.service import (
    AuthService,
    InvalidCredentialsError,
    UserInactiveError,
)


def test_password_hashing_and_verification() -> None:
    pw = "SecretArtisan123!"
    h = hash_password(pw)
    assert h.startswith("scrypt$")
    assert verify_password(pw, h) is True
    assert verify_password("WrongPassword", h) is False
    assert verify_password("", h) is False
    assert verify_password(pw, "invalid_hash") is False


def test_jwt_create_and_decode() -> None:
    user_id = uuid4()
    payload = {
        "sub": str(user_id),
        "email": "artisan@shilpsetu.org",
        "role": "artisan",
    }
    token = create_access_token(payload, expires_delta=timedelta(minutes=15))
    decoded = decode_access_token(token)

    assert decoded["sub"] == str(user_id)
    assert decoded["email"] == "artisan@shilpsetu.org"
    assert decoded["role"] == "artisan"
    assert "exp" in decoded
    assert "iat" in decoded


def test_jwt_expired_token() -> None:
    payload = {"sub": str(uuid4())}
    expired_token = create_access_token(payload, expires_delta=timedelta(seconds=-10))

    with pytest.raises(TokenExpiredError, match="Access token has expired"):
        decode_access_token(expired_token)


def test_jwt_tampered_signature() -> None:
    payload = {"sub": str(uuid4())}
    token = create_access_token(payload)
    parts = token.split(".")
    tampered_token = f"{parts[0]}.{parts[1]}.badsignature"

    with pytest.raises(InvalidTokenError):
        decode_access_token(tampered_token)


@pytest.mark.anyio
async def test_auth_service_register_and_login_success() -> None:
    user_id = uuid4()
    artisan_id = uuid4()
    hashed = hash_password("pass123")

    mock_repo = UserRepository(pool_manager=None)  # type: ignore[arg-type]
    mock_repo.get_user_by_email = AsyncMock(  # type: ignore[method-assign]
        return_value={
            "id": user_id,
            "name": "Kavita Devi",
            "email": "kavita@shilpsetu.org",
            "role": "artisan",
            "password_hash": hashed,
            "is_active": True,
            "artisan_id": artisan_id,
        }
    )

    service = AuthService(repository=mock_repo)
    login_res = await service.login(UserLoginRequest(email="kavita@shilpsetu.org", password="pass123"))

    assert login_res.access_token is not None
    assert login_res.user.id == user_id
    assert login_res.user.role == "artisan"
    assert login_res.user.artisan_id == artisan_id


@pytest.mark.anyio
async def test_auth_service_login_invalid_password() -> None:
    user_id = uuid4()
    hashed = hash_password("correct_pass")

    mock_repo = UserRepository(pool_manager=None)  # type: ignore[arg-type]
    mock_repo.get_user_by_email = AsyncMock(  # type: ignore[method-assign]
        return_value={
            "id": user_id,
            "name": "Buyer John",
            "email": "buyer@example.com",
            "role": "buyer",
            "password_hash": hashed,
            "is_active": True,
        }
    )

    service = AuthService(repository=mock_repo)
    with pytest.raises(InvalidCredentialsError):
        await service.login(UserLoginRequest(email="buyer@example.com", password="wrong_password"))


@pytest.mark.anyio
async def test_auth_service_login_inactive_user() -> None:
    user_id = uuid4()
    hashed = hash_password("pass123")

    mock_repo = UserRepository(pool_manager=None)  # type: ignore[arg-type]
    mock_repo.get_user_by_email = AsyncMock(  # type: ignore[method-assign]
        return_value={
            "id": user_id,
            "name": "Inactive User",
            "email": "inactive@example.com",
            "role": "buyer",
            "password_hash": hashed,
            "is_active": False,
        }
    )

    service = AuthService(repository=mock_repo)
    with pytest.raises(UserInactiveError, match="account is inactive"):
        await service.login(UserLoginRequest(email="inactive@example.com", password="pass123"))
