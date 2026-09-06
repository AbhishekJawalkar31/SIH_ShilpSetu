from __future__ import annotations

import asyncio
from typing import Any, Mapping

import pytest

from app.schemas.catalogue import CatalogueGenerationResponse
from app.services.catalogue.exceptions import (
    CatalogueDataValidationError,
    CataloguePricingError,
)
from app.services.catalogue.pricing import ComparableProduct, MvpPricingProvider
from app.services.catalogue.providers.gemini import GeminiRequestError
from app.services.catalogue.service import CatalogueService


class FakeCatalogueProvider:
    def __init__(
        self,
        response: Mapping[str, Any] | None = None,
        error: Exception | None = None,
    ) -> None:
        self.calls: list[dict[str, Any]] = []
        self._response = response
        self._error = error

    async def generate_catalogue(
        self,
        image_bytes: bytes,
        mime_type: str,
        voice_text: str | None,
    ) -> Mapping[str, Any]:
        self.calls.append(
            {
                "image_bytes": image_bytes,
                "mime_type": mime_type,
                "voice_text": voice_text,
            }
        )
        if self._error is not None:
            raise self._error
        assert self._response is not None
        return self._response


class FakePricingProvider:
    def __init__(
        self,
        price_range: tuple[float, float] = (550, 650),
        error: Exception | None = None,
    ) -> None:
        self.calls: list[Mapping[str, Any]] = []
        self._price_range = price_range
        self._error = error

    async def recommend_price_range(
        self,
        catalogue: Mapping[str, Any],
    ) -> tuple[float, float]:
        self.calls.append(catalogue)
        if self._error is not None:
            raise self._error
        return self._price_range


def catalogue_data() -> dict[str, Any]:
    return {
        "title": "Handwoven Jute Bag",
        "description": "Eco-friendly handwoven bag.",
        "category": "Bags",
        "material": "Jute",
        "craft_type": "Handwoven",
        "tags": ["handmade", "jute"],
        "attributes": {"color": "natural brown"},
    }


def build_service(
    catalogue_provider: FakeCatalogueProvider,
    pricing_provider: FakePricingProvider,
) -> CatalogueService:
    return CatalogueService(
        catalogue_provider=catalogue_provider,
        pricing_provider=pricing_provider,
    )


def test_valid_gemini_output_reaches_service() -> None:
    catalogue_provider = FakeCatalogueProvider(response=catalogue_data())
    pricing_provider = FakePricingProvider()
    service = build_service(catalogue_provider, pricing_provider)

    response = asyncio.run(service.generate_catalogue(b"image", "image/jpeg", None))

    assert response.title == "Handwoven Jute Bag"
    assert response.recommended_price_min == 550
    assert response.recommended_price_max == 650


def test_voice_text_and_image_data_are_forwarded_to_gemini() -> None:
    catalogue_provider = FakeCatalogueProvider(response=catalogue_data())
    pricing_provider = FakePricingProvider()
    service = build_service(catalogue_provider, pricing_provider)

    asyncio.run(
        service.generate_catalogue(
            b"original-image", "image/png", "This bag is handwoven."
        )
    )

    assert catalogue_provider.calls == [
        {
            "image_bytes": b"original-image",
            "mime_type": "image/png",
            "voice_text": "This bag is handwoven.",
        }
    ]


def test_gemini_provider_failure_is_preserved() -> None:
    catalogue_provider = FakeCatalogueProvider(error=GeminiRequestError("provider failed"))
    pricing_provider = FakePricingProvider()
    service = build_service(catalogue_provider, pricing_provider)

    with pytest.raises(GeminiRequestError):
        asyncio.run(service.generate_catalogue(b"image", "image/jpeg", None))


