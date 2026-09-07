from __future__ import annotations

"""
Tests for Step 7 — Deterministic Candidate Ranking.

All tests are unit tests:
  - No live Gemini calls
  - No live Supabase/pgvector calls
  - All CandidateProduct instances are constructed from known test data
  - All SearchIntent instances are constructed directly

Scoring formula recap (from ranking.py):
  match_score = 0.50 * semantic_score
              + 0.20 * price_score
              + 0.20 * capacity_score
              + 0.10 * rating_score

  semantic_score  = 1.0 - distance            (clamped [0,1])
  price_score     = price / budget            (clamped [0,1]; 0.5 if no budget)
  capacity_score  = total_cap / quantity      (clamped [0,1]; 0.5 if no qty)
  rating_score    = artisan_rating / 5.0
"""

from uuid import UUID, uuid4

import pytest

from app.schemas.search import SearchIntent
from app.services.search.ranking import (
    CandidateRankingService,
    RankedCandidate,
    W_CAP,
    W_PRICE,
    W_RATE,
    W_SEM,
    _NEUTRAL,
    _capacity_score,
    _price_score,
    _rating_score,
    _semantic_score,
    score_candidate,
)
from app.services.search.repository import CandidateProduct


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_FIXED_UUID_A = UUID("00000000-0000-0000-0000-000000000001")
_FIXED_UUID_B = UUID("00000000-0000-0000-0000-000000000002")
_FIXED_UUID_C = UUID("00000000-0000-0000-0000-000000000003")


def make_candidate(
    *,
    product_id: UUID | None = None,
    title: str = "Handwoven Jute Bag",
    price: float | None = 620.0,
    distance: float = 0.15,
    available_quantity: int = 60,
    production_capacity: int = 50,
    artisan_rating: float = 4.0,
    status: str = "published",
    category: str = "Bags",
    artisan_city: str = "Jaipur",
    artisan_state: str = "Rajasthan",
) -> CandidateProduct:
    return CandidateProduct(
        product_id=product_id or uuid4(),
        artisan_id=uuid4(),
        title=title,
        description="Eco-friendly handwoven jute bag.",
        category=category,
        material="Jute",
        craft_type="Handwoven",
        tags=["handmade", "jute"],
        attributes={"color": "brown"},
        price=price,
        currency="INR",
        image_url="https://example.com/bag.jpg",
        status=status,
        distance=distance,
        available_quantity=available_quantity,
        production_capacity=production_capacity,
        unit="piece",
        artisan_business_name="Craft Co",
        artisan_location="Jaipur, Rajasthan",
        artisan_city=artisan_city,
        artisan_state=artisan_state,
        artisan_country="India",
        artisan_rating=artisan_rating,
    )


def make_intent(
    product: str = "handmade jute bags",
    quantity: int | None = 100,
    budget_per_unit: float | None = 700.0,
    use_case: str | None = "hotel",
    location: str | None = None,
) -> SearchIntent:
    return SearchIntent(
        product=product,
        quantity=quantity,
        budget_per_unit=budget_per_unit,
        use_case=use_case,
        location=location,
    )


service = CandidateRankingService()


# ---------------------------------------------------------------------------
# Component score unit tests
# ---------------------------------------------------------------------------

class TestSemanticScore:
    def test_zero_distance_gives_full_score(self) -> None:
        c = make_candidate(distance=0.0)
        assert _semantic_score(c) == 1.0

    def test_typical_distance_converts_correctly(self) -> None:
        c = make_candidate(distance=0.20)
        assert abs(_semantic_score(c) - 0.80) < 1e-9

    def test_distance_of_one_gives_zero_score(self) -> None:
        c = make_candidate(distance=1.0)
        assert _semantic_score(c) == 0.0

    def test_clamped_below_zero(self) -> None:
        # Numerical noise: distance slightly > 1.0
        c = make_candidate(distance=1.05)
        assert _semantic_score(c) == 0.0

    def test_clamped_above_one(self) -> None:
        # Defensive: distance slightly < 0.0
        c = make_candidate(distance=-0.01)
        assert _semantic_score(c) == 1.0


