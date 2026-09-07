from __future__ import annotations

import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

UserRole = Literal["artisan", "buyer", "admin"]
_EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class UserRegisterRequest(BaseModel):
    """Request payload for user registration."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    role: UserRole = "buyer"
    phone: str | None = None
    # For artisans registering, optional business details
    business_name: str | None = None
    craft_type: str | None = None
    city: str | None = None
    state: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty or whitespace only.")
        return v.strip()

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not _EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email format.")
        return clean


class UserLoginRequest(BaseModel):
    """Request payload for user login."""

    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not _EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email format.")
        return clean


class AuthUser(BaseModel):
    """Authenticated user profile representation."""

    model_config = ConfigDict(extra="ignore")

    id: UUID
    name: str
    email: str | None = None
    phone: str | None = None
    role: UserRole
    artisan_id: UUID | None = None
    is_active: bool = True


class TokenResponse(BaseModel):
    """Response returned upon successful registration or login."""

    model_config = ConfigDict(extra="ignore")

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUser
