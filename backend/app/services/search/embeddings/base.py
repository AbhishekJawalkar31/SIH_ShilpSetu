from __future__ import annotations

from typing import Protocol


class EmbeddingProvider(Protocol):
    """Provider interface for generating text vector embeddings."""

    async def embed_document(self, text: str, title: str | None = None) -> list[float]:
        """Generate a vector embedding for a catalogue product document."""
        ...

    async def embed_query(self, text: str) -> list[float]:
        """Generate a vector embedding for a buyer search query."""
        ...
