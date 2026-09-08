from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncIterator
from uuid import uuid4

import pytest

from app.schemas.order import OrderResponse, QuoteAcceptResponse
from app.services.order.repository import (
    InsufficientInventoryError,
    InvalidOrderItemsError,
    NoAcceptableAllocationError,
    OrderAlreadyExistsError,
    OrderNotFoundError,
    OrderRepository,
    ProductNotFoundError,
    QuoteAlreadyAcceptedError,
    QuoteNotFoundError,
)
from app.services.order.service import OrderService


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

    async def fetchall(self) -> list[Any]:
        if self.fetch_sequence:
            res = self.fetch_sequence.pop(0)
            return res if isinstance(res, list) else [res]
        return []


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
async def test_accept_quote_success() -> None:
    now = datetime.now(timezone.utc)
    quote_id = uuid4()
    buyer_id = uuid4()
    artisan_id = uuid4()
    artisan_user_id = uuid4()
    order_id = uuid4()
    item_id = uuid4()

    fake_cursor = FakeCursor(
        fetch_sequence=[
            # 1. Fetch quote
            {
                "id": quote_id,
                "buyer_id": buyer_id,
                "product_id": None,
                "quantity": 100,
                "budget_per_unit": 500.0,
                "total_budget": 50000.0,
                "requirement_text": "Need 100 bags",
                "status": "pending",
            },
            # 2. Check existing order -> None
            None,
            # 3. Fetch allocations
            [
                {
                    "id": uuid4(),
                    "quote_request_id": quote_id,
                    "artisan_id": artisan_id,
                    "matched_quantity": 100,
                    "match_score": 0.95,
                    "status": "matched",
                    "artisan_user_id": artisan_user_id,
                    "artisan_business_name": "Bengal Jute",
                    "product_id": None,
                    "product_title": "Jute Bag",
                    "product_price": 500.0,
                }
            ],
            # 4. Insert order
            {
                "id": order_id,
                "buyer_id": buyer_id,
                "artisan_id": artisan_id,
                "product_id": None,
                "quote_request_id": quote_id,
                "quantity": 100,
                "unit_price": 500.0,
                "total_price": 50000.0,
                "status": "confirmed",
                "created_at": now,
                "updated_at": now,
            },
            # 5. Insert order item
            {
                "id": item_id,
                "order_id": order_id,
                "artisan_id": artisan_id,
                "product_id": None,
                "quantity": 100,
                "unit_price": 500.0,
                "total_price": 50000.0,
                "created_at": now,
            },
        ]
    )
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = OrderRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    service = OrderService(repository=repo)

    result = await service.accept_quote(quote_id)

    assert fake_tx.entered is True
    assert fake_tx.exited is True
    assert fake_tx.rolled_back is False
    assert result.quote_id == quote_id
    assert result.order.id == order_id
    assert result.order.quantity == 100
    assert result.order.total_price == 50000.0
    assert len(result.order.items) == 1
    assert result.order.items[0].artisan_id == artisan_id


@pytest.mark.anyio
async def test_accept_quote_not_found() -> None:
    fake_cursor = FakeCursor(fetch_sequence=[None])  # Quote not found
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = OrderRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    service = OrderService(repository=repo)

    with pytest.raises(QuoteNotFoundError):
        await service.accept_quote(uuid4())

    assert fake_tx.rolled_back is True


@pytest.mark.anyio
async def test_accept_quote_already_accepted() -> None:
    fake_cursor = FakeCursor(
        fetch_sequence=[
            {
                "id": uuid4(),
                "buyer_id": uuid4(),
                "product_id": None,
                "quantity": 10,
                "budget_per_unit": 100.0,
                "total_budget": 1000.0,
                "requirement_text": "Need bags",
                "status": "accepted",  # Already accepted!
            }
        ]
    )
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = OrderRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    service = OrderService(repository=repo)

    with pytest.raises(QuoteAlreadyAcceptedError):
        await service.accept_quote(uuid4())

    assert fake_tx.rolled_back is True


@pytest.mark.anyio
async def test_accept_quote_order_already_exists() -> None:
    quote_id = uuid4()
    fake_cursor = FakeCursor(
        fetch_sequence=[
            {
                "id": quote_id,
                "buyer_id": uuid4(),
                "product_id": None,
                "quantity": 10,
                "budget_per_unit": 100.0,
                "total_budget": 1000.0,
                "requirement_text": "Need bags",
                "status": "pending",
            },
            {"id": uuid4()},  # Existing order found
        ]
    )
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = OrderRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    service = OrderService(repository=repo)

    with pytest.raises(OrderAlreadyExistsError):
        await service.accept_quote(quote_id)

    assert fake_tx.rolled_back is True


@pytest.mark.anyio
async def test_accept_quote_no_allocations() -> None:
    quote_id = uuid4()
    fake_cursor = FakeCursor(
        fetch_sequence=[
            {
                "id": quote_id,
                "buyer_id": uuid4(),
                "product_id": None,
                "quantity": 10,
                "budget_per_unit": 100.0,
                "total_budget": 1000.0,
                "requirement_text": "Need bags",
                "status": "pending",
            },
            None,  # No existing order
            [],    # Empty allocations!
        ]
    )
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = OrderRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    service = OrderService(repository=repo)

    with pytest.raises(NoAcceptableAllocationError):
        await service.accept_quote(quote_id)

    assert fake_tx.rolled_back is True


