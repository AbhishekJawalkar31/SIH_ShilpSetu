from __future__ import annotations

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app
from app.schemas.auth import AuthUser, TokenResponse
from app.services.auth.repository import UserAlreadyExistsError
from app.services.auth.service import InvalidCredentialsError, UserInactiveError


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_register_api_success(client: TestClient) -> None:
    user_id = uuid4()
    mock_token_resp = TokenResponse(
        access_token="fake_jwt_token",
        token_type="bearer",
        expires_in=3600,
        user=AuthUser(
            id=user_id,
            name="Pooja Sharma",
            email="pooja@example.com",
            role="buyer",
        ),
    )

    with patch("app.api.auth._service.register", new=AsyncMock(return_value=mock_token_resp)):
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Pooja Sharma",
                "email": "pooja@example.com",
                "password": "Password123!",
                "role": "buyer",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["access_token"] == "fake_jwt_token"
        assert data["user"]["email"] == "pooja@example.com"
        assert "password" not in data["user"]
        assert "password_hash" not in data["user"]


def test_register_api_duplicate_email(client: TestClient) -> None:
    with patch(
        "app.api.auth._service.register",
        new=AsyncMock(side_effect=UserAlreadyExistsError("User with email 'pooja@example.com' already exists.")),
    ):
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Pooja Sharma",
                "email": "pooja@example.com",
                "password": "Password123!",
                "role": "buyer",
            },
        )
        assert response.status_code == 409
        assert response.json()["detail"]["code"] == "EMAIL_ALREADY_EXISTS"


def test_login_api_success(client: TestClient) -> None:
    user_id = uuid4()
    mock_token_resp = TokenResponse(
        access_token="fake_jwt_token",
        token_type="bearer",
        expires_in=3600,
        user=AuthUser(
            id=user_id,
            name="Pooja Sharma",
            email="pooja@example.com",
            role="buyer",
        ),
    )

    with patch("app.api.auth._service.login", new=AsyncMock(return_value=mock_token_resp)):
        response = client.post(
            "/api/auth/login",
            json={
                "email": "pooja@example.com",
                "password": "Password123!",
            },
        )
        assert response.status_code == 200
        assert response.json()["access_token"] == "fake_jwt_token"


def test_login_api_invalid_credentials(client: TestClient) -> None:
    with patch(
        "app.api.auth._service.login",
        new=AsyncMock(side_effect=InvalidCredentialsError("Invalid email or password.")),
    ):
        response = client.post(
            "/api/auth/login",
            json={
                "email": "wrong@example.com",
                "password": "wrong",
            },
        )
        assert response.status_code == 401
        assert response.json()["detail"]["code"] == "INVALID_CREDENTIALS"


def test_login_api_inactive_account(client: TestClient) -> None:
    with patch(
        "app.api.auth._service.login",
        new=AsyncMock(side_effect=UserInactiveError("This account is inactive.")),
    ):
        response = client.post(
            "/api/auth/login",
            json={
                "email": "inactive@example.com",
                "password": "Password123!",
            },
        )
        assert response.status_code == 403
        assert response.json()["detail"]["code"] == "ACCOUNT_INACTIVE"


def test_me_api_authenticated(client: TestClient) -> None:
    user_id = uuid4()
    token = create_access_token({"sub": str(user_id), "email": "me@example.com", "role": "buyer"})

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["id"] == str(user_id)
    assert response.json()["email"] == "me@example.com"


def test_me_api_missing_auth(client: TestClient) -> None:
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "AUTHENTICATION_REQUIRED"
