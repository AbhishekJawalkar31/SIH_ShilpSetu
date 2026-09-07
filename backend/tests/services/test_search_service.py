from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any
from uuid import UUID, uuid4

import pytest

from app.schemas.search import SearchIntent
from app.services.search.filtering import CandidateFilterService, FilterCriteria
from app.services.search.repository import CandidateProduct
from app.services.search.service import (
    SearchOrchestrationService,
    SearchResult,
    SearchServiceError,
)


# ---------------------------------------------------------------------------
# Fake collaborators
# ---------------------------------------------------------------------------

@dataclass
class FakeIntentExtractor:
    intent: SearchIntent | None = None
    error: Exception | None = None

    async def extract_intent(self, query: str) -> SearchIntent:
        if self.error is not None:
            raise self.error
        assert self.intent is not None
        return self.intent


@dataclass
class FakeEmbeddingProvider:
    vector: list[float] | None = None
    error: Exception | None = None

    async def embed_document(self, text: str, title: str | None = None) -> list[float]:
        raise NotImplementedError

    async def embed_query(self, text: str) -> list[float]:
        if self.error is not None:
            raise self.error
        assert self.vector is not None
        return self.vector


class FakeRepository:
    def __init__(
        self,
        candidates: list[CandidateProduct] | None = None,
        error: Exception | None = None,
    ) -> None:
        self._candidates = candidates or []
        self._error = error
        self.last_query_embedding: list[float] | None = None
        self.last_limit: int | None = None

    async def search_products_by_embedding(
        self,
        query_embedding: list[float],
        limit: int | None = None,
    ) -> list[CandidateProduct]:
        self.last_query_embedding = query_embedding
        self.last_limit = limit
        if self._error is not None:
            raise self._error
        return self._candidates


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


def make_vector(dim: int = 768) -> list[float]:
    return [0.01 * (i % 10) for i in range(dim)]


def make_candidate(
    title: str = "Handwoven Jute Bag",
    price: float = 620.0,
    available_quantity: int = 50,
    production_capacity: int = 60,
    status: str = "published",
    artisan_city: str = "Jaipur",
) -> CandidateProduct:
    return CandidateProduct(
        product_id=uuid4(),
        artisan_id=uuid4(),
        title=title,
        description="Eco-friendly handwoven jute bag.",
        category="Bags",
        material="Jute",
        craft_type="Handwoven",
        tags=["handmade", "jute"],
        attributes={"color": "brown"},
        price=price,
        currency="INR",
        image_url="https://example.com/bag.jpg",
        status=status,
        distance=0.12,
        available_quantity=available_quantity,
        production_capacity=production_capacity,
        unit="piece",
        artisan_business_name="Craft Co",
        artisan_location="Jaipur, Rajasthan",
        artisan_city=artisan_city,
        artisan_state="Rajasthan",
        artisan_country="India",
        artisan_rating=4.8,
    )


def build_service(
    intent: SearchIntent | None = None,
    intent_error: Exception | None = None,
    vector: list[float] | None = None,
    embed_error: Exception | None = None,
    candidates: list[CandidateProduct] | None = None,
    repo_error: Exception | None = None,
    retrieval_limit: int = 20,
    require_full_capacity: bool = True,
) -> tuple[SearchOrchestrationService, FakeRepository]:
    extractor = FakeIntentExtractor(intent=intent, error=intent_error)
    embedder = FakeEmbeddingProvider(
        vector=vector or make_vector(),
        error=embed_error,
    )
    repo = FakeRepository(candidates=candidates, error=repo_error)
    svc = SearchOrchestrationService(
        intent_extractor=extractor,
        embedding_provider=embedder,
        repository=repo,
        filter_service=CandidateFilterService(),
        retrieval_limit=retrieval_limit,
        require_full_capacity=require_full_capacity,
    )
    return svc, repo


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

# 1. Full pipeline success path (primary demo query)
def test_full_pipeline_success_primary_demo_query() -> None:
    intent = make_intent()
    c1 = make_candidate(price=620.0, available_quantity=50, production_capacity=60)
    c2 = make_candidate(price=750.0, available_quantity=80, production_capacity=50)  # over budget

    svc, _ = build_service(intent=intent, candidates=[c1, c2])
    result = asyncio.run(svc.search("I need 100 handmade jute bags for my hotel under 700 each"))

    assert isinstance(result, SearchResult)
    assert result.intent == intent
    assert len(result.candidates) == 1
    assert result.candidates[0] == c1


