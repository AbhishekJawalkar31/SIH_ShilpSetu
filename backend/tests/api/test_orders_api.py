from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app
from app.schemas.order import (
    DirectOrderCreateRequest,
    DirectOrderItemRequest,
    OrderItemResponse,
    OrderListResponse,
    OrderResponse,
    QuoteAcceptResponse,
)
from app.services.order.repository import (
    InsufficientInventoryError,
    InvalidOrderItemsError,
    NoAcceptableAllocationError,
    OrderAlreadyExistsError,
    ProductNotFoundError,
    QuoteAlreadyAcceptedError,
    QuoteNotFoundError,
)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_accept_quote_api_success(client: TestClient) -> None:
    quote_id = uuid4()
    order_id = uuid4()
    buyer_id = uuid4()
    now = datetime.now(timezone.utc)

    mock_resp = QuoteAcceptResponse(
        order=OrderResponse(
            id=order_id,
            buyer_id=buyer_id,
            quantity=100,
            unit_price=500.0,
            total_price=50000.0,
            status="confirmed",
            created_at=now,
            updated_at=now,
            items=[
                OrderItemResponse(
                    id=uuid4(),
                    order_id=order_id,
                    artisan_id=uuid4(),
                    quantity=100,
                    unit_price=500.0,
                    total_price=50000.0,
                    created_at=now,
                    artisan_business_name="Bengal Crafts",
                )
            ],
        ),
        quote_id=quote_id,
        message="Quote successfully accepted and converted to order.",
    )

    with patch("app.api.orders._service.accept_quote", new=AsyncMock(return_value=mock_resp)):
        response = client.post(f"/api/quotes/{quote_id}/accept")
        assert response.status_code == 200
        data = response.json()
        assert data["quote_id"] == str(quote_id)
        assert data["order"]["id"] == str(order_id)
        assert data["order"]["quantity"] == 100
        assert len(data["order"]["items"]) == 1


def test_accept_quote_api_quote_not_found(client: TestClient) -> None:
    quote_id = uuid4()
    with patch(
        "app.api.orders._service.accept_quote",
        new=AsyncMock(side_effect=QuoteNotFoundError(f"Quote {quote_id} not found.")),
    ):
        response = client.post(f"/api/quotes/{quote_id}/accept")
        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "QUOTE_NOT_FOUND"


def test_accept_quote_api_already_accepted(client: TestClient) -> None:
    quote_id = uuid4()
    with patch(
        "app.api.orders._service.accept_quote",
        new=AsyncMock(side_effect=QuoteAlreadyAcceptedError(f"Quote {quote_id} already accepted.")),
    ):
        response = client.post(f"/api/quotes/{quote_id}/accept")
        assert response.status_code == 409
        assert response.json()["detail"]["code"] == "QUOTE_ALREADY_ACCEPTED"


def test_accept_quote_api_order_already_exists(client: TestClient) -> None:
    quote_id = uuid4()
    with patch(
        "app.api.orders._service.accept_quote",
        new=AsyncMock(side_effect=OrderAlreadyExistsError("Order already exists.")),
    ):
        response = client.post(f"/api/quotes/{quote_id}/accept")
        assert response.status_code == 409
        assert response.json()["detail"]["code"] == "ORDER_ALREADY_EXISTS"


def test_accept_quote_api_no_allocation(client: TestClient) -> None:
    quote_id = uuid4()
    with patch(
        "app.api.orders._service.accept_quote",
        new=AsyncMock(side_effect=NoAcceptableAllocationError("No allocations.")),
    ):
        response = client.post(f"/api/quotes/{quote_id}/accept")
        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "NO_ACCEPTABLE_ALLOCATION"


def test_accept_quote_api_insufficient_inventory(client: TestClient) -> None:
    quote_id = uuid4()
    with patch(
        "app.api.orders._service.accept_quote",
        new=AsyncMock(side_effect=InsufficientInventoryError("Insufficient inventory.")),
    ):
        response = client.post(f"/api/quotes/{quote_id}/accept")
        assert response.status_code == 409
        assert response.json()["detail"]["code"] == "INVENTORY_INSUFFICIENT"


def test_get_order_by_id_success(client: TestClient) -> None:
    order_id = uuid4()
    now = datetime.now(timezone.utc)
    mock_order = OrderResponse(
        id=order_id,
        buyer_id=uuid4(),
        quantity=50,
        unit_price=200.0,
        total_price=10000.0,
        status="confirmed",
        created_at=now,
        updated_at=now,
    )

    with patch("app.api.orders._service.get_order", new=AsyncMock(return_value=mock_order)):
        response = client.get(f"/api/orders/{order_id}")
        assert response.status_code == 200
        assert response.json()["id"] == str(order_id)
        assert response.json()["quantity"] == 50


def test_get_order_by_id_not_found(client: TestClient) -> None:
    order_id = uuid4()
    with patch("app.api.orders._service.get_order", new=AsyncMock(return_value=None)):
        response = client.get(f"/api/orders/{order_id}")
        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "ORDER_NOT_FOUND"


