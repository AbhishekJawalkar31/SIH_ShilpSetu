from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


ProductStatus = Literal["draft", "published", "archived"]
QuoteStatus = Literal["pending", "responded", "accepted", "rejected", "closed"]


class ProductCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    artisan_id: UUID
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    category: str = Field(min_length=1, max_length=120)
    material: str = Field(min_length=1, max_length=120)
    craft_type: str = Field(min_length=1, max_length=120)
    tags: list[str] = Field(default_factory=list, max_length=50)
    attributes: dict[str, Any] = Field(default_factory=dict)
    price: float = Field(ge=0)
    currency: Literal["INR"] = "INR"
    image_url: str | None = None
    status: ProductStatus = "draft"

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, tags: list[str]) -> list[str]:
        return [tag.strip() for tag in tags if tag.strip()]


class ProductResponse(ProductCreateRequest):
    id: UUID
    created_at: datetime
    updated_at: datetime


class ProductListResponse(BaseModel):
    products: list[ProductResponse]
    total: int


class InventoryUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    available_quantity: int = Field(ge=0)
    production_capacity: int = Field(ge=0)
    unit: str = Field(default="piece", min_length=1, max_length=40)


class InventoryResponse(InventoryUpdateRequest):
    product_id: UUID
    updated_at: datetime


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=2000)
    quantity: int | None = Field(default=None, ge=1)
    budget_per_unit: float | None = Field(default=None, ge=0)
    location: str | None = Field(default=None, max_length=200)

    @field_validator("query")
    @classmethod
    def query_must_not_be_blank(cls, query: str) -> str:
        if not query.strip():
            raise ValueError("query must not be blank")
        return query.strip()


class SearchIntent(BaseModel):
    product: str
    quantity: int | None = None
    budget_per_unit: float | None = None
    use_case: str | None = None
    location: str | None = None


class SearchResult(BaseModel):
    product_id: UUID
    artisan_id: UUID
    title: str
    price: float
    available_quantity: int
    production_capacity: int
    match_score: float = Field(ge=0, le=1)


class SearchResponse(BaseModel):
    intent: SearchIntent
    results: list[SearchResult]


class MatchingResponseItem(BaseModel):
    artisan_id: UUID
    business_name: str | None = None
    product_id: UUID
    matched_quantity: int = Field(ge=0)
    match_score: float = Field(ge=0, le=1)


class BulkMatchingResponse(BaseModel):
    required_quantity: int
    matched_quantity: int
    artisans: list[MatchingResponseItem]


class BulkMatchingRequest(SearchRequest):
    quantity: int = Field(ge=1)


class QuoteCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    buyer_id: UUID
    product_id: UUID | None = None
    quantity: int = Field(ge=1)
    budget_per_unit: float | None = Field(default=None, ge=0)
    total_budget: float | None = Field(default=None, ge=0)
    requirement_text: str = Field(min_length=1, max_length=5000)

    @field_validator("requirement_text")
    @classmethod
    def requirement_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("requirement_text must not be blank")
        return value.strip()


class QuoteResponse(QuoteCreateRequest):
    id: UUID
    status: QuoteStatus
    created_at: datetime


class QuoteMatchResponse(BulkMatchingResponse):
    quote_request_id: UUID


class ArtisanProfileResponse(BaseModel):
    id: UUID
    business_name: str | None = None
    craft_type: str | None = None
    description: str | None = None
    location: str | None = None
    city: str | None = None
    state: str | None = None
    country: str = "India"
    languages: list[str] = Field(default_factory=list)
    rating: float = Field(default=0, ge=0, le=5)


class ArtisanProductsResponse(BaseModel):
    artisan_id: UUID
    products: list[ProductResponse]


class EmbeddingResponse(BaseModel):
    product_id: UUID
    embedding_model: str
    dimensions: int
    created_at: datetime


class ProductImageResponse(BaseModel):
    product_id: UUID
    image_url: str


class TranslationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=10000)
    source_language: str = Field(default="auto", min_length=2, max_length=20)
    target_language: str = Field(min_length=2, max_length=20)


class TranslationResponse(BaseModel):
    text: str
    source_language: str
    target_language: str
    provider: str


NotificationChannel = Literal["sms", "whatsapp", "push"]


class NotificationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    channel: NotificationChannel
    recipient: str = Field(min_length=1, max_length=320)
    message: str = Field(min_length=1, max_length=4000)
    data: dict[str, Any] = Field(default_factory=dict)


class NotificationResponse(BaseModel):
    id: UUID
    channel: NotificationChannel
    status: Literal["sent", "queued", "failed"]
    provider: str


class ConversationCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    participant_ids: list[UUID] = Field(min_length=2, max_length=20)
    quote_id: UUID | None = None


class ConversationResponse(BaseModel):
    id: UUID
    participant_ids: list[UUID]
    quote_id: UUID | None = None
    created_at: datetime


class MessageCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sender_id: UUID
    body: str = Field(min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    body: str
    created_at: datetime


class AuthUserResponse(BaseModel):
    id: UUID
    email: str | None = None
    role: Literal["artisan", "buyer", "admin"] | None = None
    artisan_id: UUID | None = None


class PriceObservation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: str = Field(min_length=1, max_length=120)
    material: str = Field(min_length=1, max_length=120)
    craft_type: str = Field(min_length=1, max_length=120)
    price: float = Field(gt=0)
    quantity: int = Field(default=1, ge=1)
    location: str | None = Field(default=None, max_length=200)


class PriceTrainRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observations: list[PriceObservation] = Field(min_length=3, max_length=10000)


class PriceTrainResponse(BaseModel):
    model_version: str
    observations: int
    trained_at: datetime


class PriceRecommendationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: str = Field(min_length=1, max_length=120)
    material: str = Field(min_length=1, max_length=120)
    craft_type: str = Field(min_length=1, max_length=120)
    quantity: int = Field(default=1, ge=1)


class PriceRecommendationResponse(BaseModel):
    recommended_price_min: float
    recommended_price_max: float
    model_version: str