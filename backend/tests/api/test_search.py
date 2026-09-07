from __future__ import annotations

"""
Unit and Integration tests for Step 9 — API Integration.

Tests cover:
1. /api/search successful flow
2. /api/search validation failure
3. /api/search provider/database failure
4. /api/matching/bulk successful multi-artisan allocation
5. /api/matching/bulk insufficient capacity
6. /api/matching/bulk validation failure
7. primary query:
   "I need 100 handmade jute bags for my hotel under 700 each."
"""

from dataclasses import dataclass
from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.search import get_allocation_service, get_search_service, router
from app.schemas.search import SearchIntent
from app.services.search.allocation import (
    AllocationResult,
    ArtisanAllocationItem,
    MultiArtisanAllocationService,
)
from app.services.search.ranking import RankedCandidate
from app.services.search.repository import CandidateProduct
from app.services.search.service import SearchResult, SearchServiceError


# ---------------------------------------------------------------------------
# Test Fixtures & Collaborators
# ---------------------------------------------------------------------------

@dataclass
class FakeSearchService:
    result: SearchResult | None = None
    error: Exception | None = None

    async def search(self, query: str) -> SearchResult:
        if self.error is not None:
            raise self.error
        assert self.result is not None
        return self.result


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


def make_ranked_candidate(
    title: str = "Handwoven Jute Bag",
    price: float = 620.0,
    available_quantity: int = 20,
    production_capacity: int = 50,
    match_score: float = 0.91,
    artisan_name: str = "Artisan A",
    product_id: UUID | None = None,
    artisan_id: UUID | None = None,
) -> RankedCandidate:
    candidate = CandidateProduct(
        product_id=product_id or uuid4(),
        artisan_id=artisan_id or uuid4(),
        title=title,
        description="Eco-friendly handwoven jute bag.",
        category="Bags",
        material="Jute",
        craft_type="Handwoven",
        price=price,
        currency="INR",
        status="published",
        distance=0.09,
        available_quantity=available_quantity,
        production_capacity=production_capacity,
        unit="piece",
        artisan_business_name=artisan_name,
        artisan_location="Jaipur, Rajasthan",
        artisan_city="Jaipur",
        artisan_state="Rajasthan",
        artisan_country="India",
        artisan_rating=4.8,
    )
    return RankedCandidate(
        candidate=candidate,
        match_score=match_score,
        semantic_score=0.91,
        price_score=price / 700.0,
        capacity_score=1.0,
        rating_score=4.8 / 5.0,
    )


def build_test_client(
    fake_search_service: FakeSearchService,
    allocation_service: MultiArtisanAllocationService | None = None,
) -> TestClient:
    app = FastAPI()
    app.include_router(router)

    app.dependency_overrides[get_search_service] = lambda require_full_capacity=True: fake_search_service
    if allocation_service is not None:
        app.dependency_overrides[get_allocation_service] = lambda: allocation_service

    return TestClient(app)


# ---------------------------------------------------------------------------
# 1. /api/search successful flow
# ---------------------------------------------------------------------------

def test_api_search_successful_flow() -> None:
    intent = make_intent()
    rc1 = make_ranked_candidate(title="Handwoven Jute Bag", price=620.0, match_score=0.91)
    rc2 = make_ranked_candidate(title="Premium Jute Tote", price=680.0, match_score=0.88)

    search_result = SearchResult(
        intent=intent,
        candidates=[rc1.candidate, rc2.candidate],
        ranked_candidates=[rc1, rc2],
    )
    client = build_test_client(FakeSearchService(result=search_result))

    response = client.post(
        "/api/search",
        json={
            "query": "100 handmade jute bags for hotel under 700",
            "quantity": 100,
            "budget_per_unit": 700.0,
        },
    )

    assert response.status_code == 200
    data = response.json()

    assert "intent" in data
    assert data["intent"]["product"] == "handmade jute bags"
    assert data["intent"]["quantity"] == 100
    assert data["intent"]["budget_per_unit"] == 700.0

    assert "results" in data
    assert len(data["results"]) == 2
    first = data["results"][0]
    assert first["product_id"] == str(rc1.candidate.product_id)
    assert first["artisan_id"] == str(rc1.candidate.artisan_id)
    assert first["title"] == "Handwoven Jute Bag"
    assert first["price"] == 620.0
    assert first["available_quantity"] == 20
    assert first["production_capacity"] == 50
    assert first["match_score"] == 0.91


