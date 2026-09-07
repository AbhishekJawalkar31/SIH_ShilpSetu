from __future__ import annotations

from uuid import uuid4

import pytest

from app.schemas.search import SearchIntent
from app.services.search.filtering import CandidateFilterService, FilterCriteria
from app.services.search.repository import CandidateProduct


def make_candidate(
    title: str = "Handwoven Jute Bag",
    price: float = 620.0,
    available_quantity: int = 40,
    production_capacity: int = 70,
    status: str = "published",
    category: str = "Bags",
    artisan_city: str = "Jaipur",
    artisan_state: str = "Rajasthan",
    artisan_location: str = "Jaipur, Rajasthan",
    distance: float = 0.15,
) -> CandidateProduct:
    return CandidateProduct(
        product_id=uuid4(),
        artisan_id=uuid4(),
        title=title,
        description="Handmade eco-friendly bag",
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
        artisan_business_name="Desert Crafts",
        artisan_location=artisan_location,
        artisan_city=artisan_city,
        artisan_state=artisan_state,
        artisan_country="India",
        artisan_rating=4.8,
    )


# 1. Published product retained
def test_published_product_retained() -> None:
    service = CandidateFilterService()
    candidate = make_candidate(status="published")
    criteria = FilterCriteria()

    assert service.is_candidate_eligible(candidate, criteria) is True
    assert service.filter_candidates([candidate], criteria) == [candidate]


# 2. Non-published product excluded (draft, archived)
def test_non_published_product_excluded() -> None:
    service = CandidateFilterService()
    criteria = FilterCriteria()

    draft_candidate = make_candidate(status="draft")
    archived_candidate = make_candidate(status="archived")

    assert service.is_candidate_eligible(draft_candidate, criteria) is False
    assert service.is_candidate_eligible(archived_candidate, criteria) is False
    assert service.filter_candidates([draft_candidate, archived_candidate], criteria) == []


# 3. Product over budget excluded
def test_product_over_budget_excluded() -> None:
    service = CandidateFilterService()
    candidate = make_candidate(price=750.0)
    criteria = FilterCriteria(budget_per_unit=700.0)

    assert service.is_candidate_eligible(candidate, criteria) is False
    assert service.filter_candidates([candidate], criteria) == []


# 4. Product within budget retained (exact match and under budget)
def test_product_within_budget_retained() -> None:
    service = CandidateFilterService()
    exact_match = make_candidate(price=700.0)
    under_budget = make_candidate(price=650.0)
    criteria = FilterCriteria(budget_per_unit=700.0)

    assert service.is_candidate_eligible(exact_match, criteria) is True
    assert service.is_candidate_eligible(under_budget, criteria) is True
    assert service.filter_candidates([exact_match, under_budget], criteria) == [
        exact_match,
        under_budget,
    ]


# 5. Insufficient capacity excluded when quantity is supplied
def test_insufficient_capacity_excluded_when_quantity_supplied() -> None:
    service = CandidateFilterService()
    # Total capacity = 20 + 50 = 70 < 100
    candidate = make_candidate(available_quantity=20, production_capacity=50)
    criteria = FilterCriteria(requested_quantity=100, require_full_capacity=True)

    assert service.is_candidate_eligible(candidate, criteria) is False
    assert service.filter_candidates([candidate], criteria) == []


# 6. Sufficient capacity retained (exact and surplus)
def test_sufficient_capacity_retained() -> None:
    service = CandidateFilterService()
    # Total capacity = 50 + 50 = 100 >= 100
    exact_capacity = make_candidate(available_quantity=50, production_capacity=50)
    # Total capacity = 60 + 50 = 110 >= 100
    surplus_capacity = make_candidate(available_quantity=60, production_capacity=50)
    criteria = FilterCriteria(requested_quantity=100, require_full_capacity=True)

    assert service.is_candidate_eligible(exact_capacity, criteria) is True
    assert service.is_candidate_eligible(surplus_capacity, criteria) is True
    assert service.filter_candidates([exact_capacity, surplus_capacity], criteria) == [
        exact_capacity,
        surplus_capacity,
    ]


# 7. No quantity means capacity filter is not applied
def test_no_quantity_means_capacity_filter_not_applied() -> None:
    service = CandidateFilterService()
    # Total capacity = 0
    candidate_zero_stock = make_candidate(available_quantity=0, production_capacity=0)
    criteria = FilterCriteria(requested_quantity=None)

    assert service.is_candidate_eligible(candidate_zero_stock, criteria) is True
    assert service.filter_candidates([candidate_zero_stock], criteria) == [candidate_zero_stock]