class TestPriceScore:
    """
    Tests for _price_score().

    Source-document status:
        ARCHITECTURE.md §6 lists "price suitability" as a ranking signal.
        No formula, direction, or scoring method is specified in any
        source-of-truth document (ARCHITECTURE.md, API_CONTRACT.md,
        DATABASE_SCHEMA.md).

    MVP implementation decision:
        price_score = price / budget_per_unit  (clamped [0, 1])
        Assumption: product priced closer to the buyer's stated maximum
        is treated as more price-suitable (quality-tier utilisation).
    """

    def test_price_exactly_at_budget_gives_full_score(self) -> None:
        """Price == budget → score 1.0 (maximum price utilisation)."""
        c = make_candidate(price=700.0)
        assert abs(_price_score(c, 700.0) - 1.0) < 1e-9

    def test_price_below_budget_gives_proportional_score(self) -> None:
        """
        MVP ASSUMPTION: price 350 with budget 700 → score 0.5.
        Lower-priced products score lower because they utilise less of the
        buyer's quality-level budget.
        (Not a documented requirement; an explicit implementation decision.)
        """
        c = make_candidate(price=350.0)
        assert abs(_price_score(c, 700.0) - 0.5) < 1e-9

    def test_formula_direction_higher_price_higher_score(self) -> None:
        """
        Confirms the formula direction: among within-budget products,
        a MORE expensive product scores HIGHER than a cheaper one.
        This is an explicit MVP assumption, not a documented requirement.
        """
        c_expensive = make_candidate(price=650.0)
        c_cheap     = make_candidate(price=300.0)
        budget = 700.0
        assert _price_score(c_expensive, budget) > _price_score(c_cheap, budget)

    def test_price_above_budget_clamped_to_one(self) -> None:
        """
        Should not happen after Step 6 hard-filtering, but the function
        must not crash or return > 1.0 with a price above budget.
        """
        c = make_candidate(price=900.0)
        assert _price_score(c, 700.0) == 1.0

    def test_no_budget_gives_neutral(self) -> None:
        """
        DOCUMENTED REQUIREMENT: price suitability should not penalise
        candidates when no budget constraint was provided by the buyer.
        Neutral score 0.5 is assigned — no artificial ranking impact.
        """
        c = make_candidate(price=620.0)
        assert _price_score(c, None) == _NEUTRAL

    def test_no_price_gives_neutral(self) -> None:
        """
        A product without a listed price receives neutral score.
        It is not excluded (that is Step 6's role for over-budget products)
        but cannot be meaningfully compared by price.
        """
        c = make_candidate(price=None)
        assert _price_score(c, 700.0) == _NEUTRAL

    def test_zero_budget_gives_neutral(self) -> None:
        """Guard against bad data — zero budget must not cause division by zero."""
        c = make_candidate(price=620.0)
        assert _price_score(c, 0.0) == _NEUTRAL

    def test_neutral_price_does_not_penalise_relative_to_each_other(self) -> None:
        """
        When no budget is provided, ALL candidates receive the same neutral
        price_score (0.5). No candidate is penalised relative to another
        solely because of its price.
        """
        c1 = make_candidate(price=100.0)
        c2 = make_candidate(price=9999.0)
        assert _price_score(c1, None) == _price_score(c2, None) == _NEUTRAL

    def test_score_stays_in_valid_range(self) -> None:
        """match_score components must always be in [0.0, 1.0]."""
        for price in [0.01, 100.0, 350.0, 699.99, 700.0, 701.0, 9999.0]:
            c = make_candidate(price=price)
            score = _price_score(c, 700.0)
            assert 0.0 <= score <= 1.0, f"Out of range for price={price}: {score}"


class TestCapacityScore:
    def test_exact_capacity_gives_full_score(self) -> None:
        c = make_candidate(available_quantity=60, production_capacity=40)
        assert abs(_capacity_score(c, 100) - 1.0) < 1e-9

    def test_surplus_capacity_clamped_to_one(self) -> None:
        c = make_candidate(available_quantity=80, production_capacity=60)
        assert _capacity_score(c, 100) == 1.0

    def test_partial_capacity_gives_proportional_score(self) -> None:
        c = make_candidate(available_quantity=25, production_capacity=25)
        # total = 50, requested = 100 → 0.5
        assert abs(_capacity_score(c, 100) - 0.5) < 1e-9

    def test_no_quantity_gives_neutral(self) -> None:
        c = make_candidate(available_quantity=0, production_capacity=0)
        assert _capacity_score(c, None) == _NEUTRAL

    def test_zero_capacity_with_quantity_gives_zero(self) -> None:
        c = make_candidate(available_quantity=0, production_capacity=0)
        assert _capacity_score(c, 100) == 0.0

    def test_zero_requested_quantity_gives_neutral(self) -> None:
        c = make_candidate(available_quantity=50, production_capacity=50)
        assert _capacity_score(c, 0) == _NEUTRAL


