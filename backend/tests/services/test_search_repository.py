from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator
from uuid import UUID, uuid4

import pytest

from app.db.exceptions import (
    DatabaseConfigurationError,
    DatabaseQueryError,
    InvalidLimitError,
    InvalidVectorDimensionError,
)
from app.services.search.repository import (
    CandidateProduct,
    SearchProductRepository,
)


def make_valid_vector(dim: int = 768) -> list[float]:
    return [0.01 * (i % 10) for i in range(dim)]


class FakeCursor:
    def __init__(self, fetch_results: list[dict[str, Any]] | None = None, error: Exception | None = None) -> None:
        self.executed_queries: list[tuple[str, dict[str, Any]]] = []
        self._fetch_results = fetch_results or []
        self._error = error

    async def execute(self, query: str, params: dict[str, Any] | None = None) -> None:
        self.executed_queries.append((query, params or {}))
        if self._error is not None:
            raise self._error

    async def fetchall(self) -> list[dict[str, Any]]:
        return self._fetch_results


class FakeTransaction:
    async def __aenter__(self) -> "FakeTransaction":
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        pass


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self._cursor = cursor

    @asynccontextmanager
    async def cursor(self, row_factory: Any = None) -> AsyncIterator[FakeCursor]:
        yield self._cursor

    def transaction(self) -> FakeTransaction:
        return FakeTransaction()


def build_repo(
    cursor: FakeCursor,
    expected_dimension: int = 768,
    default_limit: int = 20,
    max_limit: int = 100,
) -> SearchProductRepository:
    conn = FakeConnection(cursor)

    @asynccontextmanager
    async def fake_conn_factory() -> AsyncIterator[FakeConnection]:
        yield conn

    return SearchProductRepository(
        connection_factory=fake_conn_factory,
        expected_dimension=expected_dimension,
        default_limit=default_limit,
        max_limit=max_limit,
    )


# 1 & 2. Valid 768-dimensional vector accepted for storage
def test_valid_768_dimension_vector_accepted_for_storage() -> None:
    cursor = FakeCursor()
    repo = build_repo(cursor)
    product_id = uuid4()
    vector = make_valid_vector(768)

    asyncio.run(
        repo.store_product_embedding(
            product_id=product_id,
            embedding=vector,
            embedding_model="text-embedding-004",
            source_text="Title: Handwoven Jute Bag\nMaterial: Jute",
        )
    )

    assert len(cursor.executed_queries) == 1
    query, params = cursor.executed_queries[0]
    assert params["product_id"] == product_id
    assert params["embedding"] == vector
    assert params["embedding_model"] == "text-embedding-004"
    assert params["source_text"] == "Title: Handwoven Jute Bag\nMaterial: Jute"


# 3. Wrong vector dimension rejected for storage and search
def test_wrong_vector_dimension_rejected() -> None:
    cursor = FakeCursor()
    repo = build_repo(cursor)
    wrong_vector = make_valid_vector(512)

    with pytest.raises(InvalidVectorDimensionError):
        asyncio.run(
            repo.store_product_embedding(
                product_id=uuid4(),
                embedding=wrong_vector,
                embedding_model="text-embedding-004",
            )
        )

    with pytest.raises(InvalidVectorDimensionError):
        asyncio.run(
            repo.search_products_by_embedding(
                query_embedding=wrong_vector,
                limit=10,
            )
        )


# 4, 5, 6. Storage query parameters and exact values
def test_product_embedding_storage_parameters() -> None:
    cursor = FakeCursor()
    repo = build_repo(cursor)
    pid = uuid4()
    vector = make_valid_vector(768)
    source = "Title: Brass Diya\nCraft: Metalwork"

    asyncio.run(
        repo.store_product_embedding(
            product_id=pid,
            embedding=vector,
            embedding_model="text-embedding-004",
            source_text=source,
        )
    )

    query, params = cursor.executed_queries[0]
    # Check upsert on conflict is present
    assert "ON CONFLICT (product_id)" in query
    assert "DO UPDATE SET" in query
    assert params["embedding_model"] == "text-embedding-004"
    assert params["source_text"] == source