def test_list_orders(client: TestClient) -> None:
    mock_list = OrderListResponse(items=[], total=0, limit=50, offset=0)
    with patch("app.api.orders._service.list_orders", new=AsyncMock(return_value=mock_list)):
        response = client.get("/api/orders?limit=10&offset=0")
        assert response.status_code == 200
        assert response.json()["total"] == 0
        assert response.json()["limit"] == 50  # Default or mocked value


def test_get_order_items(client: TestClient) -> None:
    order_id = uuid4()
    now = datetime.now(timezone.utc)
    mock_items = [
        OrderItemResponse(
            id=uuid4(),
            order_id=order_id,
            artisan_id=uuid4(),
            quantity=25,
            unit_price=150.0,
            total_price=3750.0,
            created_at=now,
        )
    ]
    with patch("app.api.orders._service.get_order_items", new=AsyncMock(return_value=mock_items)):
        response = client.get(f"/api/orders/{order_id}/items")
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["quantity"] == 25


def test_create_direct_order_success(client: TestClient) -> None:
    buyer_id = uuid4()
    order_id = uuid4()
    product_id = uuid4()
    artisan_id = uuid4()
    now = datetime.now(timezone.utc)
    token = create_access_token({"sub": str(buyer_id), "role": "buyer"})

    mock_order = OrderResponse(
        id=order_id,
        buyer_id=buyer_id,
        artisan_id=artisan_id,
        product_id=product_id,
        quantity=3,
        unit_price=450.0,
        total_price=1350.0,
        status="pending",
        created_at=now,
        updated_at=now,
        items=[
            OrderItemResponse(
                id=uuid4(),
                order_id=order_id,
                artisan_id=artisan_id,
                product_id=product_id,
                quantity=3,
                unit_price=450.0,
                total_price=1350.0,
                created_at=now,
                artisan_business_name="Jaipur Crafts",
                product_title="Blue Pottery Mug",
            )
        ],
    )

    with patch("app.api.orders._service.create_direct_order", new=AsyncMock(return_value=mock_order)) as mock_create:
        response = client.post(
            "/api/orders/direct",
            json={
                "items": [{"product_id": str(product_id), "quantity": 3}],
                "shipping_address": "123 Craft Lane, Jaipur",
                "notes": "Fragile items",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == str(order_id)
        assert data["buyer_id"] == str(buyer_id)
        assert data["status"] == "pending"
        assert data["quantity"] == 3
        assert data["total_price"] == 1350.0
        assert len(data["items"]) == 1
        assert data["items"][0]["product_title"] == "Blue Pottery Mug"
        mock_create.assert_awaited_once_with(
            buyer_id=buyer_id,
            items=[(product_id, 3)],
            shipping_address="123 Craft Lane, Jaipur",
            notes="Fragile items",
        )


def test_create_direct_order_unauthenticated(client: TestClient) -> None:
    product_id = uuid4()
    response = client.post(
        "/api/orders/direct",
        json={"items": [{"product_id": str(product_id), "quantity": 1}]},
    )
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "AUTHENTICATION_REQUIRED"


def test_create_direct_order_artisan_forbidden(client: TestClient) -> None:
    artisan_user_id = uuid4()
    token = create_access_token({"sub": str(artisan_user_id), "role": "artisan"})
    product_id = uuid4()
    response = client.post(
        "/api/orders/direct",
        json={"items": [{"product_id": str(product_id), "quantity": 1}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "INSUFFICIENT_ROLE"


def test_create_direct_order_product_not_found(client: TestClient) -> None:
    buyer_id = uuid4()
    product_id = uuid4()
    token = create_access_token({"sub": str(buyer_id), "role": "buyer"})

    with patch(
        "app.api.orders._service.create_direct_order",
        new=AsyncMock(side_effect=ProductNotFoundError(f"Product '{product_id}' not found or not published.")),
    ):
        response = client.post(
            "/api/orders/direct",
            json={"items": [{"product_id": str(product_id), "quantity": 2}]},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "PRODUCT_NOT_FOUND"


def test_create_direct_order_insufficient_inventory(client: TestClient) -> None:
    buyer_id = uuid4()
    product_id = uuid4()
    token = create_access_token({"sub": str(buyer_id), "role": "buyer"})

    with patch(
        "app.api.orders._service.create_direct_order",
        new=AsyncMock(side_effect=InsufficientInventoryError("Insufficient stock for product.")),
    ):
        response = client.post(
            "/api/orders/direct",
            json={"items": [{"product_id": str(product_id), "quantity": 999}]},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 409
        assert response.json()["detail"]["code"] == "INVENTORY_INSUFFICIENT"


def test_create_direct_order_invalid_items(client: TestClient) -> None:
    buyer_id = uuid4()
    token = create_access_token({"sub": str(buyer_id), "role": "buyer"})

    # Empty items list (schema level validation)
    response = client.post(
        "/api/orders/direct",
        json={"items": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422

