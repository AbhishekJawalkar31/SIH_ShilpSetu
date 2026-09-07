from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.artisans import get_artisan_repository, get_product_repository
from app.db.exceptions import DatabaseError, DatabaseQueryError
from app.main import app
from app.schemas.artisan import ArtisanProfileResponse
from app.schemas.product import ProductResponse


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def make_artisan_response(artisan_id: UUID | None = None) -> ArtisanProfileResponse:
    return ArtisanProfileResponse(
        id=artisan_id or uuid4(),
        user_id=uuid4(),
        name="Anita Devi",
        business_name="Bengal Jute Studio",
        craft_type="Jute Craft",
        description="Master artisan profile",
        location="Kolkata, West Bengal, India",
        city="Kolkata",
        state="West Bengal",
        country="India",
        languages=["Hindi", "Bengali"],
        rating=4.5,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def make_product_response(artisan_id: UUID | None = None, product_id: UUID | None = None) -> ProductResponse:
    return ProductResponse(
        id=product_id or uuid4(),
        artisan_id=artisan_id or uuid4(),
        title="Jute Tote Bag",
        description="Handmade eco-friendly bag",
        category="Jute & Natural Fibre",
        material="Jute",
        craft_type="Jute Craft",
        tags=["eco-friendly", "jute"],
        attributes={"color": "natural"},
        price=430.0,
        currency="INR",
        image_url="product-images/test.jpg",
        status="published",
        available_quantity=50,
        production_capacity=200,
        unit="piece",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def test_get_artisan_exists(client: TestClient) -> None:
    artisan_id = uuid4()
    mock_artisan = make_artisan_response(artisan_id)

    mock_artisan_repo = MagicMock()
    mock_artisan_repo.get_artisan_by_id = AsyncMock(return_value=mock_artisan)

    app.dependency_overrides[get_artisan_repository] = lambda: mock_artisan_repo
    try:
        response = client.get(f"/api/artisans/{artisan_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(artisan_id)
        assert data["name"] == "Anita Devi"
        assert data["business_name"] == "Bengal Jute Studio"
        assert data["craft_type"] == "Jute Craft"
        assert data["city"] == "Kolkata"
        assert data["rating"] == 4.5
    finally:
        app.dependency_overrides.pop(get_artisan_repository, None)


def test_get_artisan_not_found(client: TestClient) -> None:
    artisan_id = uuid4()
    mock_artisan_repo = MagicMock()
    mock_artisan_repo.get_artisan_by_id = AsyncMock(return_value=None)

    app.dependency_overrides[get_artisan_repository] = lambda: mock_artisan_repo
    try:
        response = client.get(f"/api/artisans/{artisan_id}")
        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == "ARTISAN_NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_artisan_repository, None)


def test_get_artisan_invalid_uuid(client: TestClient) -> None:
    response = client.get("/api/artisans/invalid-uuid")
    assert response.status_code == 422


def test_get_artisan_database_error(client: TestClient) -> None:
    artisan_id = uuid4()
    mock_artisan_repo = MagicMock()
    mock_artisan_repo.get_artisan_by_id = AsyncMock(side_effect=DatabaseQueryError("DB error"))

    app.dependency_overrides[get_artisan_repository] = lambda: mock_artisan_repo
    try:
        response = client.get(f"/api/artisans/{artisan_id}")
        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "DATABASE_ERROR"
    finally:
        app.dependency_overrides.pop(get_artisan_repository, None)


def test_get_artisan_products_success(client: TestClient) -> None:
    artisan_id = uuid4()
    mock_artisan = make_artisan_response(artisan_id)
    mock_products = [
        make_product_response(artisan_id=artisan_id),
        make_product_response(artisan_id=artisan_id),
    ]

    mock_artisan_repo = MagicMock()
    mock_artisan_repo.get_artisan_by_id = AsyncMock(return_value=mock_artisan)

    mock_product_repo = MagicMock()
    mock_product_repo.list_artisan_products = AsyncMock(return_value=mock_products)

    app.dependency_overrides[get_artisan_repository] = lambda: mock_artisan_repo
    app.dependency_overrides[get_product_repository] = lambda: mock_product_repo
    try:
        response = client.get(f"/api/artisans/{artisan_id}/products")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["artisan_id"] == str(artisan_id)
        assert data[1]["artisan_id"] == str(artisan_id)
    finally:
        app.dependency_overrides.pop(get_artisan_repository, None)
        app.dependency_overrides.pop(get_product_repository, None)


def test_get_artisan_products_empty(client: TestClient) -> None:
    artisan_id = uuid4()
    mock_artisan = make_artisan_response(artisan_id)

    mock_artisan_repo = MagicMock()
    mock_artisan_repo.get_artisan_by_id = AsyncMock(return_value=mock_artisan)

    mock_product_repo = MagicMock()
    mock_product_repo.list_artisan_products = AsyncMock(return_value=[])

    app.dependency_overrides[get_artisan_repository] = lambda: mock_artisan_repo
    app.dependency_overrides[get_product_repository] = lambda: mock_product_repo
    try:
        response = client.get(f"/api/artisans/{artisan_id}/products")
        assert response.status_code == 200
        data = response.json()
        assert data == []
    finally:
        app.dependency_overrides.pop(get_artisan_repository, None)
        app.dependency_overrides.pop(get_product_repository, None)


def test_get_artisan_products_artisan_not_found(client: TestClient) -> None:
    artisan_id = uuid4()
    mock_artisan_repo = MagicMock()
    mock_artisan_repo.get_artisan_by_id = AsyncMock(return_value=None)

    app.dependency_overrides[get_artisan_repository] = lambda: mock_artisan_repo
    try:
        response = client.get(f"/api/artisans/{artisan_id}/products")
        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == "ARTISAN_NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_artisan_repository, None)


def test_get_artisan_products_database_error(client: TestClient) -> None:
    artisan_id = uuid4()
    mock_artisan = make_artisan_response(artisan_id)

    mock_artisan_repo = MagicMock()
    mock_artisan_repo.get_artisan_by_id = AsyncMock(return_value=mock_artisan)

    mock_product_repo = MagicMock()
    mock_product_repo.list_artisan_products = AsyncMock(side_effect=DatabaseQueryError("DB error"))

    app.dependency_overrides[get_artisan_repository] = lambda: mock_artisan_repo
    app.dependency_overrides[get_product_repository] = lambda: mock_product_repo
    try:
        response = client.get(f"/api/artisans/{artisan_id}/products")
        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "DATABASE_ERROR"
    finally:
        app.dependency_overrides.pop(get_artisan_repository, None)
        app.dependency_overrides.pop(get_product_repository, None)
