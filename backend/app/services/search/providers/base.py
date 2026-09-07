from __future__ import annotations

from typing import Protocol

from app.schemas.search import SearchIntent


class IntentExtractor(Protocol):
    """Provider interface for natural-language buyer query intent extraction."""

    async def extract_intent(self, query: str) -> SearchIntent:
        """Extract structured intent from a buyer search query."""
        ...
