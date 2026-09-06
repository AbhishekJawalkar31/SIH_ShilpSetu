from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Mapping, Protocol, Sequence

from app.services.catalogue.exceptions import (
    CataloguePricingError,
    ComparableDataUnavailableError,
    InsufficientComparableDataError,
)


MINIMUM_COMPARABLES = 3


@dataclass(frozen=True)
class ComparableProduct:
    """Comparable product data supplied by the backend/database layer.

    Prices that are non-numeric, non-finite, or not greater than zero are
    ignored. They cannot represent a usable market comparable.
    """

    price: float
    category: str | None = None
    material: str | None = None
    craft_type: str | None = None


class ComparableProductSource(Protocol):
    """Retrieves comparable products without coupling pricing to a database."""

    async def get_comparables(
        self,
        catalogue: Mapping[str, Any],
    ) -> Sequence[ComparableProduct]:
        """Return comparable-product records relevant to the catalogue."""


class MvpPricingProvider:
    """Deterministic comparable-product price recommendation for the MVP.

    Each valid comparable receives a base weight of 1.0. Matching category,
    material, and craft type add weights of 0.5, 0.3, and 0.2 respectively.
    The recommended range is the weighted 25th to 75th percentile of those
    comparable prices. The component never creates or stores an artisan price.
    """

    def __init__(self, comparable_source: ComparableProductSource) -> None:
        self._comparable_source = comparable_source

    async def recommend_price_range(
        self,
        catalogue: Mapping[str, Any],
    ) -> tuple[float, float]:
        """Return a deterministic recommendation from supplied comparables."""
        comparables = await self._comparable_source.get_comparables(catalogue)
        if not comparables:
            raise ComparableDataUnavailableError(
                "No comparable products are available for price recommendation."
            )

        weighted_prices = self._valid_weighted_prices(catalogue, comparables)
        if len(weighted_prices) < MINIMUM_COMPARABLES:
            raise InsufficientComparableDataError(
                "At least three valid comparable prices are required for pricing."
            )

        recommended_min = self._weighted_quantile(weighted_prices, 0.25)
        recommended_max = self._weighted_quantile(weighted_prices, 0.75)
        if recommended_min > recommended_max:
            raise CataloguePricingError(
                "Calculated price recommendation has an invalid range."
            )

        return recommended_min, recommended_max

    @staticmethod
    def _valid_weighted_prices(
        catalogue: Mapping[str, Any],
        comparables: Sequence[ComparableProduct],
    ) -> list[tuple[float, float]]:
        weighted_prices: list[tuple[float, float]] = []
        for comparable in comparables:
            if not MvpPricingProvider._is_valid_price(comparable.price):
                continue
            weighted_prices.append(
                (
                    float(comparable.price),
                    MvpPricingProvider._similarity_weight(catalogue, comparable),
                )
            )

        return sorted(weighted_prices, key=lambda item: item[0])

    @staticmethod
    def _is_valid_price(price: object) -> bool:
        return (
            isinstance(price, (int, float))
            and not isinstance(price, bool)
            and math.isfinite(float(price))
            and float(price) > 0
        )

    @staticmethod
    def _similarity_weight(
        catalogue: Mapping[str, Any],
        comparable: ComparableProduct,
    ) -> float:
        weight = 1.0
        if catalogue.get("category") == comparable.category:
            weight += 0.5
        if catalogue.get("material") == comparable.material:
            weight += 0.3
        if catalogue.get("craft_type") == comparable.craft_type:
            weight += 0.2
        return weight

    @staticmethod
    def _weighted_quantile(
        weighted_prices: Sequence[tuple[float, float]],
        quantile: float,
    ) -> float:
        total_weight = sum(weight for _, weight in weighted_prices)
        threshold = total_weight * quantile
        cumulative_weight = 0.0

        for price, weight in weighted_prices:
            cumulative_weight += weight
            if cumulative_weight >= threshold:
                return price

        raise CataloguePricingError("Unable to calculate a price recommendation.")