class TestRatingScore:
    def test_max_rating_gives_full_score(self) -> None:
        c = make_candidate(artisan_rating=5.0)
        assert abs(_rating_score(c) - 1.0) < 1e-9

    def test_zero_rating_gives_zero_score(self) -> None:
        c = make_candidate(artisan_rating=0.0)
        assert _rating_score(c) == 0.0

    def test_midpoint_rating_gives_half_score(self) -> None:
        c = make_candidate(artisan_rating=2.5)
        assert abs(_rating_score(c) - 0.5) < 1e-9

    def test_typical_rating_normalised(self) -> None:
        c = make_candidate(artisan_rating=4.0)
        assert abs(_rating_score(c) - 0.8) < 1e-9


# ---------------------------------------------------------------------------
# Combined score_candidate tests
# ---------------------------------------------------------------------------

class TestScoreCandidate:
    def test_score_is_between_zero_and_one(self) -> None:
        c = make_candidate()
        intent = make_intent()
        rc = score_candidate(c, intent)
        assert 0.0 <= rc.match_score <= 1.0

    def test_component_scores_stored_separately(self) -> None:
        c = make_candidate(distance=0.10, price=700.0, artisan_rating=5.0,
                           available_quantity=60, production_capacity=40)
        intent = make_intent(budget_per_unit=700.0, quantity=100)
        rc = score_candidate(c, intent)
        assert rc.semantic_score == 0.9
        assert rc.price_score == 1.0
        assert rc.capacity_score == 1.0
        assert rc.rating_score == 1.0

    def test_match_score_formula(self) -> None:
        c = make_candidate(distance=0.10, price=700.0, artisan_rating=5.0,
                           available_quantity=60, production_capacity=40)
        intent = make_intent(budget_per_unit=700.0, quantity=100)
        rc = score_candidate(c, intent)
        expected = round(
            W_SEM * 0.9 + W_PRICE * 1.0 + W_CAP * 1.0 + W_RATE * 1.0, 6
        )
        assert rc.match_score == expected

    def test_score_is_deterministic(self) -> None:
        c = make_candidate()
        intent = make_intent()
        scores = {score_candidate(c, intent).match_score for _ in range(5)}
        assert len(scores) == 1  # Same score every time


# ---------------------------------------------------------------------------
# Test 1 — Higher semantic relevance ranks higher (all else equal)
# ---------------------------------------------------------------------------

def test_higher_semantic_relevance_ranks_higher() -> None:
    """
    When semantic relevance differs and all other factors are equal,
    the candidate with smaller distance (higher similarity) must rank first.
    """
    high_sem = make_candidate(product_id=_FIXED_UUID_A, distance=0.05)
    low_sem  = make_candidate(product_id=_FIXED_UUID_B, distance=0.40)
    intent = make_intent(budget_per_unit=None, quantity=None)

    ranked = service.rank([low_sem, high_sem], intent)

    assert ranked[0].candidate is high_sem
    assert ranked[1].candidate is low_sem
    assert ranked[0].match_score > ranked[1].match_score


# ---------------------------------------------------------------------------
# Test 2 — Better price suitability ranks higher (semantic equal)
# ---------------------------------------------------------------------------

def test_better_price_suitability_ranks_higher() -> None:
    """
    MVP ASSUMPTION (not a documented requirement):
        When semantic distance is identical and capacity/rating are equal,
        the candidate priced CLOSER TO THE BUDGET ranks higher.

    Source document says: "price suitability" is a ranking signal.
    Source document does NOT specify that higher price = higher suitability.

    This test verifies the chosen implementation decision:
        price_score = price / budget  (quality-tier utilisation)
        → product at budget (700) scores higher than product at half budget (350).
    """
    at_budget = make_candidate(
        product_id=_FIXED_UUID_A, distance=0.20, price=700.0,
        available_quantity=60, production_capacity=40, artisan_rating=4.0,
    )
    half_budget = make_candidate(
        product_id=_FIXED_UUID_B, distance=0.20, price=350.0,
        available_quantity=60, production_capacity=40, artisan_rating=4.0,
    )
    intent = make_intent(budget_per_unit=700.0, quantity=None)

    ranked = service.rank([half_budget, at_budget], intent)

    # Implementation decision: at-budget product ranks first
    assert ranked[0].candidate is at_budget
    assert ranked[1].candidate is half_budget
    assert ranked[0].price_score > ranked[1].price_score
    # Exact scores per formula:
    assert abs(ranked[0].price_score - 1.0) < 1e-9    # 700/700
    assert abs(ranked[1].price_score - 0.5) < 1e-9    # 350/700


