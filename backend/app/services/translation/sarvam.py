from __future__ import annotations

import asyncio
import logging
from typing import Any

from sarvamai import SarvamAI

from app.core.config import settings
from app.services.translation.languages import normalize_language_code

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SECONDS = 30.0


class SarvamTranslationError(Exception):
    """Base error for Sarvam translation failures."""


class SarvamTranslationConfigurationError(SarvamTranslationError):
    """Raised when Sarvam API key is missing."""


class SarvamTranslationTimeoutError(SarvamTranslationError):
    """Raised when Sarvam translation request times out."""


class SarvamTranslationRequestError(SarvamTranslationError):
    """Raised when Sarvam translation API returns an error."""


class SarvamTranslationResponseError(SarvamTranslationError):
    """Raised when Sarvam returns an invalid or empty response."""


class SarvamTranslationProvider:
    """Sarvam AI translation provider for Indian regional languages and English."""

    def __init__(
        self,
        api_key: str | None = None,
        client: Any | None = None,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
        model: str = "sarvam-translate:v1",
        mode: str = "formal",
    ) -> None:
        resolved_api_key = api_key if api_key is not None else settings.sarvam_api_key
        if not resolved_api_key:
            raise SarvamTranslationConfigurationError("Sarvam API key is not configured.")

        self._client = client or SarvamAI(api_subscription_key=resolved_api_key)
        self._timeout_seconds = timeout_seconds
        self._model = model
        self._mode = mode

    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
    ) -> str:
        """Translate text using Sarvam AI's official translation service."""
        canonical_source = normalize_language_code(source_language, allow_auto=True)
        canonical_target = normalize_language_code(target_language, allow_auto=False)

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self._client.text.translate,
                    input=text,
                    source_language_code=canonical_source,
                    target_language_code=canonical_target,
                    model=self._model,
                    mode=self._mode,
                ),
                timeout=self._timeout_seconds,
            )
        except asyncio.TimeoutError:
            raise SarvamTranslationTimeoutError("Sarvam translation timed out.") from None
        except Exception as exc:
            raise SarvamTranslationRequestError(f"Sarvam translation failed: {exc}") from exc

        return self._extract_translated_text(response)

    @staticmethod
    def _extract_translated_text(response: Any) -> str:
        if response is None:
            raise SarvamTranslationResponseError("Sarvam returned an empty response.")

        translated_text: str | None = None
        if isinstance(response, dict):
            translated_text = response.get("translated_text")
        else:
            translated_text = getattr(response, "translated_text", None)

        if not isinstance(translated_text, str) or not translated_text.strip():
            raise SarvamTranslationResponseError("Sarvam returned no translated text.")

        return translated_text.strip()
