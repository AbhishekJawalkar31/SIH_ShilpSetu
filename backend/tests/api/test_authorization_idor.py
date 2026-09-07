from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app
from app.schemas.auth import AuthUser
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.schemas.order import OrderItemResponse, OrderListResponse, OrderResponse, QuoteAcceptResponse
from app.schemas.product import ProductResponse
from app.schemas.quote import QuoteArtisanAllocation, QuoteResponse


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_quote_idor_buyer_a_cannot_view_buyer_b_quote(client: TestClient) -> None:
    buyer_a_id = uuid4()
    buyer_b_id = uuid4()
    quote_id = uuid4()

    token_a = create_access_token({"sub": str(buyer_a_id), "role": "buyer"})

    mock_quote = QuoteResponse(
        id=quote_id,
        buyer_id=buyer_b_id,  # Belongs to Buyer B!
        quantity=50,
        requirement_text="Need bags",
        status="pending",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        allocations=[],
    )

    from app.api.quotes import get_quote_service
    mock_srv = AsyncMock()
    mock_srv.get_quote = AsyncMock(return_value=mock_quote)

    app.dependency_overrides[get_quote_service] = lambda: mock_srv
    try:
        response = client.get(
            f"/api/quotes/{quote_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "FORBIDDEN"
    finally:
        app.dependency_overrides.pop(get_quote_service, None)


def test_quote_idor_buyer_a_cannot_create_quote_as_buyer_b(client: TestClient) -> None:
    buyer_a_id = uuid4()
    buyer_b_id = uuid4()

    token_a = create_access_token({"sub": str(buyer_a_id), "role": "buyer"})

    response = client.post(
        "/api/quotes",
        json={
            "buyer_id": str(buyer_b_id),  # Attempting to impersonate Buyer B
            "requirement_text": "50 Terracotta items",
            "quantity": 50,
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_order_idor_buyer_a_cannot_view_buyer_b_order(client: TestClient) -> None:
    buyer_a_id = uuid4()
    buyer_b_id = uuid4()
    order_id = uuid4()
    now = datetime.now(timezone.utc)

    token_a = create_access_token({"sub": str(buyer_a_id), "role": "buyer"})

    mock_order = OrderResponse(
        id=order_id,
        buyer_id=buyer_b_id,  # Belongs to Buyer B
        quantity=10,
        unit_price=100.0,
        total_price=1000.0,
        status="confirmed",
        created_at=now,
        updated_at=now,
        items=[],
    )

    with patch("app.api.orders._service.get_order", new=AsyncMock(return_value=mock_order)):
        response = client.get(
            f"/api/orders/{order_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert response.status_code == 403
        assert response.json()["detail"]["code"] == "FORBIDDEN"


def test_notification_idor_user_a_cannot_read_user_b_notifications(client: TestClient) -> None:
    user_a_id = uuid4()
    user_b_id = uuid4()

    token_a = create_access_token({"sub": str(user_a_id), "role": "buyer"})

    # Even if User A passes ?user_id=User-B, it should automatically scope to User A
    with patch("app.api.notifications._service.list_notifications", new=AsyncMock(return_value=NotificationListResponse(items=[], total=0, unread_count=0))) as mock_list:
        response = client.get(
            f"/api/notifications?user_id={user_b_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert response.status_code == 200
        # Check that user_id passed to service was forced to user_a_id!
        mock_list.assert_awaited_once_with(user_id=user_a_id, unread_only=False, limit=50, offset=0)


def test_product_idor_artisan_a_cannot_update_artisan_b_inventory(client: TestClient) -> None:
    artisan_a_user_id = uuid4()
    artisan_a_id = uuid4()
    product_id = uuid4()

    token_a = create_access_token({
        "sub": str(artisan_a_user_id),
        "role": "artisan",
        "artisan_id": str(artisan_a_id),
    })

    from app.api.products import get_product_write_repository
    from app.services.product.write_repository import ProductNotFoundError
    mock_repo = AsyncMock()
    mock_repo.update_inventory = AsyncMock(side_effect=ProductNotFoundError("Product was not found or access denied."))

    app.dependency_overrides[get_product_write_repository] = lambda: mock_repo
    try:
        response = client.put(
            f"/api/products/{product_id}/inventory",
            json={"available_quantity": 100, "production_capacity": 200, "unit": "piece"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "PRODUCT_NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_product_write_repository, None)


def test_role_restriction_buyer_cannot_create_product(client: TestClient) -> None:
    buyer_id = uuid4()
    token_buyer = create_access_token({"sub": str(buyer_id), "role": "buyer"})

    response = client.post(
        "/api/products",
        json={
            "artisan_id": str(uuid4()),
            "title": "Unauthorized Product",
            "description": "Product description",
            "category": "Pottery",
            "price": 100.0,
            "currency": "INR",
        },
        headers={"Authorization": f"Bearer {token_buyer}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "INSUFFICIENT_ROLE"


def test_order_idor_artisan_a_cannot_view_artisan_b_order(client: TestClient) -> None:
    artisan_a_user_id = uuid4()
    artisan_a_id = uuid4()
    artisan_b_id = uuid4()
    order_id = uuid4()
    buyer_id = uuid4()
    now = datetime.now(timezone.utc)

    token_artisan_a = create_access_token({
        "sub": str(artisan_a_user_id),
        "role": "artisan",
        "artisan_id": str(artisan_a_id),
    })

    # Order belongs to Artisan B
    mock_order = OrderResponse(
        id=order_id,
        buyer_id=buyer_id,
        artisan_id=artisan_b_id,
        quantity=10,
        unit_price=100.0,
        total_price=1000.0,
        status="confirmed",
        created_at=now,
        updated_at=now,
        items=[
            OrderItemResponse(
                id=uuid4(),
                order_id=order_id,
                artisan_id=artisan_b_id,
                quantity=10,
                unit_price=100.0,
                total_price=1000.0,
                created_at=now,
            )
        ],
    )

    with patch("app.api.orders._service.get_order", new=AsyncMock(return_value=mock_order)):
        response = client.get(
            f"/api/orders/{order_id}",
            headers={"Authorization": f"Bearer {token_artisan_a}"},
        )
        assert response.status_code == 403
        assert response.json()["detail"]["code"] == "FORBIDDEN"


def test_notification_idor_user_a_cannot_mark_user_b_notification_read(client: TestClient) -> None:
    from app.services.notification.repository import NotificationNotFoundError

    user_a_id = uuid4()
    notification_b_id = uuid4()

    token_a = create_access_token({"sub": str(user_a_id), "role": "artisan"})

    with patch(
        "app.api.notifications._service.mark_as_read",
        new=AsyncMock(side_effect=NotificationNotFoundError(f"Notification {notification_b_id} not found.")),
    ) as mock_mark:
        response = client.patch(
            f"/api/notifications/{notification_b_id}/read",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "NOTIFICATION_NOT_FOUND"
        mock_mark.assert_awaited_once_with(notification_b_id, expected_user_id=user_a_id)

