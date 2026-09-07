from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

OrderStatus = Literal["pending", "confirmed", "processing", "completed", "cancelled"]


class OrderItemResponse(BaseModel):
    """Line item within an order, representing fulfilled artisan allocation."""

    model_config = ConfigDict(extra="ignore")

    id: UUID
    order_id: UUID
    artisan_id: UUID
    product_id: UUID | None = None
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)
    total_price: float = Field(ge=0)
    created_at: datetime
    # Metadata for frontend display
    artisan_business_name: str | None = None
    product_title: str | None = None


class OrderResponse(BaseModel):
    """Full order representation."""

    model_config = ConfigDict(extra="ignore")

    id: UUID
    buyer_id: UUID
    artisan_id: UUID | None = None
    product_id: UUID | None = None
    quote_request_id: UUID | None = None
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)
    total_price: float = Field(ge=0)
    status: OrderStatus = "pending"
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse] = Field(default_factory=list)


class OrderListResponse(BaseModel):
    """Paginated list of orders."""

    model_config = ConfigDict(extra="ignore")

    items: list[OrderResponse]
    total: int
    limit: int
    offset: int


class QuoteAcceptResponse(BaseModel):
    """Response returned when a quote is successfully accepted and converted to an order."""

    model_config = ConfigDict(extra="ignore")

    order: OrderResponse
    quote_id: UUID
    message: str = "Quote successfully accepted and converted to order."
