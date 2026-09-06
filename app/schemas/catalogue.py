from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CatalogueGenerationResponse(BaseModel):
    """Structured catalogue output for POST /api/catalogue/generate."""

    model_config = ConfigDict(extra="forbid")

    title: str
    description: str
    category: str
    material: str
    craft_type: str
    tags: list[str]
    attributes: dict[str, Any]
    recommended_price_min: float = Field(ge=0)
    recommended_price_max: float = Field(ge=0)

    @model_validator(mode="after")
    def validate_price_range(self) -> "CatalogueGenerationResponse":
        if self.recommended_price_min > self.recommended_price_max:
            raise ValueError(
                "recommended_price_min must not exceed recommended_price_max"
            )
        return self
