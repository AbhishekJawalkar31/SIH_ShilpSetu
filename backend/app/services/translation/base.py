from __future__ import annotations

from typing import Protocol


class TranslationProvider(Protocol):
    """Protocol for translating text between regional languages and English."""

    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
    ) -> str:
        """Translate text from source_language to target_language."""
        ...