# 7. Semantic search query uses cosine operator <=>
def test_semantic_search_query_uses_cosine_operator() -> None:
    product_id = uuid4()
    artisan_id = uuid4()
    sample_row = {
        "product_id": product_id,
        "artisan_id": artisan_id,
        "title": "Handwoven Jute Bag",
        "description": "Eco-friendly jute bag.",
        "category": "Bags",
        "material": "Jute",
        "craft_type": "Handwoven",
        "tags": ["handmade", "jute"],
        "attributes": {"color": "brown"},
        "price": 620.0,
        "currency": "INR",
        "image_url": "https://example.com/bag.jpg",
        "status": "published",
        "distance": 0.12,
    }
    cursor = FakeCursor(fetch_results=[sample_row])
    repo = build_repo(cursor)
    query_vector = make_valid_vector(768)

    results = asyncio.run(
        repo.search_products_by_embedding(
            query_embedding=query_vector,
            limit=5,
        )
    )

    assert len(results) == 1
    assert isinstance(results[0], CandidateProduct)
    assert results[0].product_id == product_id
    assert results[0].distance == 0.12

    query, params = cursor.executed_queries[0]
    assert "<=>" in query
    assert "ORDER BY pe.embedding <=> %(query_embedding)s ASC" in query
    assert params["limit"] == 5


# 8 & 13. Search limit validation
def test_search_limit_validation() -> None:
    cursor = FakeCursor()
    repo = build_repo(cursor, max_limit=50)
    query_vector = make_valid_vector(768)

    with pytest.raises(InvalidLimitError):
        asyncio.run(repo.search_products_by_embedding(query_vector, limit=0))

    with pytest.raises(InvalidLimitError):
        asyncio.run(repo.search_products_by_embedding(query_vector, limit=-5))

    with pytest.raises(InvalidLimitError):
        asyncio.run(repo.search_products_by_embedding(query_vector, limit=51))


# 9. Published-product condition is present in retrieval query
def test_published_product_condition_in_query() -> None:
    cursor = FakeCursor()
    repo = build_repo(cursor)
    query_vector = make_valid_vector(768)

    asyncio.run(repo.search_products_by_embedding(query_vector, limit=10))

    query, _ = cursor.executed_queries[0]
    assert "p.status = 'published'" in query


# 10. Product-to-embedding join is correct
def test_product_to_embedding_join_in_query() -> None:
    cursor = FakeCursor()
    repo = build_repo(cursor)
    query_vector = make_valid_vector(768)

    asyncio.run(repo.search_products_by_embedding(query_vector, limit=10))

    query, _ = cursor.executed_queries[0]
    assert "JOIN products p ON pe.product_id = p.id" in query


# 11. Database failure becomes a clean domain error
def test_database_failure_raises_domain_error() -> None:
    cursor = FakeCursor(error=RuntimeError("connection dropped"))
    repo = build_repo(cursor)
    query_vector = make_valid_vector(768)

    with pytest.raises(DatabaseQueryError):
        asyncio.run(repo.search_products_by_embedding(query_vector, limit=10))

    with pytest.raises(DatabaseQueryError):
        asyncio.run(
            repo.store_product_embedding(
                product_id=uuid4(),
                embedding=query_vector,
                embedding_model="text-embedding-004",
            )
        )


# 12. Missing database configuration is handled cleanly
def test_missing_database_url_raises_configuration_error(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.db import connection
    monkeypatch.setattr(connection.settings, "database_url", None)

    with pytest.raises(DatabaseConfigurationError):
        async def call_conn() -> None:
            async with connection.get_db_connection():
                pass
        asyncio.run(call_conn())
