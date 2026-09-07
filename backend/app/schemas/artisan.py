from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ArtisanProfileResponse(BaseModel):
    """Public profile response for an artisan, joined with their user account."""

    model_config = ConfigDict(extra="ignore")

    id: UUID
    user_id: UUID
    name: str
    business_name: str | None = None
    craft_type: str | None = None
    description: str | None = None
    location: str | None = None
    city: str | None = None
    state: str | None = None
    country: str = "India"
    languages: list[str] = Field(default_factory=list)
    rating: float = Field(default=0.0, ge=0, le=5)
    created_at: datetime
    updated_at: datetime
