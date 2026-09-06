from __future__ import annotations

from typing import Any, Mapping, Protocol
from uuid import UUID

from pydantic import ValidationError

from app.schemas.catalogue import CatalogueGenerationResponse
from app.services.catalogue.exceptions import (
    CatalogueDataValidationError,
    CataloguePricingError,
    CatalogueProviderError,
)
from app.services.catalogue.providers.base import CatalogueProvider
from app.services.catalogue.providers.gemini import (
    GeminiCatalogueProvider,
    GeminiProviderError,
)


PRICE_FIELDS = {"recommended_price_min", "recommended_price_max"}


class PricingProvider(Protocol):
    """Interface for comparable-product price recommendation implementations."""

    async def recommend_price_range(
        self,
        catalogue: Mapping[str, Any],
    ) -> tuple[float, float]:
        """Return a deterministic recommended minimum and maximum price range."""


class CatalogueService:
    """Orchestrates catalogue generation, validation, and price recommendation."""

    def __init__(
        self,
        pricing_provider: PricingProvider,
        catalogue_provider: CatalogueProvider | None = None,
    ) -> None:
        self._catalogue_provider = catalogue_provider or GeminiCatalogueProvider()
        self._pricing_provider = pricing_provider

    async def generate_catalogue(
        self,
        image_bytes: bytes,
        mime_type: str,
        voice_text: str | None,
        artisan_id: UUID | None = None,
    ) -> CatalogueGenerationResponse:
        """Generate and validate a priced catalogue from an image and optional text."""
        _ = artisan_id
        generated_catalogue = await self._generate_with_provider(
            image_bytes=image_bytes,
            mime_type=mime_type,
            voice_text=voice_text,
        )
        validated_catalogue = self._validate_catalogue_fields(generated_catalogue)
        price_min, price_max = await self._recommend_price_range(validated_catalogue)

        response_payload = validated_catalogue.model_dump(
            exclude={"recommended_price_min", "recommended_price_max"}
        )
        response_payload.update(
            {
                "recommended_price_min": price_min,
                "recommended_price_max": price_max,
            }
        )

        try:
            return CatalogueGenerationResponse.model_validate(response_payload)
        except ValidationError:
            raise CataloguePricingError(
                "Pricing returned an invalid recommended price range."
            ) from None

    async def _generate_with_provider(
        self,
        image_bytes: bytes,
        mime_type: str,
        voice_text: str | None,
    ) -> Mapping[str, Any]:
        try:
            return await self._catalogue_provider.generate_catalogue(
                image_bytes=image_bytes,
                mime_type=mime_type,
                voice_text=voice_text,
            )
        except GeminiProviderError:
            raise
        except Exception:
            raise CatalogueProviderError("Catalogue generation provider failed.") from None

    @staticmethod
    def _validate_catalogue_fields(
        generated_catalogue: Mapping[str, Any],
    ) -> CatalogueGenerationResponse:
        if not isinstance(generated_catalogue, Mapping):
            raise CatalogueDataValidationError(
                "Catalogue provider returned data in an invalid format."
            )
        if PRICE_FIELDS.intersection(generated_catalogue):
            raise CatalogueDataValidationError(
                "Catalogue provider must not provide price recommendation fields."
            )

        payload = dict(generated_catalogue)
        payload.update(
            {
                "recommended_price_min": 0,
                "recommended_price_max": 0,
            }
        )
        try:
            return CatalogueGenerationResponse.model_validate(payload)
        except ValidationError:
            raise CatalogueDataValidationError(
                "Catalogue provider returned data that does not match the catalogue schema."
            ) from None

    async def _recommend_price_range(
        self,
        catalogue: CatalogueGenerationResponse,
    ) -> tuple[float, float]:
        catalogue_fields = catalogue.model_dump(
            exclude={"recommended_price_min", "recommended_price_max"}
        )
        try:
            price_min, price_max = await self._pricing_provider.recommend_price_range(
                catalogue_fields
            )
        except CataloguePricingError:
            raise
        except Exception:
            raise CataloguePricingError("Price recommendation failed.") from None

        return price_min, price_max
