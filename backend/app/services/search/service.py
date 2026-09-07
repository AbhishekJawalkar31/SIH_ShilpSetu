from __future__ import annotations

from dataclasses import dataclass, field

from app.schemas.search import SearchIntent
from app.services.search.embeddings.base import EmbeddingProvider
from app.services.search.embeddings.helpers import build_query_embedding_text
from app.services.search.filtering import CandidateFilterService, FilterCriteria
from app.services.search.providers.base import IntentExtractor
from app.services.search.ranking import CandidateRankingService, RankedCandidate
from app.services.search.repository import CandidateProduct, SearchProductRepository


@dataclass(frozen=True)
class SearchResult:
    """The final output of a single semantic search pipeline execution."""

    intent: SearchIntent
    # Filtered raw candidates — preserved for Step 8 allocation
    candidates: list[CandidateProduct] = field(default_factory=list)
    # Ranked candidates — sorted by deterministic match_score (Step 7)
    ranked_candidates: list[RankedCandidate] = field(default_factory=list)


class SearchServiceError(Exception):
    """Base exception for search orchestration failures."""


class SearchOrchestrationService:
    """
    Orchestrates the full semantic search pipeline:

        buyer query
            down intent extraction    (Gemini)
            down query embedding      (text-embedding-004)
            down pgvector retrieval   (cosine similarity, pre-filtered to published)
            down structured filtering (budget, capacity, location, category)
            down deterministic ranking (weighted match_score)
            down SearchResult
    """

    def __init__(
        self,
        intent_extractor: IntentExtractor,
        embedding_provider: EmbeddingProvider,
        repository: SearchProductRepository,
        filter_service: CandidateFilterService | None = None,
        ranking_service: CandidateRankingService | None = None,
        retrieval_limit: int = 20,
        require_full_capacity: bool = True,
    ) -> None:
        self._intent_extractor = intent_extractor
        self._embedding_provider = embedding_provider
        self._repository = repository
        self._filter_service = filter_service or CandidateFilterService()
        self._ranking_service = ranking_service or CandidateRankingService()
        self._retrieval_limit = retrieval_limit
        self._require_full_capacity = require_full_capacity

    async def search(self, query: str) -> SearchResult:
        """
        Execute the full semantic search pipeline for a buyer query.

        Args:
            query: Raw natural-language buyer search query.

        Returns:
            SearchResult containing the extracted intent, filtered candidates
            (for Step 8 allocation), and ranked candidates (for API presentation).

        Raises:
            SearchServiceError: If any pipeline stage fails unrecoverably.
        """
        # Stage 1 - Intent extraction
        try:
            intent = await self._intent_extractor.extract_intent(query)
        except Exception as exc:
            raise SearchServiceError(
                f"Intent extraction failed: {exc}"
            ) from exc

        # Stage 2 - Build semantic query text and embed it
        try:
            query_text = build_query_embedding_text(intent)
            query_embedding = await self._embedding_provider.embed_query(query_text)
        except Exception as exc:
            raise SearchServiceError(
                f"Query embedding failed: {exc}"
            ) from exc

        # Stage 3 - Semantic retrieval from pgvector
        try:
            raw_candidates = await self._repository.search_products_by_embedding(
                query_embedding=query_embedding,
                limit=self._retrieval_limit,
            )
        except Exception as exc:
            raise SearchServiceError(
                f"Semantic retrieval failed: {exc}"
            ) from exc

        # Stage 4 - Structured post-filtering
        criteria = FilterCriteria.from_intent(
            intent,
            require_full_capacity=self._require_full_capacity,
        )
        filtered_candidates = self._filter_service.filter_candidates(
            raw_candidates, criteria
        )

        # Stage 5 - Deterministic ranking
        ranked_candidates = self._ranking_service.rank(filtered_candidates, intent)

        return SearchResult(
            intent=intent,
            candidates=filtered_candidates,
            ranked_candidates=ranked_candidates,
        )
