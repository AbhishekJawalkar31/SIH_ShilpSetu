from __future__ import annotations

"""
Step 8 — Multi-Artisan Bulk Allocation
=======================================

Deterministic capacity allocation across ranked artisan candidates for bulk orders.

Separation of concerns
----------------------
  Retrieval   → repository.py           (pgvector cosine similarity)
  Filtering   → filtering.py            (hard constraints: budget, capacity, location)
  Ranking     → ranking.py              (deterministic match_score)
  Allocation  → THIS FILE               (multi-artisan greedy capacity allocation)
  API/Quote   → Step 9 (not here)

Goal
----
Given a required quantity, select multiple ranked artisans whose combined
capacity can satisfy the requirement.

Algorithm & Rules
-----------------
1. Input:
   - `ranked_candidates`: list[RankedCandidate] from Step 7 (ordered highest match_score first)
   - `required_quantity`: int > 0
2. Candidate capacity:
   - `candidate_capacity = (available_quantity or 0) + (production_capacity or 0)`
   - Never allocate from candidates with capacity <= 0.
3. Allocation strategy:
   - Greedy allocation by ranking order: highest-ranked artisans are allocated first.
   - For candidate `i`:
       `allocatable = min(remaining_needed, candidate_capacity)`
       `allocated_quantity += allocatable`
       `remaining_needed -= allocatable`
   - Partial allocation from the final artisan is performed if their capacity exceeds
     the remaining balance needed.
   - Never allocate more than an individual candidate's available capacity.
   - Stop as soon as `remaining_needed == 0`.
4. Shortfall / Insufficient capacity handling:
   - If total capacity across all available candidates is less than `required_quantity`,
     allocate all available capacity from each candidate in rank order.
   - Return `is_fully_allocated = False`, with `shortfall = required_quantity - allocated_quantity`.
5. Edge cases:
   - If `required_quantity <= 0`, return empty allocation with `is_fully_allocated = False`.
   - If `ranked_candidates` is empty, return 0 allocated, `is_fully_allocated = False`,
     `shortfall = required_quantity`.
"""

from dataclasses import dataclass, field
from uuid import UUID

from app.services.search.ranking import RankedCandidate
from app.services.search.repository import CandidateProduct


@dataclass(frozen=True)
class ArtisanAllocationItem:
    """Allocation detail for a single artisan candidate."""

    candidate: CandidateProduct
    allocated_quantity: int
    available_quantity: int
    production_capacity: int
    total_capacity: int
    match_score: float

    @property
    def product_id(self) -> UUID:
        return self.candidate.product_id

    @property
    def artisan_id(self) -> UUID:
        return self.candidate.artisan_id


@dataclass(frozen=True)
class AllocationResult:
    """Result of a multi-artisan bulk capacity allocation."""

    requested_quantity: int
    allocated_quantity: int
    shortfall: int
    is_fully_allocated: bool
    allocations: list[ArtisanAllocationItem] = field(default_factory=list)


class MultiArtisanAllocationService:
    """
    Allocates requested order quantities across multiple ranked artisan candidates.

    Consumes ranked candidates in descending order of match_score and allocates
    feasible units from available_quantity and production_capacity until the order
    is fulfilled or all available capacity is exhausted.
    """

    def allocate(
        self,
        ranked_candidates: list[RankedCandidate],
        required_quantity: int,
    ) -> AllocationResult:
        """
        Perform greedy capacity allocation on ranked candidates.

        Args:
            ranked_candidates: Ordered list of RankedCandidate instances (best first).
            required_quantity: Total units requested by the buyer.

        Returns:
            AllocationResult summarizing total allocated units, fulfillment status,
            and individual artisan allocations.
        """
        if required_quantity <= 0:
            return AllocationResult(
                requested_quantity=required_quantity,
                allocated_quantity=0,
                shortfall=0 if required_quantity == 0 else -required_quantity,
                is_fully_allocated=False,
                allocations=[],
            )

        allocations: list[ArtisanAllocationItem] = []
        remaining_needed = required_quantity

        for ranked in ranked_candidates:
            if remaining_needed <= 0:
                break

            cand = ranked.candidate
            avail = max(0, cand.available_quantity or 0)
            prod = max(0, cand.production_capacity or 0)
            candidate_cap = avail + prod

            if candidate_cap <= 0:
                continue

            alloc_qty = min(remaining_needed, candidate_cap)

            allocations.append(
                ArtisanAllocationItem(
                    candidate=cand,
                    allocated_quantity=alloc_qty,
                    available_quantity=avail,
                    production_capacity=prod,
                    total_capacity=candidate_cap,
                    match_score=ranked.match_score,
                )
            )

            remaining_needed -= alloc_qty

        total_allocated = required_quantity - remaining_needed
        shortfall = max(0, remaining_needed)
        is_fully_allocated = (shortfall == 0)

        return AllocationResult(
            requested_quantity=required_quantity,
            allocated_quantity=total_allocated,
            shortfall=shortfall,
            is_fully_allocated=is_fully_allocated,
            allocations=allocations,
        )
