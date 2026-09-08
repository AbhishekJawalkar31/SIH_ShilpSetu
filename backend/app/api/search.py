from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.matching import (
    ArtisanPoolItem,
    BulkMatchRequest,
    BulkMatchResponse,
)
from app.schemas.search import SearchIntent
from app.services.search.allocation import MultiArtisanAllocationService
from app.services.search.embeddings.gemini import GeminiEmbeddingProvider
from app.services.search.providers.gemini import GeminiIntentExtractor
from app.services.search.repository import SearchProductRepository
from app.services.search.service import SearchOrchestrationService, SearchServiceError


router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Dependency providers
# ---------------------------------------------------------------------------

def get_search_service(require_full_capacity: bool = True) -> SearchOrchestrationService:
    """Construct the search orchestration service with all dependencies wired."""
    intent_extractor = GeminiIntentExtractor()
    embedding_provider = GeminiEmbeddingProvider()
    repository = SearchProductRepository()
    return SearchOrchestrationService(
        intent_extractor=intent_extractor,
        embedding_provider=embedding_provider,
        repository=repository,
        require_full_capacity=require_full_capacity,
    )


def get_allocation_service() -> MultiArtisanAllocationService:
    """Construct the multi-artisan allocation service."""
    return MultiArtisanAllocationService()


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


# ---------------------------------------------------------------------------
# Search request/response schemas (API_CONTRACT.md §12)
# ---------------------------------------------------------------------------

class SearchRequest(BaseModel):
    """
    Buyer natural-language search request.

    Example:
    {
      "query": "I need 100 handmade jute bags for my hotel under 700 rupees each",
      "quantity": 100,
      "budget_per_unit": 700,
      "location": null
    }
    """

    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1)
    quantity: int | None = Field(default=None, gt=0)
    budget_per_unit: float | None = Field(default=None, ge=0)
    location: str | None = None
    require_full_capacity: bool = True


class SearchResultItem(BaseModel):
    """A ranked search result candidate product (API_CONTRACT.md §12)."""

    model_config = ConfigDict(extra="ignore")

    product_id: UUID
    artisan_id: UUID
    title: str
    price: float | None
    available_quantity: int
    production_capacity: int
    match_score: float
    image_url: str | None = None
    category: str | None = None
    craft_type: str | None = None
    description: str | None = None
    material: str | None = None
    tags: list[str] | None = None
    currency: str = "INR"
    artisan_business_name: str | None = None
    artisan_location: str | None = None


class SearchResponse(BaseModel):
    """Buyer semantic search response (API_CONTRACT.md §12)."""

    model_config = ConfigDict(extra="forbid")

    intent: SearchIntent
    results: list[SearchResultItem]

    @property
    def total(self) -> int:
        return len(self.results)

    @property
    def candidates(self) -> list[SearchResultItem]:
        # Alias for backward-compatibility with tests referencing candidates
        return self.results


# ---------------------------------------------------------------------------
# POST /api/search
# ---------------------------------------------------------------------------

@router.post("/search", response_model=SearchResponse)
async def search_products(
    body: SearchRequest,
    service: SearchOrchestrationService = Depends(get_search_service),
) -> SearchResponse | JSONResponse:
    """
    POST /api/search

    Searches products using natural-language intent and semantic similarity.
    Applies structured filters (budget, capacity, location) and deterministic ranking.
    """
    if not body.query or not body.query.strip():
        return _error_response(422, "QUERY_REQUIRED", "Search query must not be empty.")

    try:
        search_result = await service.search(body.query)
    except SearchServiceError as exc:
        return _error_response(
            500,
            "SEARCH_FAILED",
            f"Search could not be completed: {exc}",
        )
    except Exception:
        return _error_response(500, "SEARCH_FAILED", "Search could not be completed.")

    # Override intent with explicit request constraints if provided in body
    final_intent = SearchIntent(
        product=search_result.intent.product,
        quantity=body.quantity if body.quantity is not None else search_result.intent.quantity,
        budget_per_unit=body.budget_per_unit if body.budget_per_unit is not None else search_result.intent.budget_per_unit,
        use_case=search_result.intent.use_case,
        location=body.location if body.location is not None else search_result.intent.location,
    )

    items: list[SearchResultItem] = [
        SearchResultItem(
            product_id=rc.candidate.product_id,
            artisan_id=rc.candidate.artisan_id,
            title=rc.candidate.title,
            price=rc.candidate.price,
            available_quantity=rc.candidate.available_quantity,
            production_capacity=rc.candidate.production_capacity,
            match_score=rc.match_score,
            image_url=rc.candidate.image_url,
            category=rc.candidate.category,
            craft_type=rc.candidate.craft_type,
            description=rc.candidate.description,
            material=rc.candidate.material,
            tags=rc.candidate.tags,
            currency=rc.candidate.currency,
            artisan_business_name=rc.candidate.artisan_business_name,
            artisan_location=rc.candidate.artisan_location,
        )
        for rc in search_result.ranked_candidates
    ]

    return SearchResponse(
        intent=final_intent,
        results=items,
    )


# ---------------------------------------------------------------------------
# POST /api/matching/bulk
# ---------------------------------------------------------------------------

@router.post("/matching/bulk", response_model=BulkMatchResponse)
async def bulk_match(
    body: BulkMatchRequest,
    service: SearchOrchestrationService = Depends(get_search_service),
    allocation_service: MultiArtisanAllocationService = Depends(get_allocation_service),
) -> BulkMatchResponse | JSONResponse:
    """
    POST /api/matching/bulk

    Finds a pool of artisans/products capable of satisfying a bulk requirement.
    Uses relaxed capacity filtering (require_full_capacity=False) to gather all
    eligible candidates, ranks them deterministically, and allocates the required
    quantity greedily across artisans in ranking order.
    """
    if not body.query or not body.query.strip():
        return _error_response(422, "QUERY_REQUIRED", "Query must not be empty.")

    if body.quantity <= 0:
        return _error_response(422, "INVALID_QUANTITY", "Quantity must be greater than zero.")

    try:
        # Run search pipeline to retrieve, filter, and rank candidates
        search_result = await service.search(body.query)
    except SearchServiceError as exc:
        return _error_response(
            500,
            "MATCHING_FAILED",
            f"Bulk matching could not be completed: {exc}",
        )
    except Exception:
        return _error_response(500, "MATCHING_FAILED", "Bulk matching could not be completed.")

    # Allocate required quantity across ranked candidates
    allocation = allocation_service.allocate(
        ranked_candidates=search_result.ranked_candidates,
        required_quantity=body.quantity,
    )

    artisans = [
        ArtisanPoolItem(
            artisan_id=item.artisan_id,
            business_name=item.candidate.artisan_business_name,
            product_id=item.product_id,
            matched_quantity=item.allocated_quantity,
            match_score=item.match_score,
        )
        for item in allocation.allocations
    ]

    return BulkMatchResponse(
        required_quantity=body.quantity,
        matched_quantity=allocation.allocated_quantity,
        artisans=artisans,
    )
