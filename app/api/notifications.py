from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.api import NotificationRequest, NotificationResponse
from app.services.notifications.service import (
    NotificationService,
    build_notification_service,
)


router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def get_notification_service() -> NotificationService:
    return build_notification_service()


@router.post("/send", response_model=NotificationResponse)
def send_notification(
    request: NotificationRequest,
    service: NotificationService = Depends(get_notification_service),
) -> NotificationResponse:
    return service.send(request)