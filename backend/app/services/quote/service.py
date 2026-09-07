from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from app.schemas.quote import (
    QuoteCreateRequest,
    QuoteListResponse,
    QuoteResponse,
)
from app.services.quote.repository import QuoteRepository
from app.services.search.allocation import MultiArtisanAllocationService
from app.services.search.service import SearchOrchestrationService, SearchServiceError

logger = logging.getLogger(__name__)


class QuoteServiceError(Exception):
    """Base error for quote service operations."""


class QuoteMatchingError(QuoteServiceError):
    """Raised when the matching engine fails during quote creation."""


class QuoteService:
    """Service orchestrating quote creation, B2B multi-artisan matching, and quote retrieval."""

    def __init__(
        self,
        quote_repository: QuoteRepository | None = None,
        search_service: SearchOrchestrationService | None = None,
        allocation_service: MultiArtisanAllocationService | None = None,
    ) -> None:
        self._quote_repo = quote_repository or QuoteRepository()
        self._search_service = search_service
        self._allocation_service = allocation_service or MultiArtisanAllocationService()

    def _get_search_service(self) -> SearchOrchestrationService:
        if self._search_service is None:
            # Import providers lazily so tests can easily supply mocks
            from app.services.search.embeddings.gemini import GeminiEmbeddingProvider
            from app.services.search.providers.gemini import GeminiIntentExtractor
            from app.services.search.repository import SearchProductRepository

            self._search_service = SearchOrchestrationService(
                intent_extractor=GeminiIntentExtractor(),
                embedding_provider=GeminiEmbeddingProvider(),
                repository=SearchProductRepository(),
                require_full_capacity=False,
            )
        return self._search_service

    async def create_quote(self, request: QuoteCreateRequest) -> QuoteResponse:
        """
        1. Run existing B2B matching engine to find matching artisan pool.
        2. Allocate required quantity greedily across ranked candidates.
        3. Transactionally persist quote request and allocations together.
        """
        search_service = self._get_search_service()
        try:
            # 1. Search candidate pool with relaxed full-capacity requirement
            search_result = await search_service.search(request.requirement_text)
        except SearchServiceError as exc:
            raise QuoteMatchingError(f"Matching search failed: {exc}") from exc
        except Exception as exc:
            raise QuoteMatchingError(f"Matching engine failed unexpectedly: {exc}") from exc

        # 2. Greedy allocation
        allocation = self._allocation_service.allocate(
            ranked_candidates=search_result.ranked_candidates,
            required_quantity=request.quantity,
        )

        allocations_to_save: list[dict[str, Any]] = [
            {
                "artisan_id": item.artisan_id,
                "matched_quantity": item.allocated_quantity,
                "match_score": item.match_score,
                "business_name": item.candidate.artisan_business_name,
                "product_id": item.product_id,
            }
            for item in allocation.allocations
        ]

        # 3. Transactionally save quote request and allocations
        return await self._quote_repo.create_quote_with_allocations(
            request=request,
            allocations=allocations_to_save,
        )

    async def get_quote(self, quote_id: UUID) -> QuoteResponse | None:
        """Fetch quote request by ID."""
        return await self._quote_repo.get_quote_by_id(quote_id)

    async def list_quotes(
        self,
        buyer_id: UUID | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> QuoteListResponse:
        """List quote requests with pagination."""
        return await self._quote_repo.list_quotes(
            buyer_id=buyer_id,
            status=status,
            limit=limit,
            offset=offset,
        )
