from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncIterator
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest

from app.db.exceptions import DatabaseQueryError
from app.schemas.quote import QuoteCreateRequest
from app.services.quote.repository import (
    BuyerNotFoundError,
    ProductNotFoundError,
    QuoteRepository,
)
from app.services.quote.service import (
    QuoteMatchingError,
    QuoteService,
)
from app.services.search.ranking import RankedCandidate
from app.services.search.repository import CandidateProduct
from app.services.search.service import SearchIntent, SearchResult, SearchServiceError


# ===========================================================================
# 1. Quote Repository Unit Tests with Fake Transaction Leases
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
async def test_repository_create_quote_success() -> None:
    now = datetime.now(timezone.utc)
    quote_id = uuid4()
    buyer_id = uuid4()
    artisan_id = uuid4()
    alloc_id = uuid4()

    fake_cursor = FakeCursor(
        fetch_sequence=[
            {"id": buyer_id, "role": "buyer"},  # 1. Buyer check
            {  # 2. Quote insert
                "id": quote_id,
                "buyer_id": buyer_id,
                "product_id": None,
                "quantity": 50,
                "budget_per_unit": 600.0,
                "total_budget": 30000.0,
                "requirement_text": "Need 50 jute bags",
                "status": "pending",
                "created_at": now,
                "updated_at": now,
            },
            {  # 3. Allocation insert
                "id": alloc_id,
                "quote_request_id": quote_id,
                "artisan_id": artisan_id,
                "matched_quantity": 50,
                "match_score": 0.95,
                "status": "matched",
                "created_at": now,
            },
        ]
    )
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = QuoteRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    req = QuoteCreateRequest(
        buyer_id=buyer_id,
        requirement_text="Need 50 jute bags",
        quantity=50,
        budget_per_unit=600.0,
    )

    result = await repo.create_quote_with_allocations(
        request=req,
        allocations=[
            {
                "artisan_id": artisan_id,
                "matched_quantity": 50,
                "match_score": 0.95,
                "business_name": "Jute Craft",
            }
        ],
    )

    assert fake_tx.entered is True
    assert fake_tx.exited is True
    assert fake_tx.rolled_back is False
    assert result.id == quote_id
    assert len(result.allocations) == 1
    assert result.allocations[0].artisan_id == artisan_id
    assert result.allocations[0].matched_quantity == 50


@pytest.mark.anyio
async def test_repository_create_quote_rollback_on_buyer_missing() -> None:
    fake_cursor = FakeCursor(fetch_sequence=[None])  # Buyer not found
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = QuoteRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    req = QuoteCreateRequest(
        buyer_id=uuid4(),
        requirement_text="Need 50 jute bags",
        quantity=50,
    )

    with pytest.raises(BuyerNotFoundError):
        await repo.create_quote_with_allocations(req, [])

    assert fake_tx.entered is True
    assert fake_tx.rolled_back is True


@pytest.mark.anyio
async def test_repository_create_quote_rollback_on_product_missing() -> None:
    buyer_id = uuid4()
    product_id = uuid4()
    fake_cursor = FakeCursor(
        fetch_sequence=[
            {"id": buyer_id, "role": "buyer"},  # Buyer found
            None,  # Product not found
        ]
    )
    fake_tx = FakeTransactionContext()
    fake_conn = FakeConnection(fake_cursor, fake_tx)
    fake_pool = FakePoolManager(fake_conn)

    repo = QuoteRepository(pool_manager=fake_pool)  # type: ignore[arg-type]
    req = QuoteCreateRequest(
        buyer_id=buyer_id,
        product_id=product_id,
        requirement_text="Need 50 jute bags",
        quantity=50,
    )

    with pytest.raises(ProductNotFoundError):
        await repo.create_quote_with_allocations(req, [])

    assert fake_tx.entered is True
    assert fake_tx.rolled_back is True


# ===========================================================================
# 2. Quote Service Integration Tests (Matching Engine + Allocation)
# ===========================================================================

@pytest.mark.anyio
async def test_service_create_quote_invokes_matching_and_persists() -> None:
    now = datetime.now(timezone.utc)
    buyer_id = uuid4()
    artisan_id = uuid4()
    product_id = uuid4()

    candidate = CandidateProduct(
        product_id=product_id,
        artisan_id=artisan_id,
        title="Jute Bag",
        description="Handmade bag",
        status="published",
        distance=0.1,
        available_quantity=50,
        production_capacity=100,
        artisan_business_name="Artisan Studio",
    )
    ranked = RankedCandidate(
        candidate=candidate,
        match_score=0.92,
        semantic_score=0.9,
        price_score=0.9,
        capacity_score=1.0,
        rating_score=0.9,
    )

    mock_search_service = MagicMock()
    mock_search_service.search = AsyncMock(
        return_value=SearchResult(
            intent=SearchIntent(product="jute bags"),
            ranked_candidates=[ranked],
        )
    )

    mock_repo = MagicMock(spec=QuoteRepository)
    mock_repo.create_quote_with_allocations = AsyncMock(
        return_value=MagicMock(id=uuid4(), buyer_id=buyer_id, quantity=30)
    )

    service = QuoteService(
        quote_repository=mock_repo,
        search_service=mock_search_service,
    )

    req = QuoteCreateRequest(
        buyer_id=buyer_id,
        requirement_text="Need 30 jute bags",
        quantity=30,
    )

    await service.create_quote(req)

    mock_search_service.search.assert_awaited_once_with("Need 30 jute bags")
    mock_repo.create_quote_with_allocations.assert_awaited_once()

    # Check that allocations were generated and passed to repository
    args, kwargs = mock_repo.create_quote_with_allocations.call_args
    passed_allocations = kwargs["allocations"]
    assert len(passed_allocations) == 1
    assert passed_allocations[0]["artisan_id"] == artisan_id
    assert passed_allocations[0]["matched_quantity"] == 30
    assert passed_allocations[0]["match_score"] == 0.92
    assert passed_allocations[0]["business_name"] == "Artisan Studio"


@pytest.mark.anyio
async def test_service_create_quote_matching_failure_raises_quote_matching_error() -> None:
    mock_search_service = MagicMock()
    mock_search_service.search = AsyncMock(side_effect=SearchServiceError("Search failed"))

    mock_repo = MagicMock(spec=QuoteRepository)
    service = QuoteService(
        quote_repository=mock_repo,
        search_service=mock_search_service,
    )

    req = QuoteCreateRequest(
        buyer_id=uuid4(),
        requirement_text="Need 30 jute bags",
        quantity=30,
    )

    with pytest.raises(QuoteMatchingError, match="Matching search failed"):
        await service.create_quote(req)

    mock_repo.create_quote_with_allocations.assert_not_awaited()
