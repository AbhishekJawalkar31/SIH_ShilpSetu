from __future__ import annotations

from app.db.repository import ProductRepository
from app.schemas.api import (
    BulkMatchingRequest,
    BulkMatchingResponse,
    MatchingResponseItem,
    SearchRequest,
)
from app.services.search.service import SearchService, capacity_for


class MatchingService:
    def __init__(self, repository: ProductRepository) -> None:
        self.repository = repository
        self.search_service = SearchService(repository)

    def match(self, request: BulkMatchingRequest) -> BulkMatchingResponse:
        search = self.search_service.search(
            SearchRequest(
                query=request.query,
                quantity=request.quantity,
                budget_per_unit=request.budget_per_unit,
                location=request.location,
            )
        )
        remaining = request.quantity
        matches: list[MatchingResponseItem] = []
        for result in search.results:
            if remaining <= 0:
                break
            capacity = capacity_for(result)
            if capacity <= 0:
                continue
            matched_quantity = min(remaining, capacity)
            artisan = self.repository.get_artisan(result.artisan_id)
            matches.append(
                MatchingResponseItem(
                    artisan_id=result.artisan_id,
                    business_name=artisan.business_name if artisan else None,
                    product_id=result.product_id,
                    matched_quantity=matched_quantity,
                    match_score=result.match_score,
                )
            )
            remaining -= matched_quantity
        return BulkMatchingResponse(
            required_quantity=request.quantity,
            matched_quantity=request.quantity - remaining,
            artisans=matches,
        )