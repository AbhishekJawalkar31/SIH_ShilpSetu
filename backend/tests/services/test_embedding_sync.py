from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest

from app.db.exceptions import (
    DatabaseError,
    DatabaseQueryError,
    InvalidVectorDimensionError,
)
from app.schemas.product import ProductResponse
from app.services.embedding.repository import ProductEmbeddingRepository
from app.services.product.embedding_sync import (
    ProductEmbeddingSyncService,
    SyncResult,
)
from app.services.search.embeddings.gemini import (
    GeminiEmbeddingRequestError,
    GeminiEmbeddingTimeoutError,
)
from app.services.search.embeddings.helpers import ProductEmbeddingInput


def make_product(
    product_id: UUID | None = None,
    title: str = "Handcrafted Brass Bell",
    description: str = "Authentic brass temple bell.",
    category: str = "Metal Craft",
    material: str = "Brass",
    craft_type: str = "Metal Casting",
    tags: list[str] | None = None,
    attributes: dict[str, Any] | None = None,
    price: float = 750.0,
    status: str = "published",
) -> ProductResponse:
    return ProductResponse(
        id=product_id or uuid4(),
        artisan_id=uuid4(),
        title=title,
        description=description,
        category=category,
        material=material,
        craft_type=craft_type,
        tags=tags if tags is not None else ["brass", "bell", "temple"],
        attributes=attributes if attributes is not None else {"weight": "500g", "finish": "antique"},
        price=price,
        currency="INR",
        image_url="product-images/bell.jpg",
        status=status,
        available_quantity=30,
        production_capacity=100,
        unit="piece",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


# ===========================================================================
# 1. Searchable text construction
# ===========================================================================

def test_searchable_text_construction() -> None:
    service = ProductEmbeddingSyncService()
    product = make_product()
    text = service.build_searchable_text(product)

    assert "Title: Handcrafted Brass Bell" in text
    assert "Category: Metal Craft" in text
    assert "Craft: Metal Casting" in text
    assert "Material: Brass" in text
    assert "Description: Authentic brass temple bell." in text
    assert "Tags: brass, bell, temple" in text
    assert "Attributes: finish: antique, weight: 500g" in text


def test_deterministic_text_construction() -> None:
    service = ProductEmbeddingSyncService()
    # Different attribute insertion orders
    p1 = make_product(attributes={"b": "2", "a": "1"})
    p2 = make_product(attributes={"a": "1", "b": "2"})

    text1 = service.build_searchable_text(p1)
    text2 = service.build_searchable_text(p2)

    assert text1 == text2
    assert "Attributes: a: 1, b: 2" in text1


# ===========================================================================
# 2. Embedding Repository Tests
# ===========================================================================

class FakeTransactionContext:
    async def __aenter__(self) -> "FakeTransactionContext":
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        pass


class FakeCursor:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error
        self.executed: list[tuple[str, Any]] = []

    async def execute(self, query: str, params: Any = None) -> None:
        self.executed.append((query, params))
        if self.error is not None:
            raise self.error


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self._cursor = cursor

    def transaction(self) -> FakeTransactionContext:
        return FakeTransactionContext()

    @asynccontextmanager
    async def cursor(self) -> AsyncIterator[FakeCursor]:
        yield self._cursor


class FakePoolManager:
    def __init__(self, connection: FakeConnection) -> None:
        self._connection = connection

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[FakeConnection]:
        yield self._connection


@pytest.mark.anyio
async def test_embedding_repository_upsert_success() -> None:
    fake_cursor = FakeCursor()
    fake_conn = FakeConnection(fake_cursor)
    fake_pool = FakePoolManager(fake_conn)

    repo = ProductEmbeddingRepository(pool_manager=fake_pool, expected_dimension=768)  # type: ignore[arg-type]
    product_id = uuid4()
    dummy_vector = [0.01] * 768

    await repo.upsert_product_embedding(
        product_id=product_id,
        embedding=dummy_vector,
        embedding_model="text-embedding-004",
        source_text="Title: Bell",
    )

    assert len(fake_cursor.executed) == 1
    query, params = fake_cursor.executed[0]
    assert "INSERT INTO product_embeddings" in query
    assert "ON CONFLICT (product_id) DO UPDATE" in query
    assert params["product_id"] == product_id
    assert params["embedding"] == dummy_vector
    assert params["embedding_model"] == "text-embedding-004"


@pytest.mark.anyio
async def test_embedding_repository_invalid_dimension() -> None:
    repo = ProductEmbeddingRepository(expected_dimension=768)
    product_id = uuid4()
    invalid_vector = [0.01] * 128  # Wrong dimension

    with pytest.raises(InvalidVectorDimensionError):
        await repo.upsert_product_embedding(
            product_id=product_id,
            embedding=invalid_vector,
            embedding_model="text-embedding-004",
        )


@pytest.mark.anyio
async def test_embedding_repository_db_failure() -> None:
    fake_cursor = FakeCursor(error=RuntimeError("disk full"))
    fake_conn = FakeConnection(fake_cursor)
    fake_pool = FakePoolManager(fake_conn)

    repo = ProductEmbeddingRepository(pool_manager=fake_pool, expected_dimension=768)  # type: ignore[arg-type]
    product_id = uuid4()
    dummy_vector = [0.01] * 768

    with pytest.raises(DatabaseQueryError):
        await repo.upsert_product_embedding(
            product_id=product_id,
            embedding=dummy_vector,
            embedding_model="text-embedding-004",
        )


# ===========================================================================
# 3. Product Embedding Synchronization Service Tests
# ===========================================================================

@pytest.mark.anyio
async def test_sync_product_success() -> None:
    mock_provider = MagicMock()
    mock_provider.embed_document = AsyncMock(return_value=[0.05] * 768)

    mock_repo = MagicMock()
    mock_repo.upsert_product_embedding = AsyncMock()

    service = ProductEmbeddingSyncService(
        embedding_provider=mock_provider,
        embedding_repository=mock_repo,
    )

    product = make_product()
    result = await service.sync_product(product)

    assert result.success is True
    assert result.product_id == product.id
    mock_provider.embed_document.assert_awaited_once()
    mock_repo.upsert_product_embedding.assert_awaited_once()


@pytest.mark.anyio
async def test_sync_product_gemini_failure_returns_failure_result() -> None:
    mock_provider = MagicMock()
    mock_provider.embed_document = AsyncMock(side_effect=GeminiEmbeddingTimeoutError("Timed out"))

    mock_repo = MagicMock()
    mock_repo.upsert_product_embedding = AsyncMock()

    service = ProductEmbeddingSyncService(
        embedding_provider=mock_provider,
        embedding_repository=mock_repo,
    )

    product = make_product()
    result = await service.sync_product(product)

    assert result.success is False
    assert result.product_id == product.id
    assert "Embedding generation failed" in (result.error_message or "")
    # Repository should NOT be called if embedding fails (no fake embeddings)
    mock_repo.upsert_product_embedding.assert_not_awaited()


@pytest.mark.anyio
async def test_sync_product_db_failure_returns_failure_result() -> None:
    mock_provider = MagicMock()
    mock_provider.embed_document = AsyncMock(return_value=[0.05] * 768)

    mock_repo = MagicMock()
    mock_repo.upsert_product_embedding = AsyncMock(side_effect=DatabaseQueryError("DB error"))

    service = ProductEmbeddingSyncService(
        embedding_provider=mock_provider,
        embedding_repository=mock_repo,
    )

    product = make_product()
    result = await service.sync_product(product)

    assert result.success is False
    assert result.product_id == product.id
    assert "Database storage failed" in (result.error_message or "")


@pytest.mark.anyio
async def test_sync_product_embedding_by_id() -> None:
    product = make_product()

    mock_product_repo = MagicMock()
    mock_product_repo.get_product_by_id = AsyncMock(return_value=product)

    mock_provider = MagicMock()
    mock_provider.embed_document = AsyncMock(return_value=[0.05] * 768)

    mock_embedding_repo = MagicMock()
    mock_embedding_repo.upsert_product_embedding = AsyncMock()

    service = ProductEmbeddingSyncService(
        embedding_provider=mock_provider,
        embedding_repository=mock_embedding_repo,
        product_repository=mock_product_repo,
    )

    result = await service.sync_product_embedding(product.id)
    assert result.success is True
    assert result.product_id == product.id
    mock_product_repo.get_product_by_id.assert_awaited_once_with(product.id)
    mock_provider.embed_document.assert_awaited_once()


@pytest.mark.anyio
async def test_sync_product_embedding_not_found() -> None:
    mock_product_repo = MagicMock()
    mock_product_repo.get_product_by_id = AsyncMock(return_value=None)

    service = ProductEmbeddingSyncService(product_repository=mock_product_repo)
    result = await service.sync_product_embedding(uuid4())

    assert result.success is False
    assert "was not found" in (result.error_message or "")
