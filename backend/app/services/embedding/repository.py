from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from psycopg.rows import dict_row

from app.core.config import settings
from app.db.connection import DatabasePoolManager, get_pool_manager
from app.db.exceptions import (
    DatabaseError,
    DatabaseQueryError,
    InvalidVectorDimensionError,
)

logger = logging.getLogger(__name__)


class ProductEmbeddingRepository:
    """Repository dedicated to persisting and upserting product embeddings in PostgreSQL."""

    def __init__(
        self,
        pool_manager: DatabasePoolManager | None = None,
        expected_dimension: int | None = None,
    ) -> None:
        self._pool_manager = pool_manager or get_pool_manager()
        self._expected_dimension = (
            expected_dimension
            if expected_dimension is not None
            else settings.embedding_dimension
        )

    async def upsert_product_embedding(
        self,
        product_id: UUID | str,
        embedding: list[float],
        embedding_model: str,
        source_text: str | None = None,
    ) -> None:
        """Upsert a 768-dimensional product embedding vector in product_embeddings."""
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
            async with self._pool_manager.connection() as conn:
                async with conn.transaction():
                    async with conn.cursor() as cursor:
                        await cursor.execute(query, params)
        except (InvalidVectorDimensionError, ValueError):
            raise
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to upsert product embedding: {exc}") from exc
