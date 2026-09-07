from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.products import get_embedding_sync_service, get_product_write_repository
from app.main import app
from app.schemas.product import ProductResponse
from app.services.product.embedding_sync import ProductEmbeddingSyncService, SyncResult


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def make_product_response(product_id: UUID, artisan_id: UUID) -> ProductResponse:
    return ProductResponse(
        id=product_id,
        artisan_id=artisan_id,
        title="Terracotta Planter",
        description="Handcrafted terracotta planter",
        category="Pottery",
        material="Clay",
        craft_type="Terracotta",
        tags=["planter", "terracotta"],
        attributes={"size": "medium"},
        price=350.0,
        currency="INR",
        image_url=None,
        status="published",
        available_quantity=20,
        production_capacity=80,
        unit="piece",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def test_create_product_calls_sync_after_commit(client: TestClient) -> None:
    artisan_id = uuid4()
    product_id = uuid4()
    mock_product = make_product_response(product_id=product_id, artisan_id=artisan_id)

    call_order: list[str] = []

    async def mock_create_product(body: Any) -> ProductResponse:
        call_order.append("create_product")
        return mock_product

    async def mock_sync_product(product: ProductResponse) -> SyncResult:
        call_order.append("sync_product")
        return SyncResult(success=True, product_id=product.id)

    mock_write_repo = MagicMock()
    mock_write_repo.create_product = AsyncMock(side_effect=mock_create_product)

    mock_sync_service = MagicMock()
    mock_sync_service.sync_product = AsyncMock(side_effect=mock_sync_product)

    app.dependency_overrides[get_product_write_repository] = lambda: mock_write_repo
    app.dependency_overrides[get_embedding_sync_service] = lambda: mock_sync_service
    try:
        payload = {
            "artisan_id": str(artisan_id),
            "title": "Terracotta Planter",
            "description": "Handcrafted terracotta planter",
            "price": 350.0,
        }
        response = client.post("/api/products", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == str(product_id)

        # Confirm create_product completed BEFORE sync_product was called
        assert call_order == ["create_product", "sync_product"]
    finally:
        app.dependency_overrides.pop(get_product_write_repository, None)
        app.dependency_overrides.pop(get_embedding_sync_service, None)


def test_create_product_succeeds_even_if_embedding_sync_fails(client: TestClient) -> None:
    artisan_id = uuid4()
    product_id = uuid4()
    mock_product = make_product_response(product_id=product_id, artisan_id=artisan_id)

    mock_write_repo = MagicMock()
    mock_write_repo.create_product = AsyncMock(return_value=mock_product)

    mock_sync_service = MagicMock()
    mock_sync_service.sync_product = AsyncMock(
        return_value=SyncResult(
            success=False,
            product_id=product_id,
            error_message="Gemini quota exceeded",
        )
    )

    app.dependency_overrides[get_product_write_repository] = lambda: mock_write_repo
    app.dependency_overrides[get_embedding_sync_service] = lambda: mock_sync_service
    try:
        payload = {
            "artisan_id": str(artisan_id),
            "title": "Terracotta Planter",
            "description": "Handcrafted terracotta planter",
            "price": 350.0,
        }
        response = client.post("/api/products", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == str(product_id)
        # Product creation was not cancelled or deleted
        mock_write_repo.create_product.assert_awaited_once()
        mock_sync_service.sync_product.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_product_write_repository, None)
        app.dependency_overrides.pop(get_embedding_sync_service, None)
