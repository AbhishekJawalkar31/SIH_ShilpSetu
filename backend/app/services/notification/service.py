from __future__ import annotations

from uuid import UUID

from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services.notification.repository import NotificationRepository


class NotificationService:
    """Service orchestrating notification retrieval and status updates."""

    def __init__(self, repository: NotificationRepository | None = None) -> None:
        self._repo = repository or NotificationRepository()

    async def list_notifications(
        self,
        user_id: UUID | None = None,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> NotificationListResponse:
        return await self._repo.list_notifications(
            user_id=user_id,
            unread_only=unread_only,
            limit=limit,
            offset=offset,
        )

    async def mark_as_read(
        self,
        notification_id: UUID,
        expected_user_id: UUID | None = None,
    ) -> NotificationResponse:
        return await self._repo.mark_as_read(
            notification_id=notification_id,
            expected_user_id=expected_user_id,
        )
