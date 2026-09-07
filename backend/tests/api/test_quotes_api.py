from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.quotes import get_quote_service
from app.db.exceptions import DatabaseQueryError
from app.main import app
from app.schemas.quote import (
    QuoteArtisanAllocation,
    QuoteListResponse,
    QuoteResponse,
)
from app.services.quote.repository import (
    BuyerNotFoundError,
    ProductNotFoundError,
)
from app.services.quote.service import (
    QuoteMatchingError,
    QuoteService,
)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def make_quote_response(
    quote_id: UUID | None = None,
    buyer_id: UUID | None = None,
    quantity: int = 100,
    status: str = "pending",
) -> QuoteResponse:
    qid = quote_id or uuid4()
    bid = buyer_id or uuid4()
    aid = uuid4()
    now = datetime.now(timezone.utc)

    alloc = QuoteArtisanAllocation(
        id=uuid4(),
        quote_request_id=qid,
        artisan_id=aid,
        matched_quantity=100,
        match_score=0.91,
        status="matched",
        business_name="Sonar Bangla Crafts",
        artisan_name="Maya Das",
        city="Howrah",
        state="West Bengal",
        created_at=now,
    )

    return QuoteResponse(
        id=qid,
        buyer_id=bid,
        product_id=None,
        quantity=quantity,
        budget_per_unit=700.0,
        total_budget=70000.0,
        requirement_text="100 handmade jute bags for a hotel",
        status=status,
        created_at=now,
        updated_at=now,
        allocations=[alloc],
    )


# ===========================================================================
# 1. POST /api/quotes Tests
# ===========================================================================

