from __future__ import annotations

from typing import Protocol

import httpx

from app.schemas.api import TranslationRequest, TranslationResponse
from app.services.translation.languages import (
    UnsupportedLanguageError,
    normalize_language_code,
)


class TranslationService(Protocol):
    def translate(self, request: TranslationRequest) -> TranslationResponse: ...


class TranslationProviderError(RuntimeError):
    """Base error for an upstream translation provider failure."""


class TranslationConfigurationError(TranslationProviderError):
    """Raised when a translation provider has not been configured."""


class TranslationRequestError(TranslationProviderError):
    """Raised when the provider rejects or cannot complete a request."""


class TranslationResponseError(TranslationProviderError):
    """Raised when the provider returns an unusable response."""


class PassthroughTranslationService:
    """Development fallback used only when no translation key is configured.

    It keeps local UI development usable without silently pretending that a
    production translation request was translated. Production deployments
    should set SARVAM_API_KEY.
    """

    def translate(self, request: TranslationRequest) -> TranslationResponse:
        return TranslationResponse(
            text=request.text,
            source_language=request.source_language,
            target_language=request.target_language,
            provider="passthrough-local",
        )


class HttpTranslationService:
    """Backward-compatible adapter for a private translation gateway."""

    def __init__(
        self,
        endpoint: str,
        api_key: str | None = None,
        *,
        timeout: float = 20.0,
        client: httpx.Client | None = None,
    ) -> None:
        self.endpoint = endpoint
        self.api_key = api_key
        self.client = client or httpx.Client(timeout=timeout)

    def translate(self, request: TranslationRequest) -> TranslationResponse:
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        try:
            response = self.client.post(
                self.endpoint,
                json=request.model_dump(),
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as exc:
            raise TranslationRequestError(
                "Configured translation service could not be reached."
            ) from exc
        except (TypeError, ValueError) as exc:
            raise TranslationResponseError(
                "Configured translation service returned invalid data."
            ) from exc
        if not isinstance(data, dict):
            raise TranslationResponseError(
                "Configured translation service returned invalid data."
            )
        translated_text = data.get("text", data.get("translated_text"))
        if not isinstance(translated_text, str) or not translated_text.strip():
            raise TranslationResponseError(
                "Configured translation service returned no translated text."
            )
        source_language = data.get("source_language", request.source_language)
        target_language = data.get("target_language", request.target_language)
        provider = data.get("provider", "configured-translation")
        if not all(
            isinstance(value, str)
            for value in (source_language, target_language, provider)
        ):
            raise TranslationResponseError(
                "Configured translation service returned invalid metadata."
            )
        return TranslationResponse(
            text=translated_text,
            source_language=source_language,
            target_language=target_language,
            provider=provider,
        )


class SarvamTranslationService:
    """Sarvam Translate adapter for Indian regional language translation.

    Sarvam accepts up to 2,000 characters per request with
    ``sarvam-translate:v1``. Long catalogue descriptions are split at a
    sentence/word boundary and reassembled in order.
    """

    MAX_INPUT_CHARACTERS = 2000
    PROVIDER_NAME = "sarvam"

    def __init__(
        self,
        api_key: str,
        *,
        endpoint: str = "https://api.sarvam.ai/translate",
        model: str = "sarvam-translate:v1",
        mode: str = "formal",
        timeout: float = 20.0,
        client: httpx.Client | None = None,
    ) -> None:
        if not api_key.strip():
            raise TranslationConfigurationError("Sarvam API key is not configured.")
        self.endpoint = endpoint
        self.api_key = api_key
        self.model = model
        self.mode = mode
        self.max_input_characters = (
            1000 if model.lower().startswith("mayura:") else self.MAX_INPUT_CHARACTERS
        )
        self.client = client or httpx.Client(timeout=timeout)

    def translate(self, request: TranslationRequest) -> TranslationResponse:
        try:
            source_code = normalize_language_code(
                request.source_language, allow_auto=True
            )
            target_code = normalize_language_code(request.target_language)
        except UnsupportedLanguageError as exc:
            raise TranslationRequestError(str(exc)) from exc

        # Avoid a paid upstream call when a caller explicitly requests the
        # same language. This also makes the endpoint deterministic offline.
        if source_code != "auto" and source_code == target_code:
            return TranslationResponse(
                text=request.text,
                source_language=request.source_language,
                target_language=request.target_language,
                provider=self.PROVIDER_NAME,
            )

        translated_chunks = [
            self._translate_chunk(chunk, source_code, target_code)
            for chunk in _split_for_sarvam(
                request.text, max_characters=self.max_input_characters
            )
        ]
        return TranslationResponse(
            text="".join(translated_chunks),
            source_language=request.source_language,
            target_language=request.target_language,
            provider=self.PROVIDER_NAME,
        )

    def _translate_chunk(
        self, text: str, source_code: str, target_code: str
    ) -> str:
        payload = {
            "input": text,
            "source_language_code": source_code,
            "target_language_code": target_code,
            "model": self.model,
            "mode": self.mode,
        }
        try:
            response = self.client.post(
                self.endpoint,
                json=payload,
                headers={
                    "api-subscription-key": self.api_key,
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            # Do not echo provider response bodies: they can contain request
            # metadata or credentials in a proxy/error message.
            raise TranslationRequestError(
                "Sarvam translation request failed with status "
                f"{exc.response.status_code}."
            ) from exc
        except httpx.HTTPError as exc:
            raise TranslationRequestError(
                "Sarvam translation service could not be reached."
            ) from exc

        try:
            data = response.json()
        except (TypeError, ValueError) as exc:
            raise TranslationResponseError(
                "Sarvam returned an invalid translation response."
            ) from exc

        translated_text = data.get("translated_text") if isinstance(data, dict) else None
        if not isinstance(translated_text, str) or not translated_text.strip():
            raise TranslationResponseError("Sarvam returned no translated text.")
        return translated_text


def _split_for_sarvam(text: str, *, max_characters: int) -> list[str]:
    """Split text without losing whitespace or cutting words where possible."""

    if len(text) <= max_characters:
        return [text]

    chunks: list[str] = []
    remaining = text
    while len(remaining) > max_characters:
        candidate = remaining[:max_characters]
        boundary = max(
            candidate.rfind("\n"),
            candidate.rfind(". "),
            candidate.rfind("! "),
            candidate.rfind("? "),
            candidate.rfind(" "),
        )
        # A very long token has no safe word boundary; hard split is the only
        # way to honor Sarvam's request limit.
        cut_at = boundary + 1 if boundary > 0 else max_characters
        chunks.append(remaining[:cut_at])
        remaining = remaining[cut_at:]
    if remaining:
        chunks.append(remaining)
    return chunks