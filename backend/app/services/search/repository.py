from __future__ import annotations

from typing import Any, AsyncContextManager, Callable, Mapping
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from psycopg.rows import dict_row

from app.core.config import settings
from app.db.connection import get_db_connection
from app.db.exceptions import (
    DatabaseQueryError,
    InvalidLimitError,
    InvalidVectorDimensionError,
)


class CandidateProduct(BaseModel):
    """Candidate product retrieved by semantic vector similarity."""

    model_config = ConfigDict(extra="forbid")

    product_id: UUID
    artisan_id: UUID
    title: str
    description: str
    category: str | None = None
    material: str | None = None
    craft_type: str | None = None
    tags: list[str] | None = None
    attributes: Mapping[str, Any] | None = None
    price: float | None = None
    currency: str = "INR"
    image_url: str | None = None
    status: str
    distance: float
    available_quantity: int = 0
    production_capacity: int = 0
    unit: str = "piece"
    artisan_business_name: str | None = None
    artisan_location: str | None = None
    artisan_city: str | None = None
    artisan_state: str | None = None
    artisan_country: str = "India"
    artisan_rating: float = 0.0


class SearchProductRepository:
    """Repository managing product vector embeddings and pgvector semantic retrieval."""

    def __init__(
        self,
        connection_factory: Callable[[], AsyncContextManager[Any]] | None = None,
        expected_dimension: int | None = None,
        default_limit: int = 20,
        max_limit: int = 100,
    ) -> None:
        self._connection_factory = connection_factory or get_db_connection
        self._expected_dimension = (
            expected_dimension
            if expected_dimension is not None
            else settings.embedding_dimension
        )
        self._default_limit = default_limit
        self._max_limit = max_limit

    async def store_product_embedding(
        self,
        product_id: UUID | str,
        embedding: list[float],
        embedding_model: str,
        source_text: str | None = None,
    ) -> None:
        """Store or update a product vector embedding in PostgreSQL."""
        if not isinstance(embedding, (list, tuple)) or len(embedding) != self._expected_dimension:
            actual_dim = len(embedding) if isinstance(embedding, (list, tuple)) else "invalid"
            raise InvalidVectorDimensionError(
                f"Embedding dimension must be exactly {self._expected_dimension}, got {actual_dim}."
            )

        if isinstance(product_id, str):
            try:
                parsed_product_id = UUID(product_id)
            except ValueError:
                raise ValueError("product_id must be a valid UUID.") from None
        else:
            parsed_product_id = product_id

        query = """
            INSERT INTO product_embeddings (
                id,
                product_id,
                embedding,
                embedding_model,
                source_text,
                created_at
            ) VALUES (
                gen_random_uuid(),
                %(product_id)s,
                %(embedding)s,
                %(embedding_model)s,
                %(source_text)s,
                NOW()
            )
            ON CONFLICT (product_id) DO UPDATE SET
                embedding = EXCLUDED.embedding,
                embedding_model = EXCLUDED.embedding_model,
                source_text = EXCLUDED.source_text,
                created_at = EXCLUDED.created_at;
        """

        params = {
            "product_id": parsed_product_id,
            "embedding": embedding,
            "embedding_model": embedding_model,
            "source_text": source_text,
        }

        try:
            async with self._connection_factory() as conn:
                async with conn.transaction():
                    async with conn.cursor() as cursor:
                        await cursor.execute(query, params)
        except (InvalidVectorDimensionError, ValueError):
            raise
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to store product embedding: {exc}") from exc

    async def search_products_by_embedding(
        self,
        query_embedding: list[float],
        limit: int | None = None,
    ) -> list[CandidateProduct]:
        """Retrieve published product candidates ordered by pgvector cosine similarity."""
        if not isinstance(query_embedding, (list, tuple)) or len(query_embedding) != self._expected_dimension:
            actual_dim = len(query_embedding) if isinstance(query_embedding, (list, tuple)) else "invalid"
            raise InvalidVectorDimensionError(
                f"Query embedding dimension must be exactly {self._expected_dimension}, got {actual_dim}."
            )

        resolved_limit = self._default_limit if limit is None else limit
        if not isinstance(resolved_limit, int) or resolved_limit <= 0:
            raise InvalidLimitError("Search limit must be an integer greater than zero.")
        if resolved_limit > self._max_limit:
            raise InvalidLimitError(f"Search limit cannot exceed {self._max_limit}.")

        query = """
            SELECT 
                p.id AS product_id,
                p.artisan_id,
                p.title,
                p.description,
                p.category,
                p.material,
                p.craft_type,
                p.tags,
                p.attributes,
                p.price,
                p.currency,
                p.image_url,
                p.status,
                COALESCE(i.available_quantity, 0) AS available_quantity,
                COALESCE(i.production_capacity, 0) AS production_capacity,
                COALESCE(i.unit, 'piece') AS unit,
                a.business_name AS artisan_business_name,
                a.location AS artisan_location,
                a.city AS artisan_city,
                a.state AS artisan_state,
                a.country AS artisan_country,
                COALESCE(a.rating, 0.0) AS artisan_rating,
                (pe.embedding <=> %(query_embedding)s) AS distance
            FROM product_embeddings pe
            JOIN products p ON pe.product_id = p.id
            LEFT JOIN inventory i ON i.product_id = p.id
            LEFT JOIN artisans a ON p.artisan_id = a.id
            WHERE p.status = 'published'
            ORDER BY pe.embedding <=> %(query_embedding)s ASC
            LIMIT %(limit)s;
        """

        params = {
            "query_embedding": query_embedding,
            "limit": resolved_limit,
        }

        try:
            async with self._connection_factory() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(query, params)
                    rows = await cursor.fetchall()
        except (InvalidVectorDimensionError, InvalidLimitError):
            raise
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to execute semantic search query: {exc}") from exc

        candidates: list[CandidateProduct] = []
        for row in rows:
            candidates.append(CandidateProduct.model_validate(row))

        return candidates