def test_create_quote_success(client: TestClient) -> None:
    quote = make_quote_response()
    mock_service = MagicMock(spec=QuoteService)
    mock_service.create_quote = AsyncMock(return_value=quote)

    app.dependency_overrides[get_quote_service] = lambda: mock_service
    try:
        payload = {
            "buyer_id": str(quote.buyer_id),
            "requirement_text": "100 handmade jute bags for a hotel",
            "quantity": 100,
            "budget_per_unit": 700.0,
            "total_budget": 70000.0,
        }
        response = client.post("/api/quotes", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == str(quote.id)
        assert data["quantity"] == 100
        assert len(data["allocations"]) == 1
        assert data["allocations"][0]["matched_quantity"] == 100
        assert data["allocations"][0]["business_name"] == "Sonar Bangla Crafts"
    finally:
        app.dependency_overrides.pop(get_quote_service, None)


def test_create_quote_buyer_not_found(client: TestClient) -> None:
    mock_service = MagicMock(spec=QuoteService)
    mock_service.create_quote = AsyncMock(side_effect=BuyerNotFoundError("Buyer not found"))

    app.dependency_overrides[get_quote_service] = lambda: mock_service
    try:
        payload = {
            "buyer_id": str(uuid4()),
            "requirement_text": "100 handmade jute bags",
            "quantity": 100,
        }
        response = client.post("/api/quotes", json=payload)
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "BUYER_NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_quote_service, None)


def test_create_quote_product_not_found(client: TestClient) -> None:
    mock_service = MagicMock(spec=QuoteService)
    mock_service.create_quote = AsyncMock(side_effect=ProductNotFoundError("Product not found"))

    app.dependency_overrides[get_quote_service] = lambda: mock_service
    try:
        payload = {
            "buyer_id": str(uuid4()),
            "product_id": str(uuid4()),
            "requirement_text": "100 handmade jute bags",
            "quantity": 100,
        }
        response = client.post("/api/quotes", json=payload)
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "PRODUCT_NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_quote_service, None)


def test_create_quote_matching_failed(client: TestClient) -> None:
    mock_service = MagicMock(spec=QuoteService)
    mock_service.create_quote = AsyncMock(side_effect=QuoteMatchingError("Intent extraction failed"))

    app.dependency_overrides[get_quote_service] = lambda: mock_service
    try:
        payload = {
            "buyer_id": str(uuid4()),
            "requirement_text": "100 handmade jute bags",
            "quantity": 100,
        }
        response = client.post("/api/quotes", json=payload)
        assert response.status_code == 500
        assert response.json()["error"]["code"] == "MATCHING_FAILED"
    finally:
        app.dependency_overrides.pop(get_quote_service, None)


def test_create_quote_database_error(client: TestClient) -> None:
    mock_service = MagicMock(spec=QuoteService)
    mock_service.create_quote = AsyncMock(side_effect=DatabaseQueryError("DB error"))

    app.dependency_overrides[get_quote_service] = lambda: mock_service
    try:
        payload = {
            "buyer_id": str(uuid4()),
            "requirement_text": "100 handmade jute bags",
            "quantity": 100,
        }
        response = client.post("/api/quotes", json=payload)
        assert response.status_code == 500
        assert response.json()["error"]["code"] == "DATABASE_ERROR"
    finally:
        app.dependency_overrides.pop(get_quote_service, None)


def test_create_quote_invalid_quantity(client: TestClient) -> None:
    payload = {
        "buyer_id": str(uuid4()),
        "requirement_text": "100 handmade jute bags",
        "quantity": -5,
    }
    response = client.post("/api/quotes", json=payload)
    assert response.status_code == 422


def test_create_quote_empty_requirement_text(client: TestClient) -> None:
    payload = {
        "buyer_id": str(uuid4()),
        "requirement_text": "   ",
        "quantity": 10,
    }
    response = client.post("/api/quotes", json=payload)
    assert response.status_code == 422


# ===========================================================================
# 2. GET /api/quotes/{quote_id} Tests
# ===========================================================================

def test_get_quote_success(client: TestClient) -> None:
    quote = make_quote_response()
    mock_service = MagicMock(spec=QuoteService)
    mock_service.get_quote = AsyncMock(return_value=quote)

    app.dependency_overrides[get_quote_service] = lambda: mock_service
    try:
        response = client.get(f"/api/quotes/{quote.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(quote.id)
        assert len(data["allocations"]) == 1
        assert data["allocations"][0]["business_name"] == "Sonar Bangla Crafts"
    finally:
        app.dependency_overrides.pop(get_quote_service, None)


def test_get_quote_not_found(client: TestClient) -> None:
    mock_service = MagicMock(spec=QuoteService)
    mock_service.get_quote = AsyncMock(return_value=None)

    app.dependency_overrides[get_quote_service] = lambda: mock_service
    try:
        response = client.get(f"/api/quotes/{uuid4()}")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "QUOTE_NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_quote_service, None)


def test_get_quote_invalid_uuid(client: TestClient) -> None:
    response = client.get("/api/quotes/not-a-valid-uuid")
    assert response.status_code == 422


# ===========================================================================
# 3. GET /api/quotes List & Filter Tests
# ===========================================================================

def test_list_quotes_success(client: TestClient) -> None:
    q1 = make_quote_response()
    q2 = make_quote_response()
    mock_list = QuoteListResponse(quotes=[q1, q2], total=2, limit=50, offset=0)

    mock_service = MagicMock(spec=QuoteService)
    mock_service.list_quotes = AsyncMock(return_value=mock_list)

    app.dependency_overrides[get_quote_service] = lambda: mock_service
    try:
        response = client.get("/api/quotes")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["quotes"]) == 2
    finally:
        app.dependency_overrides.pop(get_quote_service, None)


def test_list_quotes_with_filters(client: TestClient) -> None:
    buyer_id = uuid4()
    mock_list = QuoteListResponse(quotes=[], total=0, limit=10, offset=5)

    mock_service = MagicMock(spec=QuoteService)
    mock_service.list_quotes = AsyncMock(return_value=mock_list)

    app.dependency_overrides[get_quote_service] = lambda: mock_service
    try:
        response = client.get(f"/api/quotes?buyer_id={buyer_id}&status=pending&limit=10&offset=5")
        assert response.status_code == 200
        mock_service.list_quotes.assert_awaited_once_with(
            buyer_id=buyer_id,
            status="pending",
            limit=10,
            offset=5,
        )
    finally:
        app.dependency_overrides.pop(get_quote_service, None)


def test_list_quotes_invalid_status(client: TestClient) -> None:
    response = client.get("/api/quotes?status=invalid_status")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_STATUS"
