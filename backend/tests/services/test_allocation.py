from __future__ import annotations

"""
Unit tests for Step 8 — Multi-Artisan Bulk Allocation.

Requirements covered:
1. One artisan completely satisfies the order.
2. Multiple artisans together satisfy the order.
3. Partial allocation from the final artisan.
4. Insufficient total capacity.
5. Empty candidates.
6. Zero/invalid requested quantity.
7. Allocation never exceeds individual capacity.
8. Higher-ranked artisans are allocated first.
9. Deterministic/reproducible allocation.
10. Primary example: 100 units → 40 + 35 + 25.
"""

from uuid import UUID, uuid4

import pytest

from app.services.search.allocation import (
    AllocationResult,
    ArtisanAllocationItem,
    MultiArtisanAllocationService,
)
from app.services.search.ranking import RankedCandidate
from app.services.search.repository import CandidateProduct


def make_ranked_candidate(
    *,
    product_id: UUID | None = None,
    artisan_id: UUID | None = None,
    title: str = "Artisan Product",
    available_quantity: int = 0,
    production_capacity: int = 0,
    match_score: float = 0.85,
    price: float = 500.0,
) -> RankedCandidate:
    candidate = CandidateProduct(
        product_id=product_id or uuid4(),
        artisan_id=artisan_id or uuid4(),
        title=title,
        description="Test description",
        category="Crafts",
        material="Natural",
        craft_type="Handmade",
        price=price,
        currency="INR",
        image_url=None,
        available_quantity=available_quantity,
        production_capacity=production_capacity,
        unit="piece",
        status="published",
        artisan_business_name=f"Artisan of {title}",
        artisan_city="Jaipur",
        artisan_state="Rajasthan",
        artisan_country="India",
        artisan_location=None,
        artisan_rating=4.5,
        distance=0.15,
    )
    return RankedCandidate(
        candidate=candidate,
        match_score=match_score,
        semantic_score=0.85,
        price_score=0.80,
        capacity_score=0.90,
        rating_score=0.90,
    )


# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------

# 1. One artisan completely satisfies the order
def test_one_artisan_completely_satisfies_order() -> None:
    svc = MultiArtisanAllocationService()
    cand = make_ranked_candidate(
        available_quantity=50,
        production_capacity=60,  # total 110
        match_score=0.9,
    )

    res = svc.allocate([cand], required_quantity=100)

    assert res.is_fully_allocated is True
    assert res.requested_quantity == 100
    assert res.allocated_quantity == 100
    assert res.shortfall == 0
    assert len(res.allocations) == 1
    assert res.allocations[0].allocated_quantity == 100
    assert res.allocations[0].total_capacity == 110


# 2. Multiple artisans together satisfy the order
def test_multiple_artisans_together_satisfy_order() -> None:
    svc = MultiArtisanAllocationService()
    c1 = make_ranked_candidate(title="Artisan 1", available_quantity=30, production_capacity=20, match_score=0.9)  # cap 50
    c2 = make_ranked_candidate(title="Artisan 2", available_quantity=25, production_capacity=25, match_score=0.8)  # cap 50

    res = svc.allocate([c1, c2], required_quantity=100)

    assert res.is_fully_allocated is True
    assert res.allocated_quantity == 100
    assert res.shortfall == 0
    assert len(res.allocations) == 2
    assert res.allocations[0].allocated_quantity == 50
    assert res.allocations[1].allocated_quantity == 50


# 3. Partial allocation from the final artisan
def test_partial_allocation_from_final_artisan() -> None:
    svc = MultiArtisanAllocationService()
    c1 = make_ranked_candidate(title="Artisan 1", available_quantity=40, match_score=0.95)  # cap 40
    c2 = make_ranked_candidate(title="Artisan 2", available_quantity=100, match_score=0.85)  # cap 100

    # Required 70 -> c1 gives 40, c2 gives 30 (out of 100)
    res = svc.allocate([c1, c2], required_quantity=70)

    assert res.is_fully_allocated is True
    assert res.allocated_quantity == 70
    assert res.shortfall == 0
    assert len(res.allocations) == 2
    assert res.allocations[0].allocated_quantity == 40
    assert res.allocations[1].allocated_quantity == 30
    assert res.allocations[1].total_capacity == 100


# 4. Insufficient total capacity
def test_insufficient_total_capacity() -> None:
    svc = MultiArtisanAllocationService()
    c1 = make_ranked_candidate(title="Artisan 1", available_quantity=20, match_score=0.9)
    c2 = make_ranked_candidate(title="Artisan 2", production_capacity=30, match_score=0.8)
    # Total available: 50, Required: 120

    res = svc.allocate([c1, c2], required_quantity=120)

    assert res.is_fully_allocated is False
    assert res.requested_quantity == 120
    assert res.allocated_quantity == 50
    assert res.shortfall == 70
    assert len(res.allocations) == 2
    assert res.allocations[0].allocated_quantity == 20
    assert res.allocations[1].allocated_quantity == 30


# 5. Empty candidates
def test_empty_candidates_returns_zero_allocated() -> None:
    svc = MultiArtisanAllocationService()
    res = svc.allocate([], required_quantity=50)

    assert res.is_fully_allocated is False
    assert res.requested_quantity == 50
    assert res.allocated_quantity == 0
    assert res.shortfall == 50
    assert res.allocations == []


