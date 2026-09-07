from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services.notification.repository import NotificationNotFoundError
from app.services.notification.service import NotificationService

from app.core.dependencies import get_current_user_optional
from app.schemas.auth import AuthUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])
_service = NotificationService()


@router.get(
    "",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List notifications with unread count and pagination",
)
async def list_notifications(
    user_id: UUID | None = Query(None, description="Filter by user ID"),
    limit: int = Query(50, ge=1, le=100, description="Page limit (1-100)"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: AuthUser | None = Depends(get_current_user_optional),
) -> NotificationListResponse:
    # IDOR protection: non-admin user can only view their own notifications
    effective_user_id = user_id
    if current_user is not None and current_user.role != "admin":
        effective_user_id = current_user.id

    try:
        return await _service.list_notifications(
            user_id=effective_user_id,
            unread_only=False,
            limit=limit,
            offset=offset,
        )
    except Exception as exc:
        logger.exception("Unexpected error listing notifications: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred while listing notifications."},
        ) from exc


@router.get(
    "/unread",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List unread notifications",
)
async def list_unread_notifications(
    user_id: UUID | None = Query(None, description="Filter by user ID"),
    limit: int = Query(50, ge=1, le=100, description="Page limit (1-100)"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: AuthUser | None = Depends(get_current_user_optional),
) -> NotificationListResponse:
    # IDOR protection: non-admin user can only view their own unread notifications
    effective_user_id = user_id
    if current_user is not None and current_user.role != "admin":
        effective_user_id = current_user.id

    try:
        return await _service.list_notifications(
            user_id=effective_user_id,
            unread_only=True,
            limit=limit,
            offset=offset,
        )
    except Exception as exc:
        logger.exception("Unexpected error listing unread notifications: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred while listing unread notifications."},
        ) from exc


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark notification as read",
)
async def mark_notification_read(
    notification_id: UUID,
    current_user: AuthUser | None = Depends(get_current_user_optional),
) -> NotificationResponse:
    expected_user_id = current_user.id if (current_user is not None and current_user.role != "admin") else None

    try:
        return await _service.mark_as_read(notification_id, expected_user_id=expected_user_id)
    except NotificationNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOTIFICATION_NOT_FOUND", "message": str(exc)},
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error marking notification %s as read: %s", notification_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred while updating the notification."},
        ) from exc
