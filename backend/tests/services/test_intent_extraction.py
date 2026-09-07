from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import Any

import pytest
from pydantic import ValidationError

from app.schemas.search import SearchIntent
from app.services.search.providers import gemini


class FakeGenerateContentConfig:
    def __init__(self, **kwargs: Any) -> None:
        self.kwargs = kwargs


class FakeTypes:
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


def build_extractor(
    monkeypatch: pytest.MonkeyPatch,
    response: Any = None,
    error: Exception | None = None,
    timeout_seconds: float = 30.0,
) -> tuple[gemini.GeminiIntentExtractor, FakeModels]:
    monkeypatch.setattr(gemini, "types", FakeTypes)
    models = FakeModels(response=response, error=error)
    extractor = gemini.GeminiIntentExtractor(
        api_key="test-key",
        client=FakeClient(models),
        timeout_seconds=timeout_seconds,
    )
    return extractor, models


# 1. Primary demo query
def test_primary_demo_query_extraction(monkeypatch: pytest.MonkeyPatch) -> None:
    expected_data = {
        "product": "handmade jute bags",
        "quantity": 100,
        "budget_per_unit": 700.0,
        "use_case": "hotel",
        "location": None,
    }
    extractor, models = build_extractor(
        monkeypatch, response=SimpleNamespace(parsed=expected_data)
    )

    result = asyncio.run(
        extractor.extract_intent(
            "I need 100 handmade jute bags for my hotel under 700 each."
        )
    )

    assert result.product == "handmade jute bags"
    assert result.quantity == 100
    assert result.budget_per_unit == 700.0
    assert result.use_case == "hotel"
    assert result.location is None
    assert "handmade jute bags" in models.calls[0]["contents"][0]


# 2. Query without budget
def test_query_without_budget(monkeypatch: pytest.MonkeyPatch) -> None:
    expected_data = {
        "product": "wooden toys",
        "quantity": 50,
        "budget_per_unit": None,
        "use_case": "primary school",
        "location": None,
    }
    extractor, _ = build_extractor(
        monkeypatch, response=SimpleNamespace(parsed=expected_data)
    )

    result = asyncio.run(
        extractor.extract_intent("50 wooden toys for primary school")
    )

    assert result.product == "wooden toys"
    assert result.quantity == 50
    assert result.budget_per_unit is None
    assert result.use_case == "primary school"
    assert result.location is None


# 3. Query without quantity
def test_query_without_quantity(monkeypatch: pytest.MonkeyPatch) -> None:
    expected_data = {
        "product": "handmade brass lamps",
        "quantity": None,
        "budget_per_unit": 1500.0,
        "use_case": "Diwali gifting",
        "location": None,
    }
    extractor, _ = build_extractor(
        monkeypatch, response=SimpleNamespace(parsed=expected_data)
    )

    result = asyncio.run(
        extractor.extract_intent(
            "handmade brass lamps for Diwali gifting under 1500 each"
        )
    )

    assert result.product == "handmade brass lamps"
    assert result.quantity is None
    assert result.budget_per_unit == 1500.0
    assert result.use_case == "Diwali gifting"
    assert result.location is None


# 4. Quantity + budget
def test_quantity_and_budget(monkeypatch: pytest.MonkeyPatch) -> None:
    expected_data = {
        "product": "ceramic cups",
        "quantity": 200,
        "budget_per_unit": 250.0,
        "use_case": None,
        "location": None,
    }
    extractor, _ = build_extractor(
        monkeypatch, response=SimpleNamespace(parsed=expected_data)
    )

    result = asyncio.run(extractor.extract_intent("200 ceramic cups under 250"))

    assert result.product == "ceramic cups"
    assert result.quantity == 200
    assert result.budget_per_unit == 250.0
    assert result.use_case is None
    assert result.location is None


