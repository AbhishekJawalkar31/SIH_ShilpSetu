from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.search import SearchIntent
from app.services.search.repository import CandidateProduct


class BulkMatchRequest(BaseModel):
    """
    Request payload for bulk B2B matching (API_CONTRACT.md §13).
    
    Example:
    {
      "query": "100 handmade jute bags for a hotel",
      "quantity": 100,
      "budget_per_unit": 700,
      "location": null
    }
    """

    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1)
    quantity: int = Field(gt=0)
    budget_per_unit: float | None = Field(default=None, ge=0)
    location: str | None = None


class ArtisanPoolItem(BaseModel):
    """
    Allocated artisan item in the pool (API_CONTRACT.md §13).
    
    Example:
    {
      "artisan_id": "uuid",
      "business_name": "Artisan A",
      "product_id": "uuid",
      "matched_quantity": 40,
      "match_score": 0.93
    }
    """

    model_config = ConfigDict(extra="forbid")

    artisan_id: UUID
    business_name: str | None
    product_id: UUID
    matched_quantity: int
    match_score: float


class BulkMatchResponse(BaseModel):
    """
    Response payload for bulk B2B matching (API_CONTRACT.md §13).
    
    Example:
    {
      "required_quantity": 100,
      "matched_quantity": 100,
      "artisans": [...]
    }
    """

    model_config = ConfigDict(extra="forbid")

    required_quantity: int
    matched_quantity: int
    artisans: list[ArtisanPoolItem]


# Retain legacy/batch candidate models for backward compatibility if needed
class MatchedCandidate(BaseModel):
    """A candidate product surfaced for matching."""

    model_config = ConfigDict(extra="ignore")

    product_id: UUID
    artisan_id: UUID
    title: str
    description: str
    category: str | None = None
    material: str | None = None
    craft_type: str | None = None
    price: float | None = None
    currency: str = "INR"
    image_url: str | None = None
    available_quantity: int = 0
    production_capacity: int = 0
    unit: str = "piece"
    artisan_business_name: str | None = None
    artisan_city: str | None = None
    artisan_state: str | None = None
    artisan_country: str = "India"
    artisan_rating: float = 0.0
    distance: float

    @classmethod
    def from_candidate(cls, candidate: CandidateProduct) -> MatchedCandidate:
        return cls.model_validate(candidate.model_dump())
