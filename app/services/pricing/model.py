from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Mapping, Protocol

from app.schemas.api import (
    PriceObservation,
    PriceRecommendationRequest,
    PriceRecommendationResponse,
    PriceTrainResponse,
)


class MarketPriceModel:
    """Small data-trained categorical model for the MVP.

    It learns a global price baseline plus smoothed category, material, and
    craft-type effects. This is deliberately deterministic and explainable;
    it can later be replaced by a regression/gradient-boosting artifact
    without changing the pricing API.
    """

    version = "market-categorical-v1"

    def __init__(self, observation_sink=None) -> None:
        self.observation_sink = observation_sink
        self.trained_at: datetime | None = None
        self.observation_count = 0
        self.global_mean = 0.0
        self.effects: dict[str, dict[str, float]] = {}

    def train(self, observations: list[PriceObservation]) -> PriceTrainResponse:
        if self.observation_sink is not None:
            self.observation_sink.save_price_observations(observations)
        self.observation_count = len(observations)
        self.global_mean = sum(item.price for item in observations) / len(observations)
        dimensions = {
            "category": defaultdict(list),
            "material": defaultdict(list),
            "craft_type": defaultdict(list),
        }
        for item in observations:
            dimensions["category"][item.category.lower()].append(item.price)
            dimensions["material"][item.material.lower()].append(item.price)
            dimensions["craft_type"][item.craft_type.lower()].append(item.price)
        self.effects = {}
        for name, values in dimensions.items():
            # Shrink small groups toward the global mean to avoid overfitting.
            self.effects[name] = {
                key: (sum(prices) + self.global_mean * 2) / (len(prices) + 2)
                for key, prices in values.items()
            }
        self.trained_at = datetime.now(timezone.utc)
        return PriceTrainResponse(
            model_version=self.version,
            observations=self.observation_count,
            trained_at=self.trained_at,
        )

    def predict(self, request: PriceRecommendationRequest) -> PriceRecommendationResponse:
        baseline = self.global_mean or 0.0
        values = [
            self.effects.get("category", {}).get(request.category.lower()),
            self.effects.get("material", {}).get(request.material.lower()),
            self.effects.get("craft_type", {}).get(request.craft_type.lower()),
        ]
        known_values = [value for value in values if value is not None]
        if known_values:
            prediction = sum(known_values) / len(known_values)
        elif baseline:
            prediction = baseline
        else:
            prediction = 0.0
        # Bulk quantity is a signal, but the recommendation is per unit.
        discount = 0.95 if request.quantity >= 100 else 1.0
        prediction *= discount
        return PriceRecommendationResponse(
            recommended_price_min=round(prediction * 0.9, 2),
            recommended_price_max=round(prediction * 1.1, 2),
            model_version=self.version,
        )

    def is_trained(self) -> bool:
        return self.observation_count >= 3


class PriceFallback(Protocol):
    async def recommend_price_range(
        self, catalogue: Mapping[str, Any]
    ) -> tuple[float, float]: ...


class MarketAwarePricingProvider:
    """Uses the trained market model and falls back to comparable products."""

    def __init__(self, model: MarketPriceModel, fallback: PriceFallback):
        self.model = model
        self.fallback = fallback

    async def recommend_price_range(
        self, catalogue: Mapping[str, Any]
    ) -> tuple[float, float]:
        if self.model.is_trained():
            recommendation = self.model.predict(
                PriceRecommendationRequest(
                    category=str(catalogue.get("category", "general")),
                    material=str(catalogue.get("material", "general")),
                    craft_type=str(catalogue.get("craft_type", "general")),
                )
            )
            return (
                recommendation.recommended_price_min,
                recommendation.recommended_price_max,
            )
        return await self.fallback.recommend_price_range(catalogue)