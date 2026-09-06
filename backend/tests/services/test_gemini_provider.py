from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import Any

import pytest

from app.services.catalogue.providers import gemini


class FakeGenerateContentConfig:
    def __init__(self, **kwargs: Any) -> None:
        self.kwargs = kwargs


class FakePart:
    calls: list[dict[str, Any]] = []

    @classmethod
    def from_bytes(cls, **kwargs: Any) -> dict[str, Any]:
        cls.calls.append(kwargs)
        return {"image_part": kwargs}


class FakeTypes:
    Part = FakePart
    GenerateContentConfig = FakeGenerateContentConfig


class FakeModels:
    def __init__(self, response: Any = None, error: Exception | None = None) -> None:
        self.calls: list[dict[str, Any]] = []
        self._response = response
        self._error = error

    async def generate_content(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        if self._error is not None:
            raise self._error
        return self._response


class FakeClient:
    def __init__(self, models: FakeModels) -> None:
        self.aio = SimpleNamespace(models=models)


def catalogue_data() -> dict[str, object]:
    return {
        "title": "Handwoven Jute Bag",
        "description": "Eco-friendly handwoven bag.",
        "category": "Bags",
        "material": "Jute",
        "craft_type": "Handwoven",
        "tags": ["handmade", "jute"],
        "attributes": {"color": "natural brown"},
    }


def build_provider(
    monkeypatch: pytest.MonkeyPatch,
    response: Any = None,
    error: Exception | None = None,
) -> tuple[gemini.GeminiCatalogueProvider, FakeModels]:
    FakePart.calls = []
    monkeypatch.setattr(gemini, "types", FakeTypes)
    models = FakeModels(response=response, error=error)
    return gemini.GeminiCatalogueProvider(api_key="test-key", client=FakeClient(models)), models


def test_valid_structured_gemini_response(monkeypatch: pytest.MonkeyPatch) -> None:
    provider, _ = build_provider(
        monkeypatch, response=SimpleNamespace(parsed=catalogue_data())
    )

    result = asyncio.run(provider.generate_catalogue(b"image", "image/jpeg", None))

    assert result == catalogue_data()


def test_image_bytes_and_voice_context_are_passed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider, models = build_provider(
        monkeypatch, response=SimpleNamespace(parsed=catalogue_data())
    )

    asyncio.run(
        provider.generate_catalogue(
            b"original-image", "image/png", "This bag is handwoven."
        )
    )

    assert FakePart.calls == [{"data": b"original-image", "mime_type": "image/png"}]
    assert "This bag is handwoven." in models.calls[0]["contents"][1]


def test_missing_api_key_is_rejected() -> None:
    with pytest.raises(gemini.GeminiConfigurationError):
        gemini.GeminiCatalogueProvider(api_key="")


def test_provider_failure_is_wrapped(monkeypatch: pytest.MonkeyPatch) -> None:
    provider, _ = build_provider(monkeypatch, error=RuntimeError("provider failure"))

    with pytest.raises(gemini.GeminiRequestError):
        asyncio.run(provider.generate_catalogue(b"image", "image/jpeg", None))


def test_malformed_response_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    provider, _ = build_provider(
        monkeypatch, response=SimpleNamespace(parsed=None, text="not valid json")
    )

    with pytest.raises(gemini.GeminiMalformedResponseError):
        asyncio.run(provider.generate_catalogue(b"image", "image/jpeg", None))


def test_missing_catalogue_field_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    response_data = catalogue_data()
    del response_data["title"]
    provider, _ = build_provider(
        monkeypatch, response=SimpleNamespace(parsed=response_data)
    )

    with pytest.raises(gemini.GeminiMalformedResponseError):
        asyncio.run(provider.generate_catalogue(b"image", "image/jpeg", None))


def test_price_fields_are_not_expected_from_gemini(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    response_data = catalogue_data()
    response_data["recommended_price_min"] = 550
    response_data["recommended_price_max"] = 650
    provider, models = build_provider(
        monkeypatch, response=SimpleNamespace(parsed=response_data)
    )

    result = asyncio.run(provider.generate_catalogue(b"image", "image/jpeg", None))
    response_schema = models.calls[0]["config"].kwargs["response_json_schema"]

    assert "recommended_price_min" not in result
    assert "recommended_price_max" not in result
    assert "recommended_price_min" not in response_schema["properties"]
    assert "recommended_price_max" not in response_schema["properties"]
