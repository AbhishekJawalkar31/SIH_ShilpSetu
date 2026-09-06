from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.api import (
    BulkMatchingRequest,
    BulkMatchingResponse,
    SearchRequest,
    SearchResponse,
)
from app.services.matching.service import MatchingService
from app.services.search.service import SearchService


router = APIRouter(prefix="/api", tags=["search"])


def get_search_service() -> SearchService:
    raise RuntimeError("Search service has not been configured.")


def get_matching_service() -> MatchingService:
    raise RuntimeError("Matching service has not been configured.")


@router.post("/search", response_model=SearchResponse)
def search_products(
    request: SearchRequest,
    service: SearchService = Depends(get_search_service),
) -> SearchResponse:
    return service.search(request)


@router.post("/matching/bulk", response_model=BulkMatchingResponse)
def match_bulk_requirement(
    request: BulkMatchingRequest,
    service: MatchingService = Depends(get_matching_service),
) -> BulkMatchingResponse:
    return service.match(request)