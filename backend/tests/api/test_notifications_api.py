from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services.notification.repository import NotificationNotFoundError


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_list_notifications(client: TestClient) -> None:
    now = datetime.now(timezone.utc)
    mock_item = NotificationResponse(
        id=uuid4(),
        user_id=uuid4(),
        type="order_created",
        title="Order Created",
        message="Order has been placed",
        reference_type="order",
        reference_id=uuid4(),
        is_read=False,
        created_at=now,
    )
    mock_resp = NotificationListResponse(items=[mock_item], total=1, unread_count=1)

    with patch("app.api.notifications._service.list_notifications", new=AsyncMock(return_value=mock_resp)):
        response = client.get("/api/notifications")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["unread_count"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Order Created"


def test_list_unread_notifications(client: TestClient) -> None:
    now = datetime.now(timezone.utc)
    mock_item = NotificationResponse(
        id=uuid4(),
        user_id=uuid4(),
        type="quote_accepted",
        title="Quote Accepted",
        message="Your quote was accepted",
        reference_type="order",
        reference_id=uuid4(),
        is_read=False,
        created_at=now,
    )
    mock_resp = NotificationListResponse(items=[mock_item], total=1, unread_count=1)

    with patch("app.api.notifications._service.list_notifications", new=AsyncMock(return_value=mock_resp)):
        response = client.get("/api/notifications/unread")
        assert response.status_code == 200
        data = response.json()
        assert data["unread_count"] == 1
        assert data["items"][0]["title"] == "Quote Accepted"


def test_mark_notification_read_success(client: TestClient) -> None:
    notif_id = uuid4()
    now = datetime.now(timezone.utc)
    mock_item = NotificationResponse(
        id=notif_id,
        user_id=uuid4(),
        type="quote_accepted",
        title="Quote Accepted",
        message="Your quote was accepted",
        reference_type="order",
        reference_id=uuid4(),
        is_read=True,
        created_at=now,
    )

    with patch("app.api.notifications._service.mark_as_read", new=AsyncMock(return_value=mock_item)):
        response = client.patch(f"/api/notifications/{notif_id}/read")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(notif_id)
        assert data["is_read"] is True


def test_mark_notification_read_not_found(client: TestClient) -> None:
    notif_id = uuid4()
    with patch(
        "app.api.notifications._service.mark_as_read",
        new=AsyncMock(side_effect=NotificationNotFoundError(f"Notification {notif_id} not found.")),
    ):
        response = client.patch(f"/api/notifications/{notif_id}/read")
        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "NOTIFICATION_NOT_FOUND"
