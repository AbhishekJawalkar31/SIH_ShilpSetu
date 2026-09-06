from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any
from uuid import UUID

from app.core.config import settings
from app.schemas.api import AuthUserResponse


class AuthenticationError(ValueError):
    pass


def _decode_part(value: str) -> dict[str, Any]:
    padding = "=" * (-len(value) % 4)
    try:
        return json.loads(base64.urlsafe_b64decode(value + padding))
    except (ValueError, json.JSONDecodeError) as exc:
        raise AuthenticationError("Invalid access token.") from exc


class AuthService:
    """Minimal Supabase-compatible JWT verification for the MVP.

    Supabase Auth sets the user's UUID in the JWT ``sub`` claim. That UUID is
    the application's ``users.id`` and is the identity used by quote,
    conversation, and artisan operations.
    """

    def __init__(
        self,
        jwt_secret: str | None = None,
        *,
        required: bool = False,
    ) -> None:
        self.jwt_secret = jwt_secret
        self.required = required

    def authenticate(self, authorization: str | None) -> AuthUserResponse | None:
        if not authorization:
            if self.required:
                raise AuthenticationError("Authentication is required.")
            return None
        if not authorization.lower().startswith("bearer "):
            raise AuthenticationError("Bearer authentication is required.")
        token = authorization[7:].strip()
        parts = token.split(".")
        if len(parts) != 3:
            raise AuthenticationError("Invalid access token.")

        header = _decode_part(parts[0])
        payload = _decode_part(parts[1])
        if payload.get("exp") is not None and int(payload["exp"]) < int(time.time()):
            raise AuthenticationError("Access token has expired.")
        if not self.jwt_secret:
            raise AuthenticationError("JWT verification is not configured.")
        if header.get("alg") != "HS256":
            raise AuthenticationError("Unsupported access token algorithm.")
        digest = hmac.new(
            self.jwt_secret.encode(),
            f"{parts[0]}.{parts[1]}".encode(),
            hashlib.sha256,
        ).digest()
        expected = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
        if not hmac.compare_digest(expected, parts[2]):
            raise AuthenticationError("Invalid access token signature.")

        try:
            user_id = UUID(str(payload["sub"]))
        except (KeyError, ValueError) as exc:
            raise AuthenticationError("Token does not contain a valid user ID.") from exc
        user_metadata = payload.get("user_metadata") or {}
        app_metadata = payload.get("app_metadata") or {}
        role = app_metadata.get("role") or user_metadata.get("role")
        if role not in {"artisan", "buyer", "admin"}:
            role = None
        artisan_id = user_metadata.get("artisan_id")
        try:
            parsed_artisan_id = UUID(str(artisan_id)) if artisan_id else None
        except ValueError:
            parsed_artisan_id = None
        return AuthUserResponse(
            id=user_id,
            email=payload.get("email"),
            role=role,
            artisan_id=parsed_artisan_id,
        )


def build_auth_service() -> AuthService:
    return AuthService(
        settings.supabase_jwt_secret,
        required=settings.auth_required,
    )