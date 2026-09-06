from __future__ import annotations

import asyncio
import json
from typing import Any, Mapping

from google import genai
from google.genai import types

from app.core.config import settings


CATALOGUE_FIELDS = (
    "title",
    "description",
    "category",
    "material",
    "craft_type",
    "tags",
    "attributes",
)

CATALOGUE_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "category": {"type": "string"},
        "material": {"type": "string"},
        "craft_type": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "attributes": {"type": "object"},
    },
    "required": list(CATALOGUE_FIELDS),
    "additionalProperties": False,
}

DEFAULT_TIMEOUT_SECONDS = 30.0


class GeminiProviderError(Exception):
    """Base error for Gemini catalogue provider failures."""


class GeminiConfigurationError(GeminiProviderError):
    """Raised when the Gemini provider is not configured."""


class GeminiTimeoutError(GeminiProviderError):
    """Raised when Gemini does not respond before the provider timeout."""


class GeminiRequestError(GeminiProviderError):
    """Raised when Gemini rejects or fails a catalogue-generation request."""


class GeminiMalformedResponseError(GeminiProviderError):
    """Raised when Gemini does not return usable structured catalogue data."""


class GeminiCatalogueProvider:
    """Gemini-backed implementation of the catalogue provider interface."""

    def __init__(
        self,
        api_key: str | None = None,
        model_name: str | None = None,
        client: Any | None = None,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        resolved_api_key = api_key if api_key is not None else settings.gemini_api_key
        if not resolved_api_key:
            raise GeminiConfigurationError("Gemini API key is not configured.")

        self._model_name = model_name or settings.gemini_model
        self._client = client or genai.Client(api_key=resolved_api_key)
        self._timeout_seconds = timeout_seconds

    async def generate_catalogue(
        self,
        image_bytes: bytes,
        mime_type: str,
        voice_text: str | None,
    ) -> Mapping[str, Any]:
        """Generate structured catalogue data from an original product image."""
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        prompt = self._build_prompt(voice_text)
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=CATALOGUE_JSON_SCHEMA,
        )

        try:
            response = await asyncio.wait_for(
                self._client.aio.models.generate_content(
                    model=self._model_name,
                    contents=[image_part, prompt],
                    config=config,
                ),
                timeout=self._timeout_seconds,
            )
        except asyncio.TimeoutError:
            raise GeminiTimeoutError("Gemini catalogue generation timed out.") from None
        except Exception:
            raise GeminiRequestError("Gemini catalogue generation failed.") from None

        return self._parse_response(response)

    @staticmethod
    def _build_prompt(voice_text: str | None) -> str:
        prompt = (
            "Analyze this artisan product image and return a product catalogue. "
            "Describe only what is supported by the image and supplied context. "
            "Return only the requested JSON schema and do not include price recommendations."
        )
        if voice_text:
            prompt = f"{prompt}\n\nArtisan-provided context:\n{voice_text}"
        return prompt

    @staticmethod
    def _parse_response(response: Any) -> Mapping[str, Any]:
        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, Mapping):
            data = dict(parsed)
        elif hasattr(parsed, "model_dump"):
            data = parsed.model_dump()
        else:
            response_text = getattr(response, "text", None)
            if not isinstance(response_text, str):
                raise GeminiMalformedResponseError(
                    "Gemini returned no parseable catalogue data."
                )
            try:
                data = json.loads(response_text)
            except (TypeError, json.JSONDecodeError):
                raise GeminiMalformedResponseError(
                    "Gemini returned malformed catalogue data."
                ) from None

        if not isinstance(data, Mapping):
            raise GeminiMalformedResponseError(
                "Gemini returned catalogue data in an invalid format."
            )

        missing_fields = [field for field in CATALOGUE_FIELDS if field not in data]
        if missing_fields:
            raise GeminiMalformedResponseError(
                "Gemini response is missing required catalogue fields."
            )

        return {field: data[field] for field in CATALOGUE_FIELDS}
