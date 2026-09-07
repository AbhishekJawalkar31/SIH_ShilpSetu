from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.products import get_product_repository
from app.db.exceptions import DatabaseQueryError
from app.main import app
from app.schemas.product import ProductListResponse, ProductResponse


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def make_product(product_id: UUID | None = None, artisan_id: UUID | None = None) -> ProductResponse:
    return ProductResponse(
        id=product_id or uuid4(),
        artisan_id=artisan_id or uuid4(),
        title="Terracotta Vase",
        description="Earthy handmade vase",
        category="Pottery & Clay Objects",
        material="Clay",
        craft_type="Terracotta",
        tags=["vase", "terracotta"],
        attributes={"color": "terracotta red"},
        price=550.0,
        currency="INR",
        image_url="product-images/vase.jpg",
        status="published",
        available_quantity=25,
        production_capacity=100,
        unit="piece",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def test_list_products_success(client: TestClient) -> None:
    p1 = make_product()
    p2 = make_product()
    mock_list_response = ProductListResponse(
        products=[p1, p2],
        total=2,
        limit=50,
        offset=0,
    )

    mock_repo = MagicMock()
    mock_repo.list_products = AsyncMock(return_value=mock_list_response)

    app.dependency_overrides[get_product_repository] = lambda: mock_repo
    try:
        response = client.get("/api/products")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["products"]) == 2
        assert data["products"][0]["title"] == "Terracotta Vase"
        assert data["products"][0]["available_quantity"] == 25
    finally:
        app.dependency_overrides.pop(get_product_repository, None)


def test_list_products_filtering_and_pagination(client: TestClient) -> None:
    artisan_id = uuid4()
    mock_list_response = ProductListResponse(
        products=[],
        total=0,
        limit=10,
        offset=5,
    )

    mock_repo = MagicMock()
    mock_repo.list_products = AsyncMock(return_value=mock_list_response)

    app.dependency_overrides[get_product_repository] = lambda: mock_repo
    try:
        response = client.get(
            f"/api/products?artisan_id={artisan_id}&category=Clay&craft_type=Terracotta&status=published&limit=10&offset=5"
        )
        assert response.status_code == 200
        mock_repo.list_products.assert_awaited_once_with(
            artisan_id=artisan_id,
            category="Clay",
            craft_type="Terracotta",
            status="published",
            limit=10,
            offset=5,
        )
    finally:
        app.dependency_overrides.pop(get_product_repository, None)


def test_list_products_invalid_status(client: TestClient) -> None:
    response = client.get("/api/products?status=invalid_status")
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "INVALID_STATUS"


def test_list_products_database_error(client: TestClient) -> None:
    mock_repo = MagicMock()
    mock_repo.list_products = AsyncMock(side_effect=DatabaseQueryError("DB error"))

    app.dependency_overrides[get_product_repository] = lambda: mock_repo
    try:
        response = client.get("/api/products")
        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "DATABASE_ERROR"
    finally:
        app.dependency_overrides.pop(get_product_repository, None)


def test_get_product_exists(client: TestClient) -> None:
    product_id = uuid4()
    product = make_product(product_id=product_id)

    mock_repo = MagicMock()
    mock_repo.get_product_by_id = AsyncMock(return_value=product)

    app.dependency_overrides[get_product_repository] = lambda: mock_repo
    try:
        response = client.get(f"/api/products/{product_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(product_id)
        assert data["title"] == "Terracotta Vase"
        assert data["price"] == 550.0
        assert data["available_quantity"] == 25
        assert data["production_capacity"] == 100
        assert data["unit"] == "piece"
    finally:
        app.dependency_overrides.pop(get_product_repository, None)


def test_get_product_not_found(client: TestClient) -> None:
    product_id = uuid4()
    mock_repo = MagicMock()
    mock_repo.get_product_by_id = AsyncMock(return_value=None)

    app.dependency_overrides[get_product_repository] = lambda: mock_repo
    try:
        response = client.get(f"/api/products/{product_id}")
        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == "PRODUCT_NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_product_repository, None)


def test_get_product_invalid_uuid(client: TestClient) -> None:
    response = client.get("/api/products/not-a-valid-uuid")
    assert response.status_code == 422


def test_get_product_database_error(client: TestClient) -> None:
    product_id = uuid4()
    mock_repo = MagicMock()
    mock_repo.get_product_by_id = AsyncMock(side_effect=DatabaseQueryError("DB error"))

    app.dependency_overrides[get_product_repository] = lambda: mock_repo
    try:
        response = client.get(f"/api/products/{product_id}")
        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "DATABASE_ERROR"
    finally:
        app.dependency_overrides.pop(get_product_repository, None)