# 5. Material/craft/product phrase preserved meaningfully
def test_material_craft_product_phrase_preserved(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    expected_data = {
        "product": "blue pottery hand-painted floral vases",
        "quantity": None,
        "budget_per_unit": None,
        "use_case": None,
        "location": None,
    }
    extractor, models = build_extractor(
        monkeypatch, response=SimpleNamespace(parsed=expected_data)
    )

    result = asyncio.run(
        extractor.extract_intent("blue pottery hand-painted floral vases")
    )

    assert result.product == "blue pottery hand-painted floral vases"
    assert result.quantity is None
    assert result.budget_per_unit is None

    # Verify additionalProperties=False in schema to ensure no undocumented top-level fields
    schema = models.calls[0]["config"].kwargs["response_json_schema"]
    assert schema["additionalProperties"] is False
    assert set(schema["properties"].keys()) == {
        "product",
        "quantity",
        "budget_per_unit",
        "use_case",
        "location",
    }


# 6. Geographic constraint
def test_geographic_constraint(monkeypatch: pytest.MonkeyPatch) -> None:
    expected_data = {
        "product": "embroidered shawls",
        "quantity": 50,
        "budget_per_unit": 2000.0,
        "use_case": None,
        "location": "Kashmir",
    }
    extractor, _ = build_extractor(
        monkeypatch, response=SimpleNamespace(parsed=expected_data)
    )

    result = asyncio.run(
        extractor.extract_intent("50 embroidered shawls from Kashmir under 2000")
    )

    assert result.product == "embroidered shawls"
    assert result.quantity == 50
    assert result.budget_per_unit == 2000.0
    assert result.location == "Kashmir"


# 7. Invalid empty query and whitespace-only
def test_empty_query_raises_validation_error(monkeypatch: pytest.MonkeyPatch) -> None:
    extractor, _ = build_extractor(monkeypatch)

    with pytest.raises(gemini.IntentQueryValidationError):
        asyncio.run(extractor.extract_intent(""))

    with pytest.raises(gemini.IntentQueryValidationError):
        asyncio.run(extractor.extract_intent("   \n\t  "))


# 8. Invalid quantity (zero or negative)
def test_invalid_quantity_rejected() -> None:
    with pytest.raises(ValidationError):
        SearchIntent(product="jute bags", quantity=0)

    with pytest.raises(ValidationError):
        SearchIntent(product="jute bags", quantity=-5)


# 9. Invalid budget (negative)
def test_invalid_budget_rejected() -> None:
    with pytest.raises(ValidationError):
        SearchIntent(product="jute bags", budget_per_unit=-1.0)


# 10. Malformed Gemini output
def test_malformed_gemini_output_raises_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extractor, _ = build_extractor(
        monkeypatch, response=SimpleNamespace(parsed=None, text="not valid json")
    )

    with pytest.raises(gemini.GeminiIntentMalformedResponseError):
        asyncio.run(extractor.extract_intent("jute bags"))


def test_missing_required_intent_fields_raises_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    partial_data = {
        "product": "jute bags",
        # missing quantity, budget_per_unit, use_case, location
    }
    extractor, _ = build_extractor(
        monkeypatch, response=SimpleNamespace(parsed=partial_data)
    )

    with pytest.raises(gemini.GeminiIntentMalformedResponseError):
        asyncio.run(extractor.extract_intent("jute bags"))


def test_undocumented_fields_in_gemini_response_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    data_with_extras = {
        "product": "jute bags",
        "quantity": 10,
        "budget_per_unit": 500.0,
        "use_case": None,
        "location": None,
        "undocumented_field": "invalid",
    }
    extractor, _ = build_extractor(
        monkeypatch, response=SimpleNamespace(parsed=data_with_extras)
    )

    with pytest.raises(gemini.GeminiIntentMalformedResponseError):
        asyncio.run(extractor.extract_intent("jute bags"))


# 11. Gemini timeout/failure
def test_gemini_timeout_propagates_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def slow_generate(**kwargs: Any) -> Any:
        await asyncio.sleep(1.0)

    models = FakeModels()
    models.generate_content = slow_generate  # type: ignore[assignment]
    monkeypatch.setattr(gemini, "types", FakeTypes)
    extractor = gemini.GeminiIntentExtractor(
        api_key="test-key",
        client=FakeClient(models),
        timeout_seconds=0.01,
    )

    with pytest.raises(gemini.GeminiIntentTimeoutError):
        asyncio.run(extractor.extract_intent("jute bags"))


def test_gemini_request_failure_propagates_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extractor, _ = build_extractor(
        monkeypatch, error=RuntimeError("API quota exceeded")
    )

    with pytest.raises(gemini.GeminiIntentRequestError):
        asyncio.run(extractor.extract_intent("jute bags"))


def test_missing_api_key_raises_configuration_error() -> None:
    with pytest.raises(gemini.GeminiIntentConfigurationError):
        gemini.GeminiIntentExtractor(api_key="")


# Schema normalization tests
def test_search_intent_normalization() -> None:
    intent = SearchIntent(
        product="  handmade jute bags  ",
        use_case="  hotel  ",
        location="  Jaipur  ",
        quantity=10,
        budget_per_unit=500,
    )

    assert intent.product == "handmade jute bags"
    assert intent.use_case == "hotel"
    assert intent.location == "Jaipur"


def test_search_intent_empty_optional_strings_normalize_to_none() -> None:
    intent = SearchIntent(
        product="jute bags",
        use_case="   ",
        location="",
    )

    assert intent.use_case is None
    assert intent.location is None


def test_search_intent_empty_product_rejected() -> None:
    with pytest.raises(ValidationError):
        SearchIntent(product="   ")
