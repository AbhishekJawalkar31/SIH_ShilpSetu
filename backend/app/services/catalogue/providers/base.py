from __future__ import annotations

from typing import Any, Mapping, Protocol


class CatalogueProvider(Protocol):
    """Provider interface for multimodal product catalogue generation."""

    async def generate_catalogue(
        self,
        image_bytes: bytes,
        mime_type: str,
        voice_text: str | None,
    ) -> Mapping[str, Any]:
        """Return provider-generated structured catalogue data."""


class SpeechProvider(Protocol):
    """Provider interface for speech-to-text transcription."""

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str,
        mime_type: str,
        language: str | None,
    ) -> Mapping[str, Any]:
        """Return provider-generated transcription data."""
