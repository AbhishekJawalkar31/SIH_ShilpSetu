from __future__ import annotations

import re
from typing import TYPE_CHECKING

from app.db.repository import ProductRepository
from app.schemas.api import SearchIntent, SearchRequest, SearchResponse, SearchResult

if TYPE_CHECKING:
    from app.services.embeddings.service import EmbeddingService


NUMBER_RE = re.compile(r"\b(\d{1,7})\b")
PRICE_RE = re.compile(r"(?:under|below|less than|₹|rs\.?)\s*([\d,]+)", re.I)


def _extract_intent(request: SearchRequest) -> SearchIntent:
    query = request.query
    quantity = request.quantity
    budget = request.budget_per_unit
    if quantity is None:
        quantities = [int(value) for value in NUMBER_RE.findall(query)]
        quantity = quantities[0] if quantities else None
    if budget is None:
        match = PRICE_RE.search(query)
        if match:
            budget = float(match.group(1).replace(",", ""))

    use_case = None
    for candidate in ("hotel", "gifting", "events", "corporate", "wedding"):
        if candidate in query.lower():
            use_case = candidate
            break
    return SearchIntent(
        product=query,
        quantity=quantity,
        budget_per_unit=budget,
        use_case=use_case,
        location=request.location,
    )


class SearchService:
    """Application search boundary.

    This MVP uses a transparent lexical candidate scorer.  The repository
    boundary is deliberately independent of ranking so pgvector retrieval can
    replace it without changing the HTTP contract.
    """

    def __init__(
        self,
        repository: ProductRepository,
        embedding_service: "EmbeddingService | None" = None,
    ) -> None:
        self.repository = repository
        self.embedding_service = embedding_service

    def search(self, request: SearchRequest) -> SearchResponse:
        intent = _extract_intent(request)
        products, _ = self.repository.list_products(status="published", limit=1000)
        if self.embedding_service is not None:
            semantic_matches = self.repository.semantic_search(
                self.embedding_service.embed_query(request.query)
            )
            if semantic_matches:
                products_by_id = {product.id: product for product in products}
                ranked: list[SearchResult] = []
                for product_id, score in semantic_matches:
                    product = products_by_id.get(product_id)
                    if product is None:
                        continue
                    inventory = self.repository.get_inventory(product.id)
                    ranked.append(
                        SearchResult(
                            product_id=product.id,
                            artisan_id=product.artisan_id,
                            title=product.title,
                            price=product.price,
                            available_quantity=inventory.available_quantity,
                            production_capacity=inventory.production_capacity,
                            match_score=round(score, 4),
                        )
                    )
                if ranked:
                    return SearchResponse(intent=intent, results=ranked)
        query_tokens = set(re.findall(r"[a-z0-9]+", request.query.lower()))
        ranked: list[SearchResult] = []
        for product in products:
            searchable = " ".join(
                [
                    product.title,
                    product.description,
                    product.category,
                    product.material,
                    product.craft_type,
                    *product.tags,
                    *(str(v) for v in product.attributes.values()),
                ]
            ).lower()
            product_tokens = set(re.findall(r"[a-z0-9]+", searchable))
            overlap = len(query_tokens & product_tokens)
            score = min(1.0, 0.25 + overlap / max(len(query_tokens), 1) * 0.75)
            if request.budget_per_unit is not None and product.price > request.budget_per_unit:
                score *= 0.35
            inventory = self.repository.get_inventory(product.id)
            ranked.append(
                SearchResult(
                    product_id=product.id,
                    artisan_id=product.artisan_id,
                    title=product.title,
                    price=product.price,
                    available_quantity=inventory.available_quantity,
                    production_capacity=inventory.production_capacity,
                    match_score=round(score, 4),
                )
            )
        ranked.sort(key=lambda result: result.match_score, reverse=True)
        return SearchResponse(intent=intent, results=ranked)


def capacity_for(result: SearchResult) -> int:
    return result.available_quantity + result.production_capacity