@pytest.mark.anyio
async def test_accept_quote_insufficient_inventory() -> None:
    quote_id = uuid4()
    product_id = uuid4()
    fake_cursor = FakeCursor(
        fetch_sequence=[
            {
                "id": quote_id,
                "buyer_id": uuid4(),
                "product_id": product_id,
                "quantity": 50,
                "budget_per_unit": 100.0,
                "total_budget": 5000.0,
                "requirement_text": "Need bags",
                "status": "pending",
            },
            None,  # No existing order
            [      # Allocations found
                {
                    "id": uuid4(),
                    "quote_request_id": quote_id,
                    "artisan_id": uuid4(),
                    "matched_quantity": 50,
                    "match_score": 0.9,
                    "status": "matched",
                    "artisan_user_id": uuid4(),
                    "artisan_business_name": "Studio",
                    "product_id": product_id,
                    "product_title": "Product Title",
                    "product_price": 100.0,
                }
            ],
            None,  # Inventory deduction returns None -> Insufficient!
        ]
    )
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = OrderRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    service = OrderService(repository=repo)

    with pytest.raises(InsufficientInventoryError):
        await service.accept_quote(quote_id)

    assert fake_tx.rolled_back is True


@pytest.mark.anyio
async def test_create_direct_order_success() -> None:
    now = datetime.now(timezone.utc)
    buyer_id = uuid4()
    artisan_id = uuid4()
    artisan_user_id = uuid4()
    product_id = uuid4()
    order_id = uuid4()
    item_id = uuid4()

    fake_cursor = FakeCursor(
        fetch_sequence=[
            # 1. Fetch product
            {
                "id": product_id,
                "artisan_id": artisan_id,
                "title": "Terracotta Pot",
                "price": 350.0,
                "status": "published",
                "artisan_user_id": artisan_user_id,
                "artisan_business_name": "Pottery Hub",
            },
            # 2. Inventory deduction
            {"available_quantity": 48},
            # 3. Insert order
            {
                "id": order_id,
                "buyer_id": buyer_id,
                "artisan_id": artisan_id,
                "product_id": product_id,
                "quote_request_id": None,
                "quantity": 2,
                "unit_price": 350.0,
                "total_price": 700.0,
                "status": "pending",
                "created_at": now,
                "updated_at": now,
            },
            # 4. Insert order item
            {
                "id": item_id,
                "order_id": order_id,
                "artisan_id": artisan_id,
                "product_id": product_id,
                "quantity": 2,
                "unit_price": 350.0,
                "total_price": 700.0,
                "created_at": now,
            },
        ]
    )
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = OrderRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    service = OrderService(repository=repo)

    result = await service.create_direct_order(
        buyer_id=buyer_id,
        items=[(product_id, 2)],
        shipping_address="789 Market Rd",
        notes="Please pack securely",
    )

    assert result.id == order_id
    assert result.buyer_id == buyer_id
    assert result.status == "pending"
    assert result.quantity == 2
    assert result.total_price == 700.0
    assert len(result.items) == 1
    assert result.items[0].product_title == "Terracotta Pot"
    assert result.items[0].artisan_business_name == "Pottery Hub"
    assert fake_tx.entered is True
    assert fake_tx.exited is True
    assert fake_tx.rolled_back is False


@pytest.mark.anyio
async def test_create_direct_order_product_not_found() -> None:
    buyer_id = uuid4()
    product_id = uuid4()

    fake_cursor = FakeCursor(
        fetch_sequence=[
            None,  # Product not found
        ]
    )
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = OrderRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    service = OrderService(repository=repo)

    with pytest.raises(ProductNotFoundError):
        await service.create_direct_order(
            buyer_id=buyer_id,
            items=[(product_id, 1)],
        )

    assert fake_tx.rolled_back is True


@pytest.mark.anyio
async def test_create_direct_order_insufficient_stock() -> None:
    buyer_id = uuid4()
    product_id = uuid4()
    artisan_id = uuid4()

    fake_cursor = FakeCursor(
        fetch_sequence=[
            # 1. Product found
            {
                "id": product_id,
                "artisan_id": artisan_id,
                "title": "Terracotta Pot",
                "price": 350.0,
                "status": "published",
                "artisan_user_id": uuid4(),
                "artisan_business_name": "Pottery Hub",
            },
            # 2. Inventory deduction returns None (insufficient stock)
            None,
        ]
    )
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = OrderRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    service = OrderService(repository=repo)

    with pytest.raises(InsufficientInventoryError):
        await service.create_direct_order(
            buyer_id=buyer_id,
            items=[(product_id, 100)],
        )

    assert fake_tx.rolled_back is True


@pytest.mark.anyio
async def test_create_direct_order_empty_items() -> None:
    fake_cursor = FakeCursor()
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = OrderRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    service = OrderService(repository=repo)

    with pytest.raises(InvalidOrderItemsError):
        await service.create_direct_order(
            buyer_id=uuid4(),
            items=[],
        )