# 6. Zero/invalid requested quantity
@pytest.mark.parametrize("invalid_qty", [0, -1, -50])
def test_zero_or_negative_requested_quantity(invalid_qty: int) -> None:
    svc = MultiArtisanAllocationService()
    cand = make_ranked_candidate(available_quantity=50)

    res = svc.allocate([cand], required_quantity=invalid_qty)

    assert res.is_fully_allocated is False
    assert res.allocated_quantity == 0
    assert res.allocations == []


# 7. Allocation never exceeds individual capacity
def test_allocation_never_exceeds_individual_capacity() -> None:
    svc = MultiArtisanAllocationService()
    c1 = make_ranked_candidate(available_quantity=15, production_capacity=10, match_score=0.9)  # 25 total
    c2 = make_ranked_candidate(available_quantity=5, production_capacity=15, match_score=0.8)   # 20 total

    res = svc.allocate([c1, c2], required_quantity=100)

    for item in res.allocations:
        assert item.allocated_quantity <= item.total_capacity
        assert item.allocated_quantity <= (item.available_quantity + item.production_capacity)


# 8. Higher-ranked artisans are allocated first
def test_higher_ranked_artisans_are_allocated_first() -> None:
    svc = MultiArtisanAllocationService()
    # Rank 1: score 0.95, cap 30
    c1 = make_ranked_candidate(title="Best Match", available_quantity=30, match_score=0.95)
    # Rank 2: score 0.85, cap 30
    c2 = make_ranked_candidate(title="Second Match", available_quantity=30, match_score=0.85)
    # Rank 3: score 0.70, cap 30
    c3 = make_ranked_candidate(title="Third Match", available_quantity=30, match_score=0.70)

    # Required 50 -> c1 gives 30, c2 gives 20, c3 untouched
    res = svc.allocate([c1, c2, c3], required_quantity=50)

    assert res.is_fully_allocated is True
    assert len(res.allocations) == 2
    assert res.allocations[0].candidate.title == "Best Match"
    assert res.allocations[0].allocated_quantity == 30
    assert res.allocations[1].candidate.title == "Second Match"
    assert res.allocations[1].allocated_quantity == 20


# 9. Deterministic / reproducible allocation
def test_deterministic_and_reproducible_allocation() -> None:
    svc = MultiArtisanAllocationService()
    c1 = make_ranked_candidate(title="C1", available_quantity=20, production_capacity=15, match_score=0.92)
    c2 = make_ranked_candidate(title="C2", available_quantity=40, production_capacity=10, match_score=0.84)
    c3 = make_ranked_candidate(title="C3", available_quantity=10, production_capacity=5, match_score=0.75)

    candidates = [c1, c2, c3]
    res1 = svc.allocate(candidates, required_quantity=60)
    res2 = svc.allocate(candidates, required_quantity=60)

    assert res1.allocated_quantity == res2.allocated_quantity
    assert res1.shortfall == res2.shortfall
    assert res1.is_fully_allocated == res2.is_fully_allocated
    assert len(res1.allocations) == len(res2.allocations)
    for a1, a2 in zip(res1.allocations, res2.allocations):
        assert a1.product_id == a2.product_id
        assert a1.allocated_quantity == a2.allocated_quantity
        assert a1.match_score == a2.match_score


# 10. Primary example: 100 units -> 40 + 35 + 25
def test_primary_example_100_units_allocated_40_35_25() -> None:
    """
    Example from assignment:
    Required = 100
    Artisan A = 40
    Artisan B = 35
    Artisan C = 25

    Result:
    A -> 40
    B -> 35
    C -> 25
    Total = 100
    """
    svc = MultiArtisanAllocationService()
    # A: cap 40 (20 avail + 20 prod)
    artisan_a = make_ranked_candidate(title="Artisan A", available_quantity=20, production_capacity=20, match_score=0.95)
    # B: cap 35 (15 avail + 20 prod)
    artisan_b = make_ranked_candidate(title="Artisan B", available_quantity=15, production_capacity=20, match_score=0.85)
    # C: cap 50 (25 avail + 25 prod)
    artisan_c = make_ranked_candidate(title="Artisan C", available_quantity=25, production_capacity=25, match_score=0.75)

    res = svc.allocate([artisan_a, artisan_b, artisan_c], required_quantity=100)

    assert res.is_fully_allocated is True
    assert res.requested_quantity == 100
    assert res.allocated_quantity == 100
    assert res.shortfall == 0
    assert len(res.allocations) == 3

    assert res.allocations[0].candidate.title == "Artisan A"
    assert res.allocations[0].allocated_quantity == 40

    assert res.allocations[1].candidate.title == "Artisan B"
    assert res.allocations[1].allocated_quantity == 35

    assert res.allocations[2].candidate.title == "Artisan C"
    assert res.allocations[2].allocated_quantity == 25  # Only 25 needed out of 50


# 11. Candidates with zero capacity are skipped
def test_candidates_with_zero_capacity_are_skipped() -> None:
    svc = MultiArtisanAllocationService()
    c_zero = make_ranked_candidate(title="Zero Stock", available_quantity=0, production_capacity=0, match_score=0.99)
    c_valid = make_ranked_candidate(title="Valid Stock", available_quantity=50, match_score=0.80)

    res = svc.allocate([c_zero, c_valid], required_quantity=30)

    assert res.is_fully_allocated is True
    assert len(res.allocations) == 1
    assert res.allocations[0].candidate.title == "Valid Stock"
    assert res.allocations[0].allocated_quantity == 30
