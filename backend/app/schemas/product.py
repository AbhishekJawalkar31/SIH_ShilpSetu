from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


ProductStatus = Literal["draft", "published", "archived"]


class ProductResponse(BaseModel):
    """Product details including inventory availability."""

    model_config = ConfigDict(extra="ignore")

    id: UUID
    artisan_id: UUID
    title: str
    description: str
    category: str | None = None
    material: str | None = None
    craft_type: str | None = None
    tags: list[str] = Field(default_factory=list)
    attributes: dict[str, Any] = Field(default_factory=dict)
    price: float | None = None
    currency: str = "INR"
    image_url: str | None = None
    status: ProductStatus = "draft"
    available_quantity: int = 0
    production_capacity: int = 0
    unit: str = "piece"
    created_at: datetime
    updated_at: datetime


class ProductListResponse(BaseModel):
    """Paginated list of products."""

    model_config = ConfigDict(extra="ignore")

    products: list[ProductResponse]
    total: int
    limit: int
    offset: int
