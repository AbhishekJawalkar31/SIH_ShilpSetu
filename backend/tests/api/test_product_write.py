from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncIterator
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.products import get_product_write_repository
from app.db.exceptions import DatabaseError, DatabaseQueryError
from app.main import app
from app.schemas.product import ProductResponse
from app.schemas.product_write import InventoryUpdateRequest, ProductCreateRequest
from app.services.product.write_repository import (
    ArtisanNotFoundError,
    ProductNotFoundError,
    ProductWriteRepository,
)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def make_product_response(
    product_id: UUID | None = None,
    artisan_id: UUID | None = None,
    title: str = "Handcrafted Brass Bell",
    price: float | None = 750.0,
    available_quantity: int = 40,
    production_capacity: int = 150,
    unit: str = "piece",
    status: str = "published",
) -> ProductResponse:
    return ProductResponse(
        id=product_id or uuid4(),
        artisan_id=artisan_id or uuid4(),
        title=title,
        description="Authentic handmade bell",
        category="Metal Craft",
        material="Brass",
        craft_type="Metal Casting",
        tags=["brass", "bell"],
        attributes={"weight": "500g"},
        price=price,
        currency="INR",
        image_url="product-images/bell.jpg",
        status=status,
        available_quantity=available_quantity,
        production_capacity=production_capacity,
        unit=unit,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


# ===========================================================================
# 1. Product Create Endpoint Tests
# ===========================================================================

def test_create_product_success(client: TestClient) -> None:
    artisan_id = uuid4()
    product_id = uuid4()
    mock_resp = make_product_response(product_id=product_id, artisan_id=artisan_id)

    mock_write_repo = MagicMock()
    mock_write_repo.create_product = AsyncMock(return_value=mock_resp)

    app.dependency_overrides[get_product_write_repository] = lambda: mock_write_repo
    try:
        payload = {
            "artisan_id": str(artisan_id),
            "title": "Handcrafted Brass Bell",
            "description": "Authentic handmade bell",
            "category": "Metal Craft",
            "material": "Brass",
            "craft_type": "Metal Casting",
            "tags": ["brass", "bell"],
            "attributes": {"weight": "500g"},
            "price": 750.0,
            "currency": "INR",
            "image_url": "product-images/bell.jpg",
            "status": "published",
            "available_quantity": 40,
            "production_capacity": 150,
            "unit": "piece",
        }
        response = client.post("/api/products", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == str(product_id)
        assert data["title"] == "Handcrafted Brass Bell"
        assert data["available_quantity"] == 40
        assert data["production_capacity"] == 150
        mock_write_repo.create_product.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_product_write_repository, None)


def test_create_product_artisan_not_found(client: TestClient) -> None:
    artisan_id = uuid4()
    mock_write_repo = MagicMock()
    mock_write_repo.create_product = AsyncMock(side_effect=ArtisanNotFoundError("Artisan not found"))

    app.dependency_overrides[get_product_write_repository] = lambda: mock_write_repo
    try:
        payload = {
            "artisan_id": str(artisan_id),
            "title": "Handcrafted Brass Bell",
            "description": "Authentic handmade bell",
        }
        response = client.post("/api/products", json=payload)
        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == "ARTISAN_NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_product_write_repository, None)


def test_create_product_invalid_uuid(client: TestClient) -> None:
    payload = {
        "artisan_id": "not-a-valid-uuid",
        "title": "Handcrafted Brass Bell",
        "description": "Authentic handmade bell",
    }
    response = client.post("/api/products", json=payload)
    assert response.status_code == 422


def test_create_product_empty_title(client: TestClient) -> None:
    payload = {
        "artisan_id": str(uuid4()),
        "title": "   ",
        "description": "Authentic handmade bell",
    }
    response = client.post("/api/products", json=payload)
    assert response.status_code == 422


def test_create_product_negative_price(client: TestClient) -> None:
    payload = {
        "artisan_id": str(uuid4()),
        "title": "Handcrafted Brass Bell",
        "description": "Authentic handmade bell",
        "price": -10.0,
    }
    response = client.post("/api/products", json=payload)
    assert response.status_code == 422


def test_create_product_invalid_status(client: TestClient) -> None:
    payload = {
        "artisan_id": str(uuid4()),
        "title": "Handcrafted Brass Bell",
        "description": "Authentic handmade bell",
        "status": "discontinued",
    }
    response = client.post("/api/products", json=payload)
    assert response.status_code == 422


def test_create_product_database_failure(client: TestClient) -> None:
    mock_write_repo = MagicMock()
    mock_write_repo.create_product = AsyncMock(side_effect=DatabaseQueryError("DB error"))

    app.dependency_overrides[get_product_write_repository] = lambda: mock_write_repo
    try:
        payload = {
            "artisan_id": str(uuid4()),
            "title": "Handcrafted Brass Bell",
            "description": "Authentic handmade bell",
        }
        response = client.post("/api/products", json=payload)
        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "DATABASE_ERROR"
    finally:
        app.dependency_overrides.pop(get_product_write_repository, None)


# ===========================================================================
# 2. Inventory Update Endpoint Tests
# ===========================================================================

def test_update_inventory_success(client: TestClient) -> None:
    product_id = uuid4()
    mock_resp = make_product_response(
        product_id=product_id,
        available_quantity=100,
        production_capacity=500,
        unit="set",
    )

    mock_write_repo = MagicMock()
    mock_write_repo.update_inventory = AsyncMock(return_value=mock_resp)

    app.dependency_overrides[get_product_write_repository] = lambda: mock_write_repo
    try:
        payload = {
            "available_quantity": 100,
            "production_capacity": 500,
            "unit": "set",
        }
        response = client.put(f"/api/products/{product_id}/inventory", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(product_id)
        assert data["available_quantity"] == 100
        assert data["production_capacity"] == 500
        assert data["unit"] == "set"
        mock_write_repo.update_inventory.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_product_write_repository, None)


def test_update_inventory_product_not_found(client: TestClient) -> None:
    product_id = uuid4()
    mock_write_repo = MagicMock()
    mock_write_repo.update_inventory = AsyncMock(side_effect=ProductNotFoundError("Product not found"))

    app.dependency_overrides[get_product_write_repository] = lambda: mock_write_repo
    try:
        payload = {
            "available_quantity": 10,
            "production_capacity": 50,
            "unit": "piece",
        }
        response = client.put(f"/api/products/{product_id}/inventory", json=payload)
        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == "PRODUCT_NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_product_write_repository, None)


def test_update_inventory_invalid_uuid(client: TestClient) -> None:
    payload = {
        "available_quantity": 10,
        "production_capacity": 50,
        "unit": "piece",
    }
    response = client.put("/api/products/invalid-uuid/inventory", json=payload)
    assert response.status_code == 422


def test_update_inventory_negative_available_quantity(client: TestClient) -> None:
    payload = {
        "available_quantity": -5,
        "production_capacity": 50,
        "unit": "piece",
    }
    response = client.put(f"/api/products/{uuid4()}/inventory", json=payload)
    assert response.status_code == 422


def test_update_inventory_negative_production_capacity(client: TestClient) -> None:
    payload = {
        "available_quantity": 10,
        "production_capacity": -20,
        "unit": "piece",
    }
    response = client.put(f"/api/products/{uuid4()}/inventory", json=payload)
    assert response.status_code == 422


def test_update_inventory_database_failure(client: TestClient) -> None:
    product_id = uuid4()
    mock_write_repo = MagicMock()
    mock_write_repo.update_inventory = AsyncMock(side_effect=DatabaseQueryError("DB error"))

    app.dependency_overrides[get_product_write_repository] = lambda: mock_write_repo
    try:
        payload = {
            "available_quantity": 10,
            "production_capacity": 50,
            "unit": "piece",
        }
        response = client.put(f"/api/products/{product_id}/inventory", json=payload)
        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "DATABASE_ERROR"
    finally:
        app.dependency_overrides.pop(get_product_write_repository, None)


# ===========================================================================
# 3. Write Repository Transaction & Rollback Unit Tests
# ===========================================================================

class FakeTransactionContext:
    def __init__(self) -> None:
        self.entered = False
        self.exited = False
        self.rolled_back = False

    async def __aenter__(self) -> "FakeTransactionContext":
        self.entered = True
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.exited = True
        if exc_type is not None:
            self.rolled_back = True


class FakeCursor:
    def __init__(self, fetch_sequence: list[Any] | None = None) -> None:
        self.fetch_sequence = list(fetch_sequence or [])
        self.executed: list[tuple[str, Any]] = []

    async def execute(self, query: str, params: Any = None) -> None:
        self.executed.append((query, params))

    async def fetchone(self) -> Any:
        if self.fetch_sequence:
            return self.fetch_sequence.pop(0)
        return None


class FakeConnection:
    def __init__(self, cursor: FakeCursor, tx: FakeTransactionContext) -> None:
        self._cursor = cursor
        self._tx = tx

    def transaction(self) -> FakeTransactionContext:
        return self._tx

    @asynccontextmanager
    async def cursor(self, row_factory: Any = None) -> AsyncIterator[FakeCursor]:
        yield self._cursor


class FakePoolManager:
    def __init__(self, connection: FakeConnection) -> None:
        self._connection = connection

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[FakeConnection]:
        yield self._connection


@pytest.mark.anyio
async def test_repository_create_product_transaction_success() -> None:
    now = datetime.now(timezone.utc)
    new_product_id = uuid4()
    artisan_id = uuid4()

    fake_cursor = FakeCursor(
        fetch_sequence=[
            {"id": artisan_id},  # 1. Artisan check returns artisan
            {  # 2. Product insertion returns row
                "id": new_product_id,
                "artisan_id": artisan_id,
                "title": "Clay Pot",
                "description": "Handmade pot",
                "category": "Pottery",
                "material": "Clay",
                "craft_type": "Pottery",
                "tags": ["clay"],
                "attributes": {},
                "price": 250.0,
                "currency": "INR",
                "image_url": None,
                "status": "draft",
                "created_at": now,
                "updated_at": now,
            },
            {  # 3. Inventory insertion returns row
                "available_quantity": 20,
                "production_capacity": 50,
                "unit": "piece",
            },
        ]
    )
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = ProductWriteRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    req = ProductCreateRequest(
        artisan_id=artisan_id,
        title="Clay Pot",
        description="Handmade pot",
        price=250.0,
        available_quantity=20,
        production_capacity=50,
    )

    result = await repo.create_product(req)

    assert fake_tx.entered is True
    assert fake_tx.exited is True
    assert fake_tx.rolled_back is False
    assert result.id == new_product_id
    assert result.available_quantity == 20
    assert result.production_capacity == 50


@pytest.mark.anyio
async def test_repository_create_product_rollback_on_artisan_missing() -> None:
    artisan_id = uuid4()
    fake_cursor = FakeCursor(fetch_sequence=[None])  # Artisan not found
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = ProductWriteRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    req = ProductCreateRequest(
        artisan_id=artisan_id,
        title="Clay Pot",
        description="Handmade pot",
    )

    with pytest.raises(ArtisanNotFoundError):
        await repo.create_product(req)

    assert fake_tx.entered is True
    assert fake_tx.rolled_back is True


@pytest.mark.anyio
async def test_repository_create_product_rollback_on_inventory_failure() -> None:
    now = datetime.now(timezone.utc)
    new_product_id = uuid4()
    artisan_id = uuid4()

    fake_cursor = FakeCursor(
        fetch_sequence=[
            {"id": artisan_id},  # 1. Artisan check succeeds
            {  # 2. Product insert succeeds
                "id": new_product_id,
                "artisan_id": artisan_id,
                "title": "Clay Pot",
                "description": "Handmade pot",
                "category": None,
                "material": None,
                "craft_type": None,
                "tags": [],
                "attributes": {},
                "price": None,
                "currency": "INR",
                "image_url": None,
                "status": "draft",
                "created_at": now,
                "updated_at": now,
            },
            None,  # 3. Inventory insert fails (returns None)
        ]
    )
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = ProductWriteRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    req = ProductCreateRequest(
        artisan_id=artisan_id,
        title="Clay Pot",
        description="Handmade pot",
    )

    with pytest.raises(DatabaseError):
        await repo.create_product(req)

    assert fake_tx.entered is True
    assert fake_tx.rolled_back is True


@pytest.mark.anyio
async def test_repository_update_inventory_rollback_on_product_missing() -> None:
    product_id = uuid4()
    fake_cursor = FakeCursor(fetch_sequence=[None])  # Product not found
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = ProductWriteRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    req = InventoryUpdateRequest(
        available_quantity=30,
        production_capacity=100,
        unit="piece",
    )

    with pytest.raises(ProductNotFoundError):
        await repo.update_inventory(product_id, req)

    assert fake_tx.entered is True
    assert fake_tx.rolled_back is True
