from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    """In-app notification representation."""

    model_config = ConfigDict(extra="ignore")

    id: UUID
    user_id: UUID
    type: str
    title: str
    message: str
    reference_type: str | None = None
    reference_id: UUID | None = None
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    """List of notifications with total count and unread count."""

    model_config = ConfigDict(extra="ignore")

    items: list[NotificationResponse]
    total: int
    unread_count: int