# 2. Intent is correctly forwarded to the result
def test_intent_is_returned_in_result() -> None:
    intent = make_intent(product="ceramic cups", quantity=200, budget_per_unit=250.0)
    svc, _ = build_service(intent=intent, candidates=[])

    result = asyncio.run(svc.search("200 ceramic cups under 250"))

    assert result.intent.product == "ceramic cups"
    assert result.intent.quantity == 200
    assert result.intent.budget_per_unit == 250.0


# 3. Query embedding is passed to the repository
def test_query_embedding_is_forwarded_to_repository() -> None:
    intent = make_intent()
    vector = make_vector(768)
    svc, repo = build_service(intent=intent, vector=vector, candidates=[])

    asyncio.run(svc.search("test query"))

    assert repo.last_query_embedding == vector


# 4. Retrieval limit is respected
def test_retrieval_limit_is_forwarded_to_repository() -> None:
    intent = make_intent()
    svc, repo = build_service(intent=intent, candidates=[], retrieval_limit=5)

    asyncio.run(svc.search("test query"))

    assert repo.last_limit == 5


# 5. All candidates filtered out returns empty list
def test_all_candidates_filtered_returns_empty_list() -> None:
    intent = make_intent(budget_per_unit=100.0)
    expensive_candidates = [
        make_candidate(price=500.0),
        make_candidate(price=800.0),
    ]
    svc, _ = build_service(intent=intent, candidates=expensive_candidates)

    result = asyncio.run(svc.search("jute bags under 100"))

    assert result.candidates == []


# 6. Empty retrieval produces empty result without error
def test_empty_retrieval_produces_empty_result() -> None:
    intent = make_intent()
    svc, _ = build_service(intent=intent, candidates=[])

    result = asyncio.run(svc.search("obscure query"))

    assert result.candidates == []
    assert result.intent == intent


# 7. Intent extraction failure raises SearchServiceError
def test_intent_extraction_failure_raises_search_service_error() -> None:
    svc, _ = build_service(intent_error=RuntimeError("Gemini down"))

    with pytest.raises(SearchServiceError) as exc_info:
        asyncio.run(svc.search("jute bags"))

    assert "Intent extraction failed" in str(exc_info.value)


# 8. Embedding failure raises SearchServiceError
def test_embedding_failure_raises_search_service_error() -> None:
    svc, _ = build_service(
        intent=make_intent(),
        embed_error=RuntimeError("embedding quota"),
    )

    with pytest.raises(SearchServiceError) as exc_info:
        asyncio.run(svc.search("jute bags"))

    assert "Query embedding failed" in str(exc_info.value)


# 9. Repository failure raises SearchServiceError
def test_repository_failure_raises_search_service_error() -> None:
    svc, _ = build_service(
        intent=make_intent(),
        repo_error=RuntimeError("DB connection lost"),
    )

    with pytest.raises(SearchServiceError) as exc_info:
        asyncio.run(svc.search("jute bags"))

    assert "Semantic retrieval failed" in str(exc_info.value)


# 10. No-filter query (no budget, no quantity) retains published candidates
def test_no_filter_query_retains_published_candidates() -> None:
    intent = SearchIntent(product="handwoven shawls")
    c1 = make_candidate(price=1200.0, available_quantity=5, production_capacity=0)
    c2 = make_candidate(status="draft")  # excluded: not published

    svc, _ = build_service(intent=intent, candidates=[c1, c2])
    result = asyncio.run(svc.search("handwoven shawls"))

    assert len(result.candidates) == 1
    assert result.candidates[0] == c1


# 11. require_full_capacity=False relaxes capacity constraint
def test_require_full_capacity_false_relaxes_capacity_constraint() -> None:
    intent = make_intent(quantity=100)
    # Total capacity = 10 + 10 = 20 < 100, normally excluded
    low_capacity_candidate = make_candidate(available_quantity=10, production_capacity=10)

    svc, _ = build_service(
        intent=intent,
        candidates=[low_capacity_candidate],
        require_full_capacity=False,
    )
    result = asyncio.run(svc.search("jute bags"))

    # With require_full_capacity=False, only requires total_capacity > 0
    assert len(result.candidates) == 1


# 12. Multiple candidates ordered by repository distance (order preserved)
def test_candidate_order_from_repository_is_preserved() -> None:
    intent = make_intent(budget_per_unit=None, quantity=None)
    c1 = make_candidate(title="Bag A")
    c2 = make_candidate(title="Bag B")
    c3 = make_candidate(title="Bag C")

    svc, _ = build_service(intent=intent, candidates=[c1, c2, c3])
    result = asyncio.run(svc.search("jute bags"))

    assert [c.title for c in result.candidates] == ["Bag A", "Bag B", "Bag C"]
