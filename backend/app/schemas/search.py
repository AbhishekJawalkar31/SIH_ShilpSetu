from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator


class SearchIntent(BaseModel):
    """Structured search intent extracted from natural-language buyer queries."""

    model_config = ConfigDict(extra="forbid")

    product: str
    quantity: int | None = None
    budget_per_unit: float | None = None
    use_case: str | None = None
    location: str | None = None

    @field_validator("product", mode="before")
    @classmethod
    def validate_product(cls, value: Any) -> str:
        if not isinstance(value, str):
            raise ValueError("product must be a string")
        stripped = value.strip()
        if not stripped:
            raise ValueError("product must not be empty after normalization")
        return stripped

    @field_validator("quantity", mode="before")
    @classmethod
    def validate_quantity(cls, value: Any) -> int | None:
        if value is None or value == "":
            return None
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise ValueError("quantity must be an integer")
        int_value = int(value)
        if int_value <= 0:
            raise ValueError("quantity must be greater than zero")
        return int_value

    @field_validator("budget_per_unit", mode="before")
    @classmethod
    def validate_budget_per_unit(cls, value: Any) -> float | None:
        if value is None or value == "":
            return None
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise ValueError("budget_per_unit must be a number")
        float_value = float(value)
        if float_value < 0:
            raise ValueError("budget_per_unit must be non-negative")
        return float_value

    @field_validator("use_case", "location", mode="before")
    @classmethod
    def normalize_optional_string(cls, value: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped if stripped else None
        stripped_str = str(value).strip()
        return stripped_str if stripped_str else None
