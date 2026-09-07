from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


QuoteStatus = Literal["pending", "responded", "accepted", "rejected", "closed"]
AllocationStatus = Literal["matched", "contacted", "quoted", "accepted", "rejected"]


class QuoteCreateRequest(BaseModel):
    """Request payload for creating a buyer quote request."""

    model_config = ConfigDict(extra="forbid")

    buyer_id: UUID
    requirement_text: str = Field(min_length=1, max_length=5000)
    quantity: int = Field(gt=0)
    product_id: UUID | None = None
    budget_per_unit: float | None = Field(default=None, ge=0)
    total_budget: float | None = Field(default=None, ge=0)

    @field_validator("requirement_text")
    @classmethod
    def requirement_text_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("requirement_text must not be empty or whitespace only")
        return v.strip()


class QuoteArtisanAllocation(BaseModel):
    """Matched artisan candidate allocation record for a quote request."""

    model_config = ConfigDict(extra="ignore")

    id: UUID
    quote_request_id: UUID
    artisan_id: UUID
    matched_quantity: int = Field(ge=0)
    match_score: float = Field(ge=0, le=1)
    status: AllocationStatus = "matched"
    created_at: datetime
    # Joined artisan information for frontend display
    business_name: str | None = None
    artisan_name: str | None = None
    city: str | None = None
    state: str | None = None
    product_id: UUID | None = None


class QuoteResponse(BaseModel):
    """Full representation of a quote request with matched allocations."""

    model_config = ConfigDict(extra="ignore")

    id: UUID
    buyer_id: UUID
    product_id: UUID | None = None
    quantity: int
    budget_per_unit: float | None = None
    total_budget: float | None = None
    requirement_text: str
    status: QuoteStatus = "pending"
    created_at: datetime
    updated_at: datetime
    allocations: list[QuoteArtisanAllocation] = Field(default_factory=list)


class QuoteListResponse(BaseModel):
    """Paginated list of quote requests."""

    model_config = ConfigDict(extra="ignore")

    quotes: list[QuoteResponse]
    total: int
    limit: int
    offset: int