# ---------------------------------------------------------------------------
# 2. /api/search validation failure
# ---------------------------------------------------------------------------

def test_api_search_validation_failure_empty_query() -> None:
    client = build_test_client(FakeSearchService())

    # Empty string query
    resp1 = client.post("/api/search", json={"query": ""})
    assert resp1.status_code == 422

    # Whitespace only query
    resp2 = client.post("/api/search", json={"query": "   "})
    assert resp2.status_code == 422

    # Negative quantity
    resp3 = client.post("/api/search", json={"query": "jute bags", "quantity": -5})
    assert resp3.status_code == 422

    # Negative budget
    resp4 = client.post("/api/search", json={"query": "jute bags", "budget_per_unit": -100})
    assert resp4.status_code == 422


# ---------------------------------------------------------------------------
# 3. /api/search provider/database failure
# ---------------------------------------------------------------------------

def test_api_search_provider_or_database_failure() -> None:
    error_svc = FakeSearchService(error=SearchServiceError("pgvector connection timeout"))
    client = build_test_client(error_svc)

    response = client.post("/api/search", json={"query": "handmade bags"})
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "SEARCH_FAILED"
    assert "pgvector connection timeout" in response.json()["error"]["message"]


# ---------------------------------------------------------------------------
# 4. /api/matching/bulk successful multi-artisan allocation
# ---------------------------------------------------------------------------

def test_api_matching_bulk_successful_multi_artisan_allocation() -> None:
    intent = make_intent(quantity=100)
    # Artisan A: cap 40 (20+20)
    rc_a = make_ranked_candidate(title="Bag A", available_quantity=20, production_capacity=20, match_score=0.93, artisan_name="Artisan A")
    # Artisan B: cap 35 (15+20)
    rc_b = make_ranked_candidate(title="Bag B", available_quantity=15, production_capacity=20, match_score=0.89, artisan_name="Artisan B")
    # Artisan C: cap 50 (25+25)
    rc_c = make_ranked_candidate(title="Bag C", available_quantity=25, production_capacity=25, match_score=0.86, artisan_name="Artisan C")

    search_result = SearchResult(
        intent=intent,
        candidates=[rc_a.candidate, rc_b.candidate, rc_c.candidate],
        ranked_candidates=[rc_a, rc_b, rc_c],
    )
    client = build_test_client(
        fake_search_service=FakeSearchService(result=search_result),
        allocation_service=MultiArtisanAllocationService(),
    )

    response = client.post(
        "/api/matching/bulk",
        json={
            "query": "100 handmade jute bags for a hotel",
            "quantity": 100,
            "budget_per_unit": 700.0,
        },
    )

    assert response.status_code == 200
    data = response.json()

    assert data["required_quantity"] == 100
    assert data["matched_quantity"] == 100
    assert len(data["artisans"]) == 3

    a, b, c = data["artisans"]
    assert a["business_name"] == "Artisan A"
    assert a["matched_quantity"] == 40
    assert a["match_score"] == 0.93

    assert b["business_name"] == "Artisan B"
    assert b["matched_quantity"] == 35
    assert b["match_score"] == 0.89

    assert c["business_name"] == "Artisan C"
    assert c["matched_quantity"] == 25
    assert c["match_score"] == 0.86


# ---------------------------------------------------------------------------
# 5. /api/matching/bulk insufficient capacity
# ---------------------------------------------------------------------------