def test_price_suitability_assumption_is_explicit_not_documented() -> None:
    """
    Confirms that price suitability scoring reflects an MVP decision, not
    a source-document mandate.

    Both candidates are within budget (Step 6 already enforced the hard limit).
    The formula scores higher-priced (within budget) candidates higher.
    This test documents and pins that specific behavior so it cannot change
    silently.
    """
    budget = 600.0
    c_low  = make_candidate(price=200.0)  # 200/600 = 0.333
    c_mid  = make_candidate(price=400.0)  # 400/600 = 0.667
    c_high = make_candidate(price=600.0)  # 600/600 = 1.000

    assert abs(_price_score(c_low,  budget) - (200 / 600)) < 1e-9
    assert abs(_price_score(c_mid,  budget) - (400 / 600)) < 1e-9
    assert abs(_price_score(c_high, budget) - 1.0)         < 1e-9
    # Direction: higher price → higher score (the implementation decision)
    assert _price_score(c_low, budget) < _price_score(c_mid, budget) < _price_score(c_high, budget)


# ---------------------------------------------------------------------------
# Test 3 — Better capacity suitability ranks higher when quantity supplied
# ---------------------------------------------------------------------------

def test_better_capacity_suitability_ranks_higher_with_quantity() -> None:
    """
    When semantic distance, price, and rating are equal,
    the candidate with more capacity relative to requested quantity ranks first.
    """
    high_cap = make_candidate(
        product_id=_FIXED_UUID_A, distance=0.20, price=620.0,
        available_quantity=60, production_capacity=50, artisan_rating=4.0,
    )  # total = 110
    low_cap = make_candidate(
        product_id=_FIXED_UUID_B, distance=0.20, price=620.0,
        available_quantity=25, production_capacity=25, artisan_rating=4.0,
    )  # total = 50
    intent = make_intent(budget_per_unit=None, quantity=100)

    ranked = service.rank([low_cap, high_cap], intent)

    assert ranked[0].candidate is high_cap
    assert ranked[1].candidate is low_cap
    assert ranked[0].capacity_score > ranked[1].capacity_score


# ---------------------------------------------------------------------------
# Test 4 — Missing budget does NOT create an artificial price penalty
# ---------------------------------------------------------------------------

def test_missing_budget_no_price_penalty() -> None:
    """
    When budget_per_unit is None, all candidates should receive the same
    neutral price_score (0.5), regardless of their actual price.
    """
    cheap  = make_candidate(price=100.0)
    midrange = make_candidate(price=500.0)
    expensive = make_candidate(price=9000.0)
    intent = make_intent(budget_per_unit=None, quantity=None)

    ranked = service.rank([cheap, midrange, expensive], intent)

    # All price_scores must be equal neutral value
    assert all(r.price_score == _NEUTRAL for r in ranked)


# ---------------------------------------------------------------------------
# Test 5 — Missing quantity does NOT create an artificial capacity penalty
# ---------------------------------------------------------------------------

def test_missing_quantity_no_capacity_penalty() -> None:
    """
    When quantity is None, all candidates receive neutral capacity_score (0.5),
    regardless of their available or production capacity.
    """
    zero_stock = make_candidate(available_quantity=0, production_capacity=0)
    huge_stock = make_candidate(available_quantity=1000, production_capacity=1000)
    intent = make_intent(quantity=None, budget_per_unit=None)

    ranked = service.rank([zero_stock, huge_stock], intent)

    assert all(r.capacity_score == _NEUTRAL for r in ranked)


# ---------------------------------------------------------------------------
# Test 6 — Equal scores have deterministic ordering (tie-breaking by product_id)
# ---------------------------------------------------------------------------

