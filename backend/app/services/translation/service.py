from __future__ import annotations

import logging

from app.core.config import settings
from app.services.translation.base import TranslationProvider
from app.services.translation.languages import (
    UnsupportedLanguageError,
    normalize_language_code,
)
from app.services.translation.sarvam import (
    SarvamTranslationConfigurationError,
    SarvamTranslationError,
    SarvamTranslationProvider,
)

logger = logging.getLogger(__name__)


class TranslationServiceError(Exception):
    """Base error for translation service operations."""


class TranslationConfigError(TranslationServiceError):
    """Raised when no translation provider is configured."""


class TranslationExecutionError(TranslationServiceError):
    """Raised when translation fails across available providers."""


class TranslationService:
    """Service orchestrating multilingual translation for ShilpSetu."""

    def __init__(
        self,
        primary_provider: TranslationProvider | None = None,
    ) -> None:
        self._provider = primary_provider

    def _get_provider(self) -> TranslationProvider:
        if self._provider is None:
            self._provider = SarvamTranslationProvider()
        return self._provider

    async def translate_text(
        self,
        text: str,
        source_language: str,
        target_language: str,
    ) -> str:
        """
        Translate input text from source_language to target_language.
        Handles same-language requests by returning text directly.
        """
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Text to translate must not be empty.")

        canonical_source = normalize_language_code(source_language, allow_auto=True)
        canonical_target = normalize_language_code(target_language, allow_auto=False)

        # Same-language optimization: avoid unnecessary API calls
        if canonical_source != "auto" and canonical_source == canonical_target:
            return clean_text

        try:
            provider = self._get_provider()
            return await provider.translate(
                text=clean_text,
                source_language=canonical_source,
                target_language=canonical_target,
            )
        except SarvamTranslationConfigurationError as exc:
            raise TranslationConfigError(str(exc)) from exc
        except SarvamTranslationError as exc:
            logger.warning("Translation request failed: %s", exc)
            raise TranslationExecutionError(f"Translation provider failed: {exc}") from exc
        except UnsupportedLanguageError:
            raise
        except Exception as exc:
            logger.warning("Unexpected translation error: %s", exc)
            raise TranslationExecutionError("Translation service failed unexpectedly.") from exc
