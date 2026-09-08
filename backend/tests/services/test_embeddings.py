from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import Any

import pytest

from app.schemas.search import SearchIntent
from app.services.search.embeddings import (
    EmbeddingTextValidationError,
    GeminiEmbeddingConfigurationError,
    GeminiEmbeddingMalformedResponseError,
    GeminiEmbeddingProvider,
    GeminiEmbeddingRequestError,
    GeminiEmbeddingTimeoutError,
    ProductEmbeddingInput,
    build_product_source_text,
    build_query_embedding_text,
)
from app.services.search.embeddings import gemini as gemini_module


class FakeEmbedContentConfig:
    def __init__(self, **kwargs: Any) -> None:
        self.kwargs = kwargs


class FakeTypes:
    EmbedContentConfig = FakeEmbedContentConfig


class FakeModels:
    def __init__(self, response: Any = None, error: Exception | None = None) -> None:
        self.calls: list[dict[str, Any]] = []
        self._response = response
        self._error = error

    async def embed_content(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        if self._error is not None:
            raise self._error
        return self._response


class FakeClient:
    def __init__(self, models: FakeModels) -> None:
        self.aio = SimpleNamespace(models=models)


def build_embedding_provider(
    monkeypatch: pytest.MonkeyPatch,
    response: Any = None,
    error: Exception | None = None,
    timeout_seconds: float = 30.0,
    dimension: int = 768,
) -> tuple[GeminiEmbeddingProvider, FakeModels]:
    monkeypatch.setattr(gemini_module, "types", FakeTypes)
    models = FakeModels(response=response, error=error)
    provider = GeminiEmbeddingProvider(
        api_key="test-key",
        dimension=dimension,
        client=FakeClient(models),
        timeout_seconds=timeout_seconds,
    )
    return provider, models


def make_valid_vector(dim: int = 768) -> list[float]:
    return [0.01 * (i % 10) for i in range(dim)]


# 1. Product text generation
def test_product_source_text_generation() -> None:
    product = ProductEmbeddingInput(
        title="Handwoven Jute Bag",
        description="Eco-friendly handwoven bag for events.",
        category="Bags",
        craft_type="Handwoven",
        material="Jute",
        tags=["handmade", "jute", "eco-friendly"],
        attributes={"color": "natural brown", "size": "medium"},
    )
    text = build_product_source_text(product)

    assert "Title: Handwoven Jute Bag" in text
    assert "Category: Bags" in text
    assert "Craft: Handwoven" in text
    assert "Material: Jute" in text
    assert "Description: Eco-friendly handwoven bag for events." in text
    assert "Tags: handmade, jute, eco-friendly" in text
    assert "Attributes: color: natural brown, size: medium" in text


# 2. Buyer query text generation
def test_buyer_query_text_generation() -> None:
    intent_with_use_case = SearchIntent(
        product="handmade jute bags",
        quantity=100,
        budget_per_unit=700.0,
        use_case="hotel",
    )
    text = build_query_embedding_text(intent_with_use_case)
    assert text == "handmade jute bags for hotel"

    intent_without_use_case = SearchIntent(
        product="wooden toys",
        quantity=50,
        budget_per_unit=None,
        use_case=None,
    )
    text_no_case = build_query_embedding_text(intent_without_use_case)
    assert text_no_case == "wooden toys"


# 3. Empty text rejection
def test_empty_text_rejection(monkeypatch: pytest.MonkeyPatch) -> None:
    provider, _ = build_embedding_provider(monkeypatch)

    with pytest.raises(EmbeddingTextValidationError):
        asyncio.run(provider.embed_document(""))

    with pytest.raises(EmbeddingTextValidationError):
        asyncio.run(provider.embed_query(""))


# 4. Whitespace-only text rejection
def test_whitespace_only_text_rejection(monkeypatch: pytest.MonkeyPatch) -> None:
    provider, _ = build_embedding_provider(monkeypatch)

    with pytest.raises(EmbeddingTextValidationError):
        asyncio.run(provider.embed_document("   \n\t  "))

    with pytest.raises(EmbeddingTextValidationError):
        asyncio.run(provider.embed_query("   "))


# 5. Correct model is passed
def test_correct_model_passed(monkeypatch: pytest.MonkeyPatch) -> None:
    vector = make_valid_vector(768)
    response = SimpleNamespace(
        embeddings=[SimpleNamespace(values=vector)]
    )
    provider, models = build_embedding_provider(monkeypatch, response=response)

    result = asyncio.run(provider.embed_query("ceramic cups"))

    assert models.calls[0]["model"] == "gemini-embedding-001"
    assert models.calls[0]["contents"] == "ceramic cups"
    assert len(result) == 768


# 6. RETRIEVAL_DOCUMENT is used for product embeddings
def test_retrieval_document_task_type(monkeypatch: pytest.MonkeyPatch) -> None:
    vector = make_valid_vector(768)
    response = SimpleNamespace(
        embeddings=[SimpleNamespace(values=vector)]
    )
    provider, models = build_embedding_provider(monkeypatch, response=response)

    asyncio.run(provider.embed_document("Title: Jute Bag\nMaterial: Jute", title="Jute Bag"))

    config = models.calls[0]["config"].kwargs
    assert config["task_type"] == "RETRIEVAL_DOCUMENT"
    assert config["title"] == "Jute Bag"


# 7. RETRIEVAL_QUERY is used for buyer query embeddings
def test_retrieval_query_task_type(monkeypatch: pytest.MonkeyPatch) -> None:
    vector = make_valid_vector(768)
    response = SimpleNamespace(
        embeddings=[SimpleNamespace(values=vector)]
    )
    provider, models = build_embedding_provider(monkeypatch, response=response)

    asyncio.run(provider.embed_query("handmade jute bags for hotel"))

    config = models.calls[0]["config"].kwargs
    assert config["task_type"] == "RETRIEVAL_QUERY"
    assert "title" not in config


# 8. output_dimensionality=768 is requested
def test_output_dimensionality_requested(monkeypatch: pytest.MonkeyPatch) -> None:
    vector = make_valid_vector(768)
    response = SimpleNamespace(
        embeddings=[SimpleNamespace(values=vector)]
    )
    provider, models = build_embedding_provider(monkeypatch, response=response)

    asyncio.run(provider.embed_query("jute bags"))

    config = models.calls[0]["config"].kwargs
    assert config["output_dimensionality"] == 768


# 9. Valid 768-dimensional vector returned correctly
def test_valid_768_vector_returned(monkeypatch: pytest.MonkeyPatch) -> None:
    vector = make_valid_vector(768)
    response = SimpleNamespace(
        embeddings=[SimpleNamespace(values=vector)]
    )
    provider, _ = build_embedding_provider(monkeypatch, response=response)

    result = asyncio.run(provider.embed_document("test text"))

    assert len(result) == 768
    assert result == vector
    assert all(isinstance(v, float) for v in result)


# 10. Missing or empty Gemini embedding response raises error
def test_empty_embedding_response_raises_error(monkeypatch: pytest.MonkeyPatch) -> None:
    provider, _ = build_embedding_provider(monkeypatch, response=SimpleNamespace(embeddings=[]))

    with pytest.raises(GeminiEmbeddingMalformedResponseError):
        asyncio.run(provider.embed_query("test query"))

    provider_none, _ = build_embedding_provider(monkeypatch, response=SimpleNamespace(embeddings=None))

    with pytest.raises(GeminiEmbeddingMalformedResponseError):
        asyncio.run(provider_none.embed_query("test query"))


# 11. Wrong embedding dimension raises error
def test_wrong_dimension_raises_error(monkeypatch: pytest.MonkeyPatch) -> None:
    wrong_vector = make_valid_vector(512)  # 512 instead of 768
    response = SimpleNamespace(
        embeddings=[SimpleNamespace(values=wrong_vector)]
    )
    provider, _ = build_embedding_provider(monkeypatch, response=response)

    with pytest.raises(GeminiEmbeddingMalformedResponseError):
        asyncio.run(provider.embed_query("test query"))


# 12. Gemini API failure raises clean provider error
def test_gemini_api_failure_raises_provider_error(monkeypatch: pytest.MonkeyPatch) -> None:
    provider, _ = build_embedding_provider(
        monkeypatch, error=RuntimeError("Google Gemini service unavailable")
    )

    with pytest.raises(GeminiEmbeddingRequestError):
        asyncio.run(provider.embed_query("test query"))


# 13. Timeout raises clean timeout error
def test_timeout_raises_clean_error(monkeypatch: pytest.MonkeyPatch) -> None:
    async def slow_embed(**kwargs: Any) -> Any:
        await asyncio.sleep(1.0)

    models = FakeModels()
    models.embed_content = slow_embed  # type: ignore[assignment]
    monkeypatch.setattr(gemini_module, "types", FakeTypes)
    provider = GeminiEmbeddingProvider(
        api_key="test-key",
        client=FakeClient(models),
        timeout_seconds=0.01,
    )

    with pytest.raises(GeminiEmbeddingTimeoutError):
        asyncio.run(provider.embed_query("test query"))


# 14. Missing API key raises configuration error
def test_missing_api_key_raises_configuration_error() -> None:
    with pytest.raises(GeminiEmbeddingConfigurationError):
        GeminiEmbeddingProvider(api_key="")


# 15. Deterministic product source text
def test_product_source_text_is_strictly_deterministic() -> None:
    product1 = ProductEmbeddingInput(
        title="Pottery Vase",
        description="Blue hand-painted vase.",
        attributes={"size": "large", "color": "blue", "weight": "500g"},
    )
    product2 = ProductEmbeddingInput(
        title="Pottery Vase",
        description="Blue hand-painted vase.",
        attributes={"weight": "500g", "color": "blue", "size": "large"},  # reversed order
    )

    text1 = build_product_source_text(product1)
    text2 = build_product_source_text(product2)

    assert text1 == text2
    assert "Attributes: color: blue, size: large, weight: 500g" in text1