def test_equal_scores_have_deterministic_ordering() -> None:
    """
    Two candidates with identical scores must be sorted deterministically
    by product_id (ascending UUID string).
    """
    # Use fixed UUIDs so the expected tie-break order is known
    uuid_first  = UUID("10000000-0000-0000-0000-000000000001")
    uuid_second = UUID("20000000-0000-0000-0000-000000000002")

    c1 = make_candidate(product_id=uuid_first,  distance=0.20, price=620.0,
                        available_quantity=60, production_capacity=40,
                        artisan_rating=4.0)
    c2 = make_candidate(product_id=uuid_second, distance=0.20, price=620.0,
                        available_quantity=60, production_capacity=40,
                        artisan_rating=4.0)
    intent = make_intent(budget_per_unit=None, quantity=None)

    ranked_ab = service.rank([c1, c2], intent)
    ranked_ba = service.rank([c2, c1], intent)

    # Both orderings should produce same result
    assert ranked_ab[0].candidate.product_id == ranked_ba[0].candidate.product_id
    # Ascending UUID → uuid_first before uuid_second
    assert ranked_ab[0].candidate.product_id == uuid_first
    assert ranked_ab[1].candidate.product_id == uuid_second


# ---------------------------------------------------------------------------
# Test 7 — Ranking is reproducible
# ---------------------------------------------------------------------------

def test_ranking_is_reproducible() -> None:
    """
    Running the same candidates through the ranking function multiple times
    must produce exactly the same order and scores.
    """
    candidates = [
        make_candidate(product_id=_FIXED_UUID_A, distance=0.10, price=700.0,
                       available_quantity=80, artisan_rating=4.8),
        make_candidate(product_id=_FIXED_UUID_B, distance=0.25, price=600.0,
                       available_quantity=50, artisan_rating=3.5),
        make_candidate(product_id=_FIXED_UUID_C, distance=0.40, price=500.0,
                       available_quantity=30, artisan_rating=4.0),
    ]
    intent = make_intent()

    first_run  = service.rank(list(candidates), intent)
    second_run = service.rank(list(candidates), intent)

    assert [r.match_score for r in first_run] == [r.match_score for r in second_run]
    assert (
        [str(r.candidate.product_id) for r in first_run]
        == [str(r.candidate.product_id) for r in second_run]
    )


# ---------------------------------------------------------------------------
# Test 8 — Empty candidate list returns empty ranked list
# ---------------------------------------------------------------------------

def test_empty_candidate_list_returns_empty() -> None:
    intent = make_intent()
    ranked = service.rank([], intent)
    assert ranked == []


# ---------------------------------------------------------------------------
# Test 9 — Multiple candidates ranked by documented scoring formula
# ---------------------------------------------------------------------------

def test_multiple_candidates_ranked_by_formula() -> None:
    """
    Three candidates with distinct known characteristics.
    Manually compute expected match_scores and verify ranking order.

    Candidate A: distance=0.05, price=700, cap=110, rating=5.0
    Candidate B: distance=0.20, price=620, cap=100, rating=4.0
    Candidate C: distance=0.35, price=500, cap=70,  rating=3.0
    Intent: budget=700, quantity=100
    """
    c_a = make_candidate(product_id=_FIXED_UUID_A, distance=0.05, price=700.0,
                         available_quantity=60, production_capacity=50,
                         artisan_rating=5.0)
    c_b = make_candidate(product_id=_FIXED_UUID_B, distance=0.20, price=620.0,
                         available_quantity=60, production_capacity=40,
                         artisan_rating=4.0)
    c_c = make_candidate(product_id=_FIXED_UUID_C, distance=0.35, price=500.0,
                         available_quantity=30, production_capacity=40,
                         artisan_rating=3.0)

    intent = make_intent(budget_per_unit=700.0, quantity=100)

    # Compute expected scores manually
    def expected_score(sem, price, cap, rate) -> float:
        return round(W_SEM * sem + W_PRICE * price + W_CAP * cap + W_RATE * rate, 6)

    score_a = expected_score(0.95, 1.0,  1.0, 1.0)   # cap 110/100=1
    score_b = expected_score(0.80, 620/700, 1.0, 0.8) # cap 100/100=1
    score_c = expected_score(0.65, 500/700, 0.7, 0.6) # cap 70/100=0.7

    assert score_a > score_b > score_c, "Test data must produce a clear order"

    ranked = service.rank([c_c, c_b, c_a], intent)  # shuffled input

    assert ranked[0].candidate.product_id == _FIXED_UUID_A
    assert ranked[1].candidate.product_id == _FIXED_UUID_B
    assert ranked[2].candidate.product_id == _FIXED_UUID_C
    assert abs(ranked[0].match_score - score_a) < 1e-5
    assert abs(ranked[1].match_score - score_b) < 1e-5
    assert abs(ranked[2].match_score - score_c) < 1e-5


# ---------------------------------------------------------------------------
# Test 10 — Primary assignment scenario
# ---------------------------------------------------------------------------