def test_malformed_catalogue_data_is_rejected() -> None:
    malformed_data = catalogue_data()
    del malformed_data["title"]
    catalogue_provider = FakeCatalogueProvider(response=malformed_data)
    pricing_provider = FakePricingProvider()
    service = build_service(catalogue_provider, pricing_provider)

    with pytest.raises(CatalogueDataValidationError):
        asyncio.run(service.generate_catalogue(b"image", "image/jpeg", None))


def test_pricing_dependency_is_called_separately() -> None:
    catalogue_provider = FakeCatalogueProvider(response=catalogue_data())
    pricing_provider = FakePricingProvider()
    service = build_service(catalogue_provider, pricing_provider)

    asyncio.run(service.generate_catalogue(b"image", "image/jpeg", None))

    assert pricing_provider.calls == [catalogue_data()]


def test_gemini_output_with_price_fields_is_rejected() -> None:
    generated_data = catalogue_data()
    generated_data["recommended_price_min"] = 550
    generated_data["recommended_price_max"] = 650
    catalogue_provider = FakeCatalogueProvider(response=generated_data)
    pricing_provider = FakePricingProvider()
    service = build_service(catalogue_provider, pricing_provider)

    with pytest.raises(CatalogueDataValidationError):
        asyncio.run(service.generate_catalogue(b"image", "image/jpeg", None))

    assert pricing_provider.calls == []


def test_pricing_failure_is_handled() -> None:
    catalogue_provider = FakeCatalogueProvider(response=catalogue_data())
    pricing_provider = FakePricingProvider(error=RuntimeError("pricing failed"))
    service = build_service(catalogue_provider, pricing_provider)

    with pytest.raises(CataloguePricingError):
        asyncio.run(service.generate_catalogue(b"image", "image/jpeg", None))


def test_final_response_conforms_to_catalogue_response_schema() -> None:
    catalogue_provider = FakeCatalogueProvider(response=catalogue_data())
    pricing_provider = FakePricingProvider(price_range=(550, 650))
    service = build_service(catalogue_provider, pricing_provider)

    response = asyncio.run(service.generate_catalogue(b"image", "image/jpeg", None))

    assert isinstance(response, CatalogueGenerationResponse)
    assert response.model_dump() == {
        **catalogue_data(),
        "recommended_price_min": 550.0,
        "recommended_price_max": 650.0,
    }


def test_full_pipeline_orchestration_with_mvp_pricing() -> None:
    class InMemoryComparableSource:
        async def get_comparables(self, catalogue: Mapping[str, Any]) -> list[ComparableProduct]:
            return [
                ComparableProduct(500, "Bags", "Jute", "Handwoven"),
                ComparableProduct(600, "Bags", "Jute", "Handwoven"),
                ComparableProduct(700, "Bags", "Jute", "Handwoven"),
            ]

    catalogue_provider = FakeCatalogueProvider(response=catalogue_data())
    pricing_provider = MvpPricingProvider(InMemoryComparableSource())
    service = CatalogueService(
        catalogue_provider=catalogue_provider,
        pricing_provider=pricing_provider,
    )

    response = asyncio.run(
        service.generate_catalogue(
            image_bytes=b"raw-image-bytes",
            mime_type="image/jpeg",
            voice_text="Handcrafted jute bag context",
        )
    )

    assert isinstance(response, CatalogueGenerationResponse)
    assert response.title == "Handwoven Jute Bag"
    assert response.material == "Jute"
    assert response.recommended_price_min == 500.0
    assert response.recommended_price_max == 700.0
    assert catalogue_provider.calls[0]["voice_text"] == "Handcrafted jute bag context"


def test_pricing_returning_invalid_range_raises_pricing_error() -> None:
    catalogue_provider = FakeCatalogueProvider(response=catalogue_data())
    # pricing returns min > max which violates schema validation
    pricing_provider = FakePricingProvider(price_range=(800, 400))
    service = build_service(catalogue_provider, pricing_provider)

    with pytest.raises(CataloguePricingError):
        asyncio.run(service.generate_catalogue(b"image", "image/jpeg", None))