# 8. No budget means price filter is not applied
def test_no_budget_means_price_filter_not_applied() -> None:
    service = CandidateFilterService()
    expensive_candidate = make_candidate(price=50000.0)
    criteria = FilterCriteria(budget_per_unit=None)

    assert service.is_candidate_eligible(expensive_candidate, criteria) is True
    assert service.filter_candidates([expensive_candidate], criteria) == [expensive_candidate]


# 9. Location filtering and compatibility
def test_location_filtering_compatibility() -> None:
    service = CandidateFilterService()
    jaipur_candidate = make_candidate(
        artisan_city="Jaipur", artisan_state="Rajasthan", artisan_location="Jaipur, Rajasthan"
    )
    kashmir_candidate = make_candidate(
        artisan_city="Srinagar", artisan_state="Kashmir", artisan_location="Srinagar, Kashmir"
    )

    criteria_jaipur = FilterCriteria(location="Jaipur")
    criteria_rajasthan = FilterCriteria(location="Rajasthan")
    criteria_kashmir = FilterCriteria(location="Kashmir")

    assert service.is_candidate_eligible(jaipur_candidate, criteria_jaipur) is True
    assert service.is_candidate_eligible(jaipur_candidate, criteria_rajasthan) is True
    assert service.is_candidate_eligible(jaipur_candidate, criteria_kashmir) is False

    assert service.is_candidate_eligible(kashmir_candidate, criteria_kashmir) is True
    assert service.is_candidate_eligible(kashmir_candidate, criteria_jaipur) is False


# 10. Combined budget + capacity filtering
def test_combined_budget_and_capacity_filtering() -> None:
    service = CandidateFilterService()
    criteria = FilterCriteria(budget_per_unit=700.0, requested_quantity=100)

    # Valid: price 620 <= 700, capacity 50+60=110 >= 100
    valid_candidate = make_candidate(price=620.0, available_quantity=50, production_capacity=60)
    # Fails budget: price 720 > 700
    over_budget = make_candidate(price=720.0, available_quantity=50, production_capacity=60)
    # Fails capacity: capacity 20+50=70 < 100
    under_capacity = make_candidate(price=620.0, available_quantity=20, production_capacity=50)
    # Fails both
    fails_both = make_candidate(price=800.0, available_quantity=10, production_capacity=10)

    filtered = service.filter_candidates(
        [valid_candidate, over_budget, under_capacity, fails_both], criteria
    )
    assert filtered == [valid_candidate]


# 11. Empty candidate list handling
def test_empty_candidate_list() -> None:
    service = CandidateFilterService()
    criteria = FilterCriteria(budget_per_unit=500.0, requested_quantity=50)

    assert service.filter_candidates([], criteria) == []


# 12. Primary demo constraints: "I need 100 handmade jute bags for my hotel under 700 each."
def test_primary_demo_constraints_filtering() -> None:
    # Extracted intent from Step 3B
    intent = SearchIntent(
        product="handmade jute bags",
        quantity=100,
        budget_per_unit=700.0,
        use_case="hotel",
        location=None,
    )
    criteria = FilterCriteria.from_intent(intent, require_full_capacity=True)

    service = CandidateFilterService()

    # Candidate 1: 620 INR, capacity 40+70=110 -> Qualifies
    c1 = make_candidate(title="Handwoven Jute Bag A", price=620.0, available_quantity=40, production_capacity=70)
    # Candidate 2: 700 INR, capacity 60+40=100 -> Qualifies (exact budget & capacity)
    c2 = make_candidate(title="Handwoven Jute Bag B", price=700.0, available_quantity=60, production_capacity=40)
    # Candidate 3: 750 INR -> Disqualified (over budget)
    c3 = make_candidate(title="Handwoven Jute Bag C", price=750.0, available_quantity=80, production_capacity=50)
    # Candidate 4: 600 INR, capacity 30+40=70 -> Disqualified (under capacity for single match)
    c4 = make_candidate(title="Handwoven Jute Bag D", price=600.0, available_quantity=30, production_capacity=40)

    results = service.filter_candidates([c1, c2, c3, c4], criteria)
    assert results == [c1, c2]
