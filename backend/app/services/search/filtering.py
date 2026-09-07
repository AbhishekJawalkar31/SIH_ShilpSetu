from __future__ import annotations

from typing import Sequence

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.search import SearchIntent
from app.services.search.repository import CandidateProduct


class FilterCriteria(BaseModel):
    """Structured filtering criteria for candidate product evaluation."""

    model_config = ConfigDict(extra="forbid")

    budget_per_unit: float | None = Field(default=None, ge=0)
    requested_quantity: int | None = Field(default=None, gt=0)
    location: str | None = None
    category: str | None = None
    require_full_capacity: bool = True

    @classmethod
    def from_intent(
        cls,
        intent: SearchIntent,
        require_full_capacity: bool = True,
    ) -> FilterCriteria:
        """Construct FilterCriteria directly from an extracted SearchIntent."""
        return cls(
            budget_per_unit=intent.budget_per_unit,
            requested_quantity=intent.quantity,
            location=intent.location,
            category=None,
            require_full_capacity=require_full_capacity,
        )


class CandidateFilterService:
    """Evaluates and filters candidate products against structured business constraints."""

    def is_candidate_eligible(
        self,
        candidate: CandidateProduct,
        criteria: FilterCriteria,
    ) -> bool:
        """Evaluate whether a single candidate product satisfies all filter criteria."""
        # 1. Published Status Invariant
        if candidate.status.strip().lower() != "published":
            return False

        # 2. Budget Constraint: price <= budget_per_unit
        if criteria.budget_per_unit is not None:
            if candidate.price is None:
                return False
            if candidate.price > criteria.budget_per_unit:
                return False

        # 3. Capacity Constraint: available_quantity + production_capacity >= requested_quantity
        if criteria.requested_quantity is not None:
            total_capacity = (candidate.available_quantity or 0) + (
                candidate.production_capacity or 0
            )
            if criteria.require_full_capacity:
                if total_capacity < criteria.requested_quantity:
                    return False
            else:
                if total_capacity <= 0:
                    return False

        # 4. Location Compatibility Constraint
        if criteria.location is not None and criteria.location.strip():
            target_loc = criteria.location.strip().lower()
            artisan_fields = [
                candidate.artisan_city,
                candidate.artisan_state,
                candidate.artisan_country,
                candidate.artisan_location,
            ]
            matched = False
            for field in artisan_fields:
                if field and field.strip():
                    normalized_field = field.strip().lower()
                    if target_loc in normalized_field or normalized_field in target_loc:
                        matched = True
                        break
            if not matched:
                return False

        # 5. Category Compatibility Constraint
        if criteria.category is not None and criteria.category.strip():
            target_cat = criteria.category.strip().lower()
            if not candidate.category or not candidate.category.strip():
                return False
            candidate_cat = candidate.category.strip().lower()
            if target_cat not in candidate_cat and candidate_cat not in target_cat:
                return False

        return True

    def filter_candidates(
        self,
        candidates: Sequence[CandidateProduct],
        criteria: FilterCriteria,
    ) -> list[CandidateProduct]:
        """Filter a list of retrieved candidates, preserving order of eligible items."""
        return [
            candidate
            for candidate in candidates
            if self.is_candidate_eligible(candidate, criteria)
        ]
