from __future__ import annotations

import asyncio
import json
from typing import Any, Mapping

from google import genai
from google.genai import types
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.search import SearchIntent


INTENT_FIELDS = (
    "product",
    "quantity",
    "budget_per_unit",
    "use_case",
    "location",
)

INTENT_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "product": {
            "type": "string",
            "description": "The core product name, material, and craft description without quantity, price, or location constraints.",
        },
        "quantity": {
            "type": ["integer", "null"],
            "description": "Total quantity or item count requested by the buyer, or null if not specified.",
        },
        "budget_per_unit": {
            "type": ["number", "null"],
            "description": "Maximum budget or price per single unit in INR, or null if not specified.",
        },
        "use_case": {
            "type": ["string", "null"],
            "description": "Use case, event, venue, or buyer context (e.g. hotel, wedding, corporate gifting), or null if not specified.",
        },
        "location": {
            "type": ["string", "null"],
            "description": "Geographic location, city, or region requested, or null if not specified.",
        },
    },
    "required": list(INTENT_FIELDS),
    "additionalProperties": False,
}

DEFAULT_TIMEOUT_SECONDS = 30.0


class GeminiIntentExtractorError(Exception):
    """Base error for Gemini intent extractor failures."""


class GeminiIntentConfigurationError(GeminiIntentExtractorError):
    """Raised when the Gemini API key is not configured."""


class GeminiIntentTimeoutError(GeminiIntentExtractorError):
    """Raised when Gemini intent extraction times out."""


class GeminiIntentRequestError(GeminiIntentExtractorError):
    """Raised when Gemini rejects or fails an intent extraction request."""


class GeminiIntentMalformedResponseError(GeminiIntentExtractorError):
    """Raised when Gemini returns malformed or invalid intent data."""


class IntentQueryValidationError(ValueError):
    """Raised when the input query is invalid or empty."""


class GeminiIntentExtractor:
    """Gemini-backed implementation of the IntentExtractor interface."""

    def __init__(
        self,
        api_key: str | None = None,
        model_name: str | None = None,
        client: Any | None = None,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        resolved_api_key = api_key if api_key is not None else settings.gemini_api_key
        if not resolved_api_key:
            raise GeminiIntentConfigurationError("Gemini API key is not configured.")

        self._model_name = model_name or settings.gemini_model
        self._client = client or genai.Client(api_key=resolved_api_key)
        self._timeout_seconds = timeout_seconds

    async def extract_intent(self, query: str) -> SearchIntent:
        """Extract structured intent from a buyer search query using Gemini structured output."""
        if query is None or not isinstance(query, str) or not query.strip():
            raise IntentQueryValidationError("Search query is required and must not be empty.")

        prompt = self._build_prompt(query.strip())
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=INTENT_JSON_SCHEMA,
        )

        try:
            response = await asyncio.wait_for(
                self._client.aio.models.generate_content(
                    model=self._model_name,
                    contents=[prompt],
                    config=config,
                ),
                timeout=self._timeout_seconds,
            )
        except asyncio.TimeoutError:
            raise GeminiIntentTimeoutError("Gemini intent extraction timed out.") from None
        except Exception as exc:
            raise GeminiIntentRequestError(f"Gemini intent extraction failed: {exc}") from exc

        raw_data = self._parse_response(response)

        try:
            return SearchIntent.model_validate(raw_data)
        except ValidationError as exc:
            raise GeminiIntentMalformedResponseError(
                "Gemini returned data that does not conform to the SearchIntent schema."
            ) from exc

    @staticmethod
    def _build_prompt(query: str) -> str:
        return (
            "You are an intent extraction engine for ShilpSetu, an Indian artisan marketplace.\n"
            "Extract structured intent from the buyer's search query.\n\n"
            "Rules:\n"
            "1. 'product': Extract the core craft, material, and product noun (e.g. 'handmade jute bags', 'ceramic cups'). "
            "Do NOT include quantity, budget, or location words in the product field.\n"
            "2. 'quantity': Extract the requested item count as an integer if specified, else null.\n"
            "3. 'budget_per_unit': Extract the maximum price per unit in INR as a number if specified, else null.\n"
            "4. 'use_case': Extract the occasion, venue, or application (e.g. 'hotel', 'Diwali gifting') if specified, else null.\n"
            "5. 'location': Extract the geographic location or region if specified, else null.\n\n"
            f"Buyer query: {query}"
        )

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
                raise GeminiIntentMalformedResponseError(
                    "Gemini returned no parseable intent data."
                )
            try:
                data = json.loads(response_text)
            except (TypeError, json.JSONDecodeError):
                raise GeminiIntentMalformedResponseError(
                    "Gemini returned malformed intent data."
                ) from None

        if not isinstance(data, Mapping):
            raise GeminiIntentMalformedResponseError(
                "Gemini returned intent data in an invalid format."
            )

        missing_fields = [field for field in INTENT_FIELDS if field not in data]
        if missing_fields:
            raise GeminiIntentMalformedResponseError(
                "Gemini response is missing required intent fields."
            )

        extra_fields = [k for k in data if k not in INTENT_FIELDS]
        if extra_fields:
            raise GeminiIntentMalformedResponseError(
                f"Gemini response contains undocumented fields: {extra_fields}"
            )

        return {field: data[field] for field in INTENT_FIELDS}