def test_primary_assignment_scenario() -> None:
    """
    "I need 100 handmade jute bags for my hotel under 700 each."

    After Step 6 filtering, rank the remaining eligible candidates.

    Candidate 1 (c1): price=620, distance=0.08, cap=110, rating=4.8
      — high semantic relevance, good price, full capacity, excellent rating
    Candidate 2 (c2): price=700, distance=0.15, cap=100, rating=4.2
      — good semantic relevance, at budget (price_score=1.0), exact capacity
    Candidate 3 (c3): price=550, distance=0.30, cap=80, rating=3.5
      — moderate semantic relevance, lower price (further from budget),
        partial capacity

    Expected order: c1 > c2 > c3 (verify ranking is correct)
    """
    c1 = make_candidate(product_id=_FIXED_UUID_A,
                        title="Handwoven Jute Bag A",
                        distance=0.08, price=620.0,
                        available_quantity=60, production_capacity=50,
                        artisan_rating=4.8)
    c2 = make_candidate(product_id=_FIXED_UUID_B,
                        title="Handwoven Jute Bag B",
                        distance=0.15, price=700.0,
                        available_quantity=60, production_capacity=40,
                        artisan_rating=4.2)
    c3 = make_candidate(product_id=_FIXED_UUID_C,
                        title="Handwoven Jute Bag C",
                        distance=0.30, price=550.0,
                        available_quantity=50, production_capacity=30,
                        artisan_rating=3.5)

    intent = SearchIntent(
        product="handmade jute bags",
        quantity=100,
        budget_per_unit=700.0,
        use_case="hotel",
        location=None,
    )

    ranked = service.rank([c3, c1, c2], intent)  # shuffled input

    assert len(ranked) == 3
    assert ranked[0].candidate.product_id == _FIXED_UUID_A, (
        f"c1 should rank first, got {ranked[0].candidate.title}"
    )
    assert ranked[1].candidate.product_id == _FIXED_UUID_B, (
        f"c2 should rank second, got {ranked[1].candidate.title}"
    )
    assert ranked[2].candidate.product_id == _FIXED_UUID_C, (
        f"c3 should rank third, got {ranked[2].candidate.title}"
    )
    # Scores must be strictly descending
    assert ranked[0].match_score > ranked[1].match_score > ranked[2].match_score

    # All match_scores must be in [0, 1]
    assert all(0.0 <= r.match_score <= 1.0 for r in ranked)


# ---------------------------------------------------------------------------
# Test — ranking service exposes RankedCandidate with all fields
# ---------------------------------------------------------------------------

def test_ranked_candidate_has_all_fields() -> None:
    c = make_candidate()
    intent = make_intent()
    ranked = service.rank([c], intent)

    r = ranked[0]
    assert hasattr(r, "match_score")
    assert hasattr(r, "semantic_score")
    assert hasattr(r, "price_score")
    assert hasattr(r, "capacity_score")
    assert hasattr(r, "rating_score")
    assert hasattr(r, "candidate")
    assert r.candidate is c


# ---------------------------------------------------------------------------
# Test — single candidate returns list of one
# ---------------------------------------------------------------------------

def test_single_candidate_returns_list_of_one() -> None:
    c = make_candidate()
    intent = make_intent()
    ranked = service.rank([c], intent)
    assert len(ranked) == 1
    assert ranked[0].candidate is c


# ---------------------------------------------------------------------------
# Test — rating contributes correct fraction to score
# ---------------------------------------------------------------------------

def test_rating_contributes_correct_fraction() -> None:
    """
    Two candidates identical in all aspects except artisan_rating.
    The higher-rated one should score exactly W_RATE * (delta / 5.0) higher.
    """
    c_high = make_candidate(product_id=_FIXED_UUID_A, artisan_rating=5.0,
                            distance=0.20, price=620.0,
                            available_quantity=60, production_capacity=40)
    c_low  = make_candidate(product_id=_FIXED_UUID_B, artisan_rating=2.5,
                            distance=0.20, price=620.0,
                            available_quantity=60, production_capacity=40)

    intent = make_intent(budget_per_unit=None, quantity=None)

    rc_high = score_candidate(c_high, intent)
    rc_low  = score_candidate(c_low, intent)

    delta_rating = (5.0 - 2.5) / 5.0   # = 0.5
    expected_delta = round(W_RATE * delta_rating, 6)
    actual_delta   = round(rc_high.match_score - rc_low.match_score, 6)

    assert abs(actual_delta - expected_delta) < 1e-5
