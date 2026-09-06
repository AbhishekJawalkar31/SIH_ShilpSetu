from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.api import (
    PriceRecommendationRequest,
    PriceRecommendationResponse,
    PriceTrainRequest,
    PriceTrainResponse,
)
from app.services.pricing.model import MarketPriceModel


router = APIRouter(prefix="/api/pricing", tags=["pricing"])


def get_price_model() -> MarketPriceModel:
    raise RuntimeError("Price model has not been configured.")


@router.post("/train", response_model=PriceTrainResponse)
def train_price_model(
    request: PriceTrainRequest,
    model: MarketPriceModel = Depends(get_price_model),
) -> PriceTrainResponse:
    return model.train(request.observations)


@router.post("/recommend", response_model=PriceRecommendationResponse)
def recommend_price(
    request: PriceRecommendationRequest,
    model: MarketPriceModel = Depends(get_price_model),
) -> PriceRecommendationResponse:
    return model.predict(request)