def test_api_matching_bulk_insufficient_capacity() -> None:
    intent = make_intent(quantity=150)
    # Total available across candidates = 30 + 30 = 60 < 150
    rc1 = make_ranked_candidate(title="Bag 1", available_quantity=10, production_capacity=20, match_score=0.90, artisan_name="Artisan 1")
    rc2 = make_ranked_candidate(title="Bag 2", available_quantity=10, production_capacity=20, match_score=0.85, artisan_name="Artisan 2")

    search_result = SearchResult(
        intent=intent,
        candidates=[rc1.candidate, rc2.candidate],
        ranked_candidates=[rc1, rc2],
    )
    client = build_test_client(
        fake_search_service=FakeSearchService(result=search_result),
        allocation_service=MultiArtisanAllocationService(),
    )

    response = client.post(
        "/api/matching/bulk",
        json={
            "query": "150 jute bags",
            "quantity": 150,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["required_quantity"] == 150
    assert data["matched_quantity"] == 60  # Only 60 feasible
    assert len(data["artisans"]) == 2
    assert data["artisans"][0]["matched_quantity"] == 30
    assert data["artisans"][1]["matched_quantity"] == 30


# ---------------------------------------------------------------------------
# 6. /api/matching/bulk validation failure
# ---------------------------------------------------------------------------

def test_api_matching_bulk_validation_failure() -> None:
    client = build_test_client(FakeSearchService())

    # Empty query
    r1 = client.post("/api/matching/bulk", json={"query": "", "quantity": 100})
    assert r1.status_code == 422

    # Zero or negative quantity
    r2 = client.post("/api/matching/bulk", json={"query": "jute bags", "quantity": 0})
    assert r2.status_code == 422

    r3 = client.post("/api/matching/bulk", json={"query": "jute bags", "quantity": -50})
    assert r3.status_code == 422

    # Negative budget
    r4 = client.post("/api/matching/bulk", json={"query": "jute bags", "quantity": 50, "budget_per_unit": -10})
    assert r4.status_code == 422


# ---------------------------------------------------------------------------
# 7. Primary assignment query:
#    "I need 100 handmade jute bags for my hotel under 700 each."
# ---------------------------------------------------------------------------

def test_primary_query_end_to_end_contracts() -> None:
    primary_query = "I need 100 handmade jute bags for my hotel under 700 each."

    intent = make_intent(
        product="handmade jute bags",
        quantity=100,
        budget_per_unit=700.0,
        use_case="hotel",
    )

    # 3 artisans matching the assignment example
    a1 = make_ranked_candidate(title="Artisan A Product", price=620.0, available_quantity=20, production_capacity=20, match_score=0.93, artisan_name="Artisan A")
    a2 = make_ranked_candidate(title="Artisan B Product", price=650.0, available_quantity=15, production_capacity=20, match_score=0.89, artisan_name="Artisan B")
    a3 = make_ranked_candidate(title="Artisan C Product", price=600.0, available_quantity=25, production_capacity=25, match_score=0.86, artisan_name="Artisan C")

    search_result = SearchResult(
        intent=intent,
        candidates=[a1.candidate, a2.candidate, a3.candidate],
        ranked_candidates=[a1, a2, a3],
    )

    client = build_test_client(
        fake_search_service=FakeSearchService(result=search_result),
        allocation_service=MultiArtisanAllocationService(),
    )

    # Test /api/search response matches contract
    search_resp = client.post(
        "/api/search",
        json={"query": primary_query, "quantity": 100, "budget_per_unit": 700.0},
    )
    assert search_resp.status_code == 200
    s_data = search_resp.json()
    assert s_data["intent"]["product"] == "handmade jute bags"
    assert s_data["intent"]["quantity"] == 100
    assert s_data["intent"]["budget_per_unit"] == 700.0
    assert len(s_data["results"]) == 3
    assert s_data["results"][0]["match_score"] == 0.93

    # Test /api/matching/bulk response matches contract
    bulk_resp = client.post(
        "/api/matching/bulk",
        json={"query": primary_query, "quantity": 100, "budget_per_unit": 700.0},
    )
    assert bulk_resp.status_code == 200
    b_data = bulk_resp.json()
    assert b_data["required_quantity"] == 100
    assert b_data["matched_quantity"] == 100
    assert len(b_data["artisans"]) == 3

    # 40 + 35 + 25 = 100
    assert b_data["artisans"][0]["matched_quantity"] == 40
    assert b_data["artisans"][1]["matched_quantity"] == 35
    assert b_data["artisans"][2]["matched_quantity"] == 25
