from __future__ import annotations

import hashlib
import math
from datetime import datetime, timezone
from typing import Protocol
from uuid import UUID

from app.db.repository import ProductRepository
from app.schemas.api import EmbeddingResponse, ProductResponse


class EmbeddingProvider(Protocol):
    model_name: str
    dimensions: int

    def embed(self, text: str) -> list[float]: ...


class HashEmbeddingProvider:
    """Deterministic offline fallback with the same vector-store interface."""

    model_name = "local-hash-v1"
    dimensions = 128

    def embed(self, text: str) -> list[float]:
        values: list[float] = []
        for index in range(self.dimensions):
            digest = hashlib.sha256(f"{index}:{text}".encode()).digest()
            values.append((int.from_bytes(digest[:4], "big") / 2**31) - 1)
        norm = math.sqrt(sum(value * value for value in values)) or 1
        return [value / norm for value in values]


class GeminiEmbeddingProvider:
    """Gemini embedding adapter; provider-specific details stay here."""

    model_name = "gemini-embedding-001"
    dimensions = 768

    def __init__(self, api_key: str, client=None) -> None:
        from google import genai

        self._client = client or genai.Client(api_key=api_key)

    def embed(self, text: str) -> list[float]:
        response = self._client.models.embed_content(
            model=self.model_name,
            contents=text,
        )
        embeddings = getattr(response, "embeddings", None) or []
        values = getattr(embeddings[0], "values", None) if embeddings else None
        if not values:
            raise RuntimeError("Embedding provider returned no vector.")
        return [float(value) for value in values]


class EmbeddingService:
    def __init__(self, repository: ProductRepository, provider: EmbeddingProvider):
        self.repository = repository
        self.provider = provider

    @staticmethod
    def product_text(product: ProductResponse) -> str:
        attributes = " ".join(
            f"{key} {value}" for key, value in product.attributes.items()
        )
        return " ".join(
            [
                product.title,
                product.description,
                product.category,
                product.material,
                product.craft_type,
                " ".join(product.tags),
                attributes,
            ]
        ).strip()

    def embed_product(self, product: ProductResponse) -> EmbeddingResponse:
        source_text = self.product_text(product)
        vector = self.provider.embed(source_text)
        self.repository.save_embedding(
            product.id, vector, self.provider.model_name, source_text
        )
        return EmbeddingResponse(
            product_id=product.id,
            embedding_model=self.provider.model_name,
            dimensions=len(vector),
            created_at=datetime.now(timezone.utc),
        )

    def embed_query(self, query: str) -> list[float]:
        return self.provider.embed(query)