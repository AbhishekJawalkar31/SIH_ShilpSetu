from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from app.core.config import settings
from app.db.exceptions import DatabaseError
from app.schemas.product import ProductResponse
from app.services.embedding.repository import ProductEmbeddingRepository
from app.services.product.repository import ProductRepository
from app.services.search.embeddings.base import EmbeddingProvider
from app.services.search.embeddings.gemini import (
    GeminiEmbeddingError,
    GeminiEmbeddingProvider,
)
from app.services.search.embeddings.helpers import (
    ProductEmbeddingInput,
    build_product_source_text,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SyncResult:
    """Result of an embedding synchronization attempt."""

    success: bool
    product_id: UUID
    error_message: str | None = None


class ProductEmbeddingSyncService:
    """Synchronizes product data with pgvector product embeddings."""

    def __init__(
        self,
        embedding_provider: EmbeddingProvider | None = None,
        embedding_repository: ProductEmbeddingRepository | None = None,
        product_repository: ProductRepository | None = None,
        embedding_model: str | None = None,
    ) -> None:
        self._provider = embedding_provider
        self._embedding_repo = embedding_repository or ProductEmbeddingRepository()
        self._product_repo = product_repository or ProductRepository()
        self._embedding_model = embedding_model or settings.gemini_embedding_model

    def _get_provider(self) -> EmbeddingProvider:
        if self._provider is None:
            self._provider = GeminiEmbeddingProvider()
        return self._provider

    def build_searchable_text(self, product: ProductResponse | ProductEmbeddingInput) -> str:
        """Construct deterministic searchable text from a product object."""
        if isinstance(product, ProductEmbeddingInput):
            return build_product_source_text(product)

        embedding_input = ProductEmbeddingInput(
            title=product.title,
            description=product.description,
            category=product.category,
            craft_type=product.craft_type,
            material=product.material,
            tags=product.tags,
            attributes=product.attributes,
        )
        return build_product_source_text(embedding_input)

    async def sync_product(self, product: ProductResponse) -> SyncResult:
        """
        Generate and persist the embedding for an in-memory product response.
        Safe and non-raising: returns a SyncResult and logs failure without throwing.
        """
        try:
            source_text = self.build_searchable_text(product)
            if not source_text.strip():
                return SyncResult(
                    success=False,
                    product_id=product.id,
                    error_message="Searchable text is empty.",
                )

            provider = self._get_provider()
            embedding_vector = await provider.embed_document(
                text=source_text,
                title=product.title,
            )

            await self._embedding_repo.upsert_product_embedding(
                product_id=product.id,
                embedding=embedding_vector,
                embedding_model=self._embedding_model,
                source_text=source_text,
            )

            return SyncResult(success=True, product_id=product.id)
        except GeminiEmbeddingError as exc:
            safe_msg = f"Embedding generation failed: {exc}"
            logger.warning(
                "PRODUCT_EMBEDDING_SYNC_FAILED product_id=%s reason=%s",
                product.id,
                safe_msg,
            )
            return SyncResult(success=False, product_id=product.id, error_message=safe_msg)
        except DatabaseError as exc:
            safe_msg = f"Database storage failed: {exc}"
            logger.warning(
                "PRODUCT_EMBEDDING_SYNC_FAILED product_id=%s reason=%s",
                product.id,
                safe_msg,
            )
            return SyncResult(success=False, product_id=product.id, error_message=safe_msg)
        except Exception as exc:
            safe_msg = f"Unexpected error: {exc}"
            logger.warning(
                "PRODUCT_EMBEDDING_SYNC_FAILED product_id=%s reason=%s",
                product.id,
                safe_msg,
            )
            return SyncResult(success=False, product_id=product.id, error_message=safe_msg)

    async def sync_product_embedding(self, product_id: UUID) -> SyncResult:
        """
        Fetch product from database and synchronize its embedding.
        Allows future workflows (e.g. product updates/re-indexing) to trigger sync.
        """
        try:
            product = await self._product_repo.get_product_by_id(product_id)
            if product is None:
                return SyncResult(
                    success=False,
                    product_id=product_id,
                    error_message=f"Product {product_id} was not found.",
                )
            return await self.sync_product(product)
        except Exception as exc:
            safe_msg = f"Failed to retrieve product for sync: {exc}"
            logger.warning(
                "PRODUCT_EMBEDDING_SYNC_FAILED product_id=%s reason=%s",
                product_id,
                safe_msg,
            )
            return SyncResult(success=False, product_id=product_id, error_message=safe_msg)
