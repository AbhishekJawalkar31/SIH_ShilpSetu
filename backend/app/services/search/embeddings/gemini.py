from __future__ import annotations

import asyncio
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings


DEFAULT_TIMEOUT_SECONDS = 30.0
DOCUMENT_TASK_TYPE = "RETRIEVAL_DOCUMENT"
QUERY_TASK_TYPE = "RETRIEVAL_QUERY"


class GeminiEmbeddingError(Exception):
    """Base exception for Gemini embedding operations."""


class GeminiEmbeddingConfigurationError(GeminiEmbeddingError):
    """Raised when Gemini embedding configuration or API key is missing."""


class GeminiEmbeddingTimeoutError(GeminiEmbeddingError):
    """Raised when Gemini embedding request exceeds the timeout."""


class GeminiEmbeddingRequestError(GeminiEmbeddingError):
    """Raised when Gemini rejects or fails an embedding request."""


class GeminiEmbeddingMalformedResponseError(GeminiEmbeddingError):
    """Raised when Gemini returns an empty or malformed embedding vector."""


class EmbeddingTextValidationError(ValueError):
    """Raised when the text to be embedded is empty or invalid."""


class GeminiEmbeddingProvider:
    """Gemini-backed implementation of the EmbeddingProvider protocol."""

    def __init__(
        self,
        api_key: str | None = None,
        model_name: str | None = None,
        dimension: int | None = None,
        client: Any | None = None,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        resolved_api_key = api_key if api_key is not None else settings.gemini_api_key
        if not resolved_api_key:
            raise GeminiEmbeddingConfigurationError("Gemini API key is not configured.")

        self._model_name = model_name or settings.gemini_embedding_model
        self._dimension = dimension or settings.embedding_dimension
        self._client = client or genai.Client(api_key=resolved_api_key)
        self._timeout_seconds = timeout_seconds

    async def embed_document(self, text: str, title: str | None = None) -> list[float]:
        """Generate a 768-dimensional document embedding for catalogue products."""
        return await self._embed_text(
            text=text,
            task_type=DOCUMENT_TASK_TYPE,
            title=title,
        )

    async def embed_query(self, text: str) -> list[float]:
        """Generate a 768-dimensional query embedding for buyer searches."""
        return await self._embed_text(
            text=text,
            task_type=QUERY_TASK_TYPE,
            title=None,
        )

    async def _embed_text(
        self,
        text: str,
        task_type: str,
        title: str | None = None,
    ) -> list[float]:
        if text is None or not isinstance(text, str) or not text.strip():
            raise EmbeddingTextValidationError("Embedding text is required and must not be empty.")

        clean_text = text.strip()
        config_kwargs: dict[str, Any] = {
            "task_type": task_type,
            "output_dimensionality": self._dimension,
        }
        if title and title.strip() and task_type == DOCUMENT_TASK_TYPE:
            config_kwargs["title"] = title.strip()

        config = types.EmbedContentConfig(**config_kwargs)

        try:
            response = await asyncio.wait_for(
                self._client.aio.models.embed_content(
                    model=self._model_name,
                    contents=clean_text,
                    config=config,
                ),
                timeout=self._timeout_seconds,
            )
        except asyncio.TimeoutError:
            raise GeminiEmbeddingTimeoutError("Gemini embedding request timed out.") from None
        except Exception:
            raise GeminiEmbeddingRequestError("Gemini embedding request failed.") from None

        return self._extract_vector(response)

    def _extract_vector(self, response: Any) -> list[float]:
        if response is None:
            raise GeminiEmbeddingMalformedResponseError("Gemini returned an empty response.")

        embeddings = getattr(response, "embeddings", None)
        if not embeddings or not isinstance(embeddings, list):
            raise GeminiEmbeddingMalformedResponseError("Gemini returned no embeddings in response.")

        first_embedding = embeddings[0]
        values = getattr(first_embedding, "values", None)
        if values is None and isinstance(first_embedding, dict):
            values = first_embedding.get("values")

        if not values or not isinstance(values, (list, tuple)):
            raise GeminiEmbeddingMalformedResponseError("Gemini embedding values are empty or invalid.")

        try:
            float_vector = [float(v) for v in values]
        except (TypeError, ValueError):
            raise GeminiEmbeddingMalformedResponseError("Gemini embedding values could not be parsed as floats.") from None

        if len(float_vector) != self._dimension:
            raise GeminiEmbeddingMalformedResponseError(
                f"Gemini embedding returned dimension {len(float_vector)}, expected {self._dimension}."
            )

        return float_vector
