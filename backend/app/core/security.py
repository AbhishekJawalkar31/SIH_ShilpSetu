from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.config import settings


class SecurityError(Exception):
    """Base exception for cryptographic and token verification errors."""


class TokenExpiredError(SecurityError):
    """Raised when an access token has expired."""


class InvalidTokenError(SecurityError):
    """Raised when a token signature, format, or algorithm is invalid."""


# ---------------------------------------------------------------------------
# 1. Password Hashing (hashlib.scrypt)
# ---------------------------------------------------------------------------

def hash_password(password: str, *, salt: bytes | None = None) -> str:
    """
    Hash a plaintext password using standard library hashlib.scrypt.
    Format: scrypt$16384$8$1$<salt_hex>$<hash_hex>
    """
    if not password:
        raise ValueError("Password must not be empty.")

    salt_bytes = salt or os.urandom(16)
    n, r, p = 16384, 8, 1
    key = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt_bytes,
        n=n,
        r=r,
        p=p,
        maxmem=0,
        dklen=64,
    )
    salt_hex = salt_bytes.hex()
    key_hex = key.hex()
    return f"scrypt${n}${r}${p}${salt_hex}${key_hex}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a stored scrypt hash."""
    if not password or not password_hash:
        return False

    parts = password_hash.split("$")
    if len(parts) != 6 or parts[0] != "scrypt":
        return False

    try:
        n = int(parts[1])
        r = int(parts[2])
        p = int(parts[3])
        salt_bytes = bytes.fromhex(parts[4])
        expected_key = bytes.fromhex(parts[5])
    except (ValueError, TypeError):
        return False

    computed_key = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt_bytes,
        n=n,
        r=r,
        p=p,
        maxmem=0,
        dklen=len(expected_key),
    )
    return hmac.compare_digest(computed_key, expected_key)


# ---------------------------------------------------------------------------
# 2. JWT Encoding & Decoding (HS256)
# ---------------------------------------------------------------------------

def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
    secret_key: str | None = None,
    algorithm: str | None = None,
) -> str:
    """Create a signed JWT access token using HS256."""
    secret = (secret_key or settings.jwt_secret_key).encode("utf-8")
    alg = algorithm or settings.jwt_algorithm or "HS256"

    if alg != "HS256":
        raise ValueError(f"Unsupported algorithm '{alg}', only HS256 is supported.")

    header = {"typ": "JWT", "alg": alg}
    payload = dict(data)

    now = datetime.now(timezone.utc)
    if expires_delta is not None:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.access_token_expire_minutes)

    payload["exp"] = int(expire.timestamp())
    payload["iat"] = int(now.timestamp())

    header_b64 = _b64encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = hmac.new(secret, signing_input, hashlib.sha256).digest()
    signature_b64 = _b64encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def decode_access_token(
    token: str,
    secret_key: str | None = None,
    algorithm: str | None = None,
) -> dict[str, Any]:
    """Decode, verify signature, and check expiration for a JWT token."""
    secret = (secret_key or settings.jwt_secret_key).encode("utf-8")
    expected_alg = algorithm or settings.jwt_algorithm or "HS256"

    parts = token.strip().split(".")
    if len(parts) != 3:
        raise InvalidTokenError("Invalid token format; expected 3 segments.")

    header_b64, payload_b64, signature_b64 = parts

    try:
        header = json.loads(_b64decode(header_b64).decode("utf-8"))
        payload = json.loads(_b64decode(payload_b64).decode("utf-8"))
        received_signature = _b64decode(signature_b64)
    except Exception as exc:
        raise InvalidTokenError(f"Could not parse token components: {exc}") from exc

    if header.get("alg") != expected_alg:
        raise InvalidTokenError(f"Invalid algorithm: {header.get('alg')}")

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_signature = hmac.new(secret, signing_input, hashlib.sha256).digest()

    if not hmac.compare_digest(received_signature, expected_signature):
        raise InvalidTokenError("Invalid token signature.")

    exp = payload.get("exp")
    if exp is not None and int(exp) < int(time.time()):
        raise TokenExpiredError("Access token has expired.")

    return payload
