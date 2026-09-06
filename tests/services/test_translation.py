from __future__ import annotations

import json

import httpx

from app.schemas.api import TranslationRequest
from app.services.translation.service import SarvamTranslationService


def test_sarvam_translation_uses_regional_codes_and_auth_header() -> None:
    calls: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(
            {
                "url": str(request.url),
                "headers": dict(request.headers),
                "json": request.read().decode(),
            }
        )
        return httpx.Response(
            200,
            json={
                "translated_text": "नमस्ते",
                "source_language_code": "en-IN",
            },
            request=request,
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    service = SarvamTranslationService(
        "test-sarvam-key",
        endpoint="https://api.sarvam.ai/translate",
        client=client,
    )

    result = service.translate(
        TranslationRequest(
            text="Hello",
            source_language="en",
            target_language="hi",
        )
    )

    assert result.text == "नमस्ते"
    assert result.provider == "sarvam"
    assert calls[0]["headers"]["api-subscription-key"] == "test-sarvam-key"
    payload = json.loads(calls[0]["json"])
    assert payload["source_language_code"] == "en-IN"
    assert payload["target_language_code"] == "hi-IN"
    assert payload["model"] == "sarvam-translate:v1"


def test_sarvam_translation_chunks_long_input() -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(
            200,
            json={"translated_text": "translated"},
            request=request,
        )

    service = SarvamTranslationService(
        "test-sarvam-key",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    text = ("A long product description. " * 100).strip()

    result = service.translate(
        TranslationRequest(
            text=text,
            source_language="en-IN",
            target_language="mr-IN",
        )
    )

    assert calls > 1
    assert result.text == "translated" * calls