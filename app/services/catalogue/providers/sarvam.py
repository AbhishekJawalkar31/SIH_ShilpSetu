from __future__ import annotations

import asyncio
import io
from typing import Any, Mapping

from sarvamai import SarvamAI

from app.core.config import settings
from app.services.translation.languages import (
    UnsupportedLanguageError,
    normalize_language_code,
)


DEFAULT_TIMEOUT_SECONDS = 30.0


class SarvamProviderError(Exception):
    """Base error for Sarvam speech provider failures."""


class SarvamConfigurationError(SarvamProviderError):
    """Raised when the Sarvam provider is not configured."""


class SarvamTimeoutError(SarvamProviderError):
    """Raised when Sarvam does not respond before the provider timeout."""


class SarvamRequestError(SarvamProviderError):
    """Raised when Sarvam rejects or fails a transcription request."""


class SarvamMalformedResponseError(SarvamProviderError):
    """Raised when Sarvam does not return a valid transcription response."""


class SarvamMissingTranscriptionError(SarvamMalformedResponseError):
    """Raised when a Sarvam response does not contain transcription text."""


class _AudioFile(io.BytesIO):
    """In-memory audio file carrying the filename and media type for the SDK."""

    def __init__(self, audio_bytes: bytes, filename: str, mime_type: str) -> None:
        super().__init__(audio_bytes)
        self.name = filename
        self.content_type = mime_type


class SarvamSpeechProvider:
    """Sarvam-backed implementation of the speech provider interface."""

    def __init__(
        self,
        api_key: str | None = None,
        client: Any | None = None,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        resolved_api_key = api_key if api_key is not None else settings.sarvam_api_key
        if not resolved_api_key:
            raise SarvamConfigurationError("Sarvam API key is not configured.")

        self._client = client or SarvamAI(api_subscription_key=resolved_api_key)
        self._timeout_seconds = timeout_seconds

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str,
        mime_type: str,
        language: str | None,
    ) -> Mapping[str, Any]:
        """Transcribe an artisan audio file into provider-agnostic data."""
        audio_file = _AudioFile(audio_bytes, filename, mime_type)
        request_kwargs: dict[str, Any] = {"file": audio_file}
        if language is not None:
            try:
                request_kwargs["language_code"] = normalize_language_code(language)
            except UnsupportedLanguageError as exc:
                raise SarvamRequestError(str(exc)) from exc

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self._client.speech_to_text.transcribe,
                    **request_kwargs,
                ),
                timeout=self._timeout_seconds,
            )
        except asyncio.TimeoutError:
            raise SarvamTimeoutError("Sarvam transcription timed out.") from None
        except Exception:
            raise SarvamRequestError("Sarvam transcription failed.") from None

        return self._parse_response(response)

    @staticmethod
    def _parse_response(response: Any) -> Mapping[str, str]:
        if isinstance(response, Mapping):
            transcript = response.get("transcript")
            language_code = response.get("language_code")
        else:
            transcript = getattr(response, "transcript", None)
            language_code = getattr(response, "language_code", None)

        if not isinstance(transcript, str) or not transcript.strip():
            raise SarvamMissingTranscriptionError(
                "Sarvam response is missing transcription text."
            )
        if not isinstance(language_code, str) or not language_code.strip():
            raise SarvamMalformedResponseError(
                "Sarvam response is missing a valid language code."
            )

        return {"text": transcript.strip(), "language": language_code.strip()}
