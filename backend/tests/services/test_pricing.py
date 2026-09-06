from __future__ import annotations

import asyncio
from typing import Any, Mapping, Sequence

import pytest

from app.services.catalogue.exceptions import (
    ComparableDataUnavailableError,
    InsufficientComparableDataError,
)
from app.services.catalogue.pricing import ComparableProduct, MvpPricingProvider


class InMemoryComparableSource:
    def __init__(self, comparables: Sequence[ComparableProduct]) -> None:
        self.comparables = comparables
        self.calls: list[Mapping[str, Any]] = []

    async def get_comparables(
        self,
        catalogue: Mapping[str, Any],
    ) -> Sequence[ComparableProduct]:
        self.calls.append(catalogue)
        return self.comparables


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


def valid_comparables() -> list[ComparableProduct]:
    return [
        ComparableProduct(500, "Bags", "Jute", "Handwoven"),
        ComparableProduct(600, "Bags", "Jute", "Handwoven"),
        ComparableProduct(700, "Bags", "Jute", "Handwoven"),
    ]


def test_valid_comparables_produce_deterministic_price_range() -> None:
    source = InMemoryComparableSource(valid_comparables())
    provider = MvpPricingProvider(source)

    price_range = asyncio.run(provider.recommend_price_range(catalogue_data()))

    assert price_range == (500.0, 700.0)
    assert source.calls == [catalogue_data()]


def test_repeated_identical_input_produces_identical_range() -> None:
    provider = MvpPricingProvider(InMemoryComparableSource(valid_comparables()))

    first_range = asyncio.run(provider.recommend_price_range(catalogue_data()))
    second_range = asyncio.run(provider.recommend_price_range(catalogue_data()))

    assert first_range == second_range


def test_invalid_comparable_prices_are_ignored() -> None:
    comparables = [
        *valid_comparables(),
        ComparableProduct(-100, "Bags", "Jute", "Handwoven"),
        ComparableProduct(0, "Bags", "Jute", "Handwoven"),
        ComparableProduct(float("nan"), "Bags", "Jute", "Handwoven"),
    ]
    provider = MvpPricingProvider(InMemoryComparableSource(comparables))

    price_range = asyncio.run(provider.recommend_price_range(catalogue_data()))

    assert price_range == (500.0, 700.0)


def test_no_comparable_products_is_handled_explicitly() -> None:
    provider = MvpPricingProvider(InMemoryComparableSource([]))

    with pytest.raises(ComparableDataUnavailableError):
        asyncio.run(provider.recommend_price_range(catalogue_data()))


def test_insufficient_valid_comparable_data_is_handled_explicitly() -> None:
    comparables = [
        ComparableProduct(500, "Bags", "Jute", "Handwoven"),
        ComparableProduct(-10, "Bags", "Jute", "Handwoven"),
        ComparableProduct(0, "Bags", "Jute", "Handwoven"),
    ]
    provider = MvpPricingProvider(InMemoryComparableSource(comparables))

    with pytest.raises(InsufficientComparableDataError):
        asyncio.run(provider.recommend_price_range(catalogue_data()))


def test_calculated_minimum_never_exceeds_maximum() -> None:
    comparables = [
        ComparableProduct(900, "Bags", "Jute", "Handwoven"),
        ComparableProduct(500, "Bags", "Jute", "Handwoven"),
        ComparableProduct(700, "Bags", "Jute", "Handwoven"),
    ]
    provider = MvpPricingProvider(InMemoryComparableSource(comparables))

    recommended_min, recommended_max = asyncio.run(
        provider.recommend_price_range(catalogue_data())
    )

    assert recommended_min <= recommended_max


def test_pricing_has_no_gemini_or_artisan_price_dependency() -> None:
    source = InMemoryComparableSource(valid_comparables())
    provider = MvpPricingProvider(source)

    price_range = asyncio.run(provider.recommend_price_range(catalogue_data()))

    assert price_range == (500.0, 700.0)
    assert not hasattr(provider, "final_price")
    assert not hasattr(provider, "artisan_price")
