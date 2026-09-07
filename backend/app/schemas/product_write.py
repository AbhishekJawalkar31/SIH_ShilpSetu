from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.product import ProductStatus


class ProductCreateRequest(BaseModel):
    """Schema for creating a new product."""

    model_config = ConfigDict(extra="forbid")

    artisan_id: UUID
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    category: str | None = Field(default=None, max_length=120)
    material: str | None = Field(default=None, max_length=120)
    craft_type: str | None = Field(default=None, max_length=120)
    tags: list[str] = Field(default_factory=list, max_length=50)
    attributes: dict[str, Any] = Field(default_factory=dict)
    price: float | None = Field(default=None, ge=0)
    currency: str = Field(default="INR", max_length=10)
    image_url: str | None = Field(default=None, max_length=500)
    status: ProductStatus = "draft"
    available_quantity: int = Field(default=0, ge=0)
    production_capacity: int = Field(default=0, ge=0)
    unit: str = Field(default="piece", min_length=1, max_length=40)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("title must not be blank")
        return v.strip()

    @field_validator("description")
    @classmethod
    def description_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("description must not be blank")
        return v.strip()

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, tags: list[str]) -> list[str]:
        return [tag.strip() for tag in tags if tag.strip()]


class InventoryUpdateRequest(BaseModel):
    """Schema for updating product inventory."""

    model_config = ConfigDict(extra="forbid")

    available_quantity: int = Field(ge=0)
    production_capacity: int = Field(ge=0)
    unit: str = Field(default="piece", min_length=1, max_length=40)

    @field_validator("unit")
    @classmethod
    def unit_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("unit must not be blank")
        return v.strip()
