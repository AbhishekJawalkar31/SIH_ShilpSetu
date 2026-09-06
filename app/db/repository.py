from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import math
from typing import Protocol
from uuid import UUID, uuid4

import httpx

from app.schemas.api import (
    ArtisanProfileResponse,
    InventoryResponse,
    InventoryUpdateRequest,
    ProductCreateRequest,
    ProductResponse,
    PriceObservation,
    QuoteCreateRequest,
    QuoteResponse,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class InventoryRecord:
    product_id: UUID
    available_quantity: int = 0
    production_capacity: int = 0
    unit: str = "piece"
    updated_at: datetime = field(default_factory=utc_now)

    def to_response(self) -> InventoryResponse:
        return InventoryResponse(
            product_id=self.product_id,
            available_quantity=self.available_quantity,
            production_capacity=self.production_capacity,
            unit=self.unit,
            updated_at=self.updated_at,
        )


@dataclass
class QuoteRecord:
    id: UUID
    request: QuoteCreateRequest
    status: str = "pending"
    created_at: datetime = field(default_factory=utc_now)

    def to_response(self) -> QuoteResponse:
        return QuoteResponse(
            id=self.id,
            buyer_id=self.request.buyer_id,
            product_id=self.request.product_id,
            quantity=self.request.quantity,
            budget_per_unit=self.request.budget_per_unit,
            total_budget=self.request.total_budget,
            requirement_text=self.request.requirement_text,
            status=self.status,
            created_at=self.created_at,
        )


class ProductRepository(Protocol):
    """Small persistence boundary; a PostgreSQL adapter can implement this API."""

    def create_product(self, request: ProductCreateRequest) -> ProductResponse: ...
    def get_product(self, product_id: UUID) -> ProductResponse | None: ...
    def list_products(
        self,
        *,
        category: str | None = None,
        artisan_id: UUID | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[ProductResponse], int]: ...
    def update_inventory(
        self, product_id: UUID, request: InventoryUpdateRequest
    ) -> InventoryResponse | None: ...
    def get_inventory(self, product_id: UUID) -> InventoryResponse: ...
    def get_artisan(self, artisan_id: UUID) -> ArtisanProfileResponse | None: ...
    def list_artisan_products(self, artisan_id: UUID) -> list[ProductResponse]: ...
    def create_quote(self, request: QuoteCreateRequest) -> QuoteResponse: ...
    def get_quote(self, quote_id: UUID) -> QuoteRecord | None: ...
    def save_quote_matches(self, quote_id: UUID, matches: list[dict]) -> None: ...
    def update_product_image(self, product_id: UUID, image_url: str) -> ProductResponse | None: ...
    def save_embedding(
        self, product_id: UUID, embedding: list[float], model: str, source_text: str
    ) -> None: ...
    def semantic_search(
        self, embedding: list[float], limit: int = 50
    ) -> list[tuple[UUID, float]]: ...
    def save_price_observations(self, observations: list[PriceObservation]) -> None: ...


class RepositoryError(RuntimeError):
    """Raised when the configured persistence provider cannot complete a request."""


class InMemoryRepository:
    """Deterministic local adapter for the MVP and contract tests.

    The interface mirrors the documented PostgreSQL tables.  Production can
    replace this adapter without changing route or service code.
    """

    def __init__(self) -> None:
        self.products: dict[UUID, ProductResponse] = {}
        self.inventory: dict[UUID, InventoryRecord] = {}
        self.artisans: dict[UUID, ArtisanProfileResponse] = {}
        self.quotes: dict[UUID, QuoteRecord] = {}
        self.quote_matches: dict[UUID, list[dict]] = {}
        self.embeddings: dict[UUID, tuple[list[float], str, str, datetime]] = {}
        self.market_observations: list[PriceObservation] = []

    def _ensure_artisan(self, artisan_id: UUID) -> None:
        if artisan_id not in self.artisans:
            self.artisans[artisan_id] = ArtisanProfileResponse(
                id=artisan_id,
                business_name=f"Artisan {str(artisan_id)[:8]}",
            )

    def create_product(self, request: ProductCreateRequest) -> ProductResponse:
        now = utc_now()
        product = ProductResponse(
            **request.model_dump(),
            id=uuid4(),
            created_at=now,
            updated_at=now,
        )
        self.products[product.id] = product
        self.inventory[product.id] = InventoryRecord(product_id=product.id)
        self._ensure_artisan(product.artisan_id)
        return product

    def get_product(self, product_id: UUID) -> ProductResponse | None:
        return self.products.get(product_id)

    def list_products(
        self,
        *,
        category: str | None = None,
        artisan_id: UUID | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[ProductResponse], int]:
        records = list(self.products.values())
        if category is not None:
            records = [p for p in records if p.category.lower() == category.lower()]
        if artisan_id is not None:
            records = [p for p in records if p.artisan_id == artisan_id]
        if min_price is not None:
            records = [p for p in records if p.price >= min_price]
        if max_price is not None:
            records = [p for p in records if p.price <= max_price]
        if status is not None:
            records = [p for p in records if p.status == status]
        total = len(records)
        return records[offset : offset + limit], total

    def update_inventory(
        self, product_id: UUID, request: InventoryUpdateRequest
    ) -> InventoryResponse | None:
        if product_id not in self.products:
            return None
        record = self.inventory.setdefault(product_id, InventoryRecord(product_id))
        record.available_quantity = request.available_quantity
        record.production_capacity = request.production_capacity
        record.unit = request.unit
        record.updated_at = utc_now()
        return record.to_response()

    def get_inventory(self, product_id: UUID) -> InventoryResponse:
        return self.inventory.setdefault(
            product_id, InventoryRecord(product_id=product_id)
        ).to_response()

    def get_artisan(self, artisan_id: UUID) -> ArtisanProfileResponse | None:
        return self.artisans.get(artisan_id)

    def list_artisan_products(self, artisan_id: UUID) -> list[ProductResponse]:
        return [p for p in self.products.values() if p.artisan_id == artisan_id]

    def create_quote(self, request: QuoteCreateRequest) -> QuoteResponse:
        record = QuoteRecord(id=uuid4(), request=request)
        self.quotes[record.id] = record
        return record.to_response()

    def get_quote(self, quote_id: UUID) -> QuoteRecord | None:
        return self.quotes.get(quote_id)

    def save_quote_matches(self, quote_id: UUID, matches: list[dict]) -> None:
        self.quote_matches[quote_id] = matches
        quote = self.quotes.get(quote_id)
        if quote and matches:
            quote.status = "responded"

    def update_product_image(
        self, product_id: UUID, image_url: str
    ) -> ProductResponse | None:
        product = self.products.get(product_id)
        if product is None:
            return None
        updated = product.model_copy(
            update={"image_url": image_url, "updated_at": utc_now()}
        )
        self.products[product_id] = updated
        return updated

    def save_embedding(
        self, product_id: UUID, embedding: list[float], model: str, source_text: str
    ) -> None:
        self.embeddings[product_id] = (embedding, model, source_text, utc_now())

    def semantic_search(
        self, embedding: list[float], limit: int = 50
    ) -> list[tuple[UUID, float]]:
        def cosine(left: list[float], right: list[float]) -> float:
            denominator = math.sqrt(sum(value * value for value in left)) * math.sqrt(
                sum(value * value for value in right)
            )
            return sum(a * b for a, b in zip(left, right)) / denominator if denominator else 0

        ranked = [
            (product_id, max(0.0, min(1.0, (cosine(vector, embedding) + 1) / 2)))
            for product_id, (vector, _, _, _) in self.embeddings.items()
            if product_id in self.products and self.products[product_id].status == "published"
        ]
        return sorted(ranked, key=lambda item: item[1], reverse=True)[:limit]

    def save_price_observations(self, observations: list[PriceObservation]) -> None:
        self.market_observations.extend(observations)


class SupabaseRepository:
    """Supabase REST adapter for the documented PostgreSQL tables.

    The adapter intentionally speaks the PostgREST API instead of leaking a
    Supabase client into route code.  It can be selected by configuration in
    ``app.main`` and falls back to the in-memory adapter for local contract
    tests when Supabase is not configured.
    """

    def __init__(
        self,
        url: str,
        key: str,
        *,
        timeout: float = 10.0,
        client: httpx.Client | None = None,
    ) -> None:
        self._client = client or httpx.Client(
            base_url=f"{url.rstrip('/')}/rest/v1",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )

    def _request(
        self,
        method: str,
        table: str,
        *,
        params: dict[str, str] | None = None,
        payload: dict | list | None = None,
        prefer: str = "return=representation",
    ) -> list[dict]:
        try:
            response = self._client.request(
                method,
                f"/{table}",
                params=params,
                json=payload,
                headers={"Prefer": prefer},
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise RepositoryError("Database request failed.") from exc
        data = response.json() if response.content else []
        if not isinstance(data, list):
            return [data]
        return data

    @staticmethod
    def _product(row: dict) -> ProductResponse:
        return ProductResponse.model_validate(row)

    def create_product(self, request: ProductCreateRequest) -> ProductResponse:
        rows = self._request(
            "POST",
            "products",
            payload=request.model_dump(mode="json"),
        )
        if not rows:
            raise RepositoryError("Database did not return the created product.")
        return self._product(rows[0])

    def get_product(self, product_id: UUID) -> ProductResponse | None:
        rows = self._request(
            "GET",
            "products",
            params={"id": f"eq.{product_id}", "limit": "1"},
        )
        return self._product(rows[0]) if rows else None

    def list_products(
        self,
        *,
        category: str | None = None,
        artisan_id: UUID | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[ProductResponse], int]:
        params = {
            "select": "*",
            "order": "created_at.desc",
            "limit": str(limit),
            "offset": str(offset),
        }
        if category is not None:
            params["category"] = f"eq.{category}"
        if artisan_id is not None:
            params["artisan_id"] = f"eq.{artisan_id}"
        if min_price is not None:
            params["price"] = f"gte.{min_price}"
        if max_price is not None:
            params["price"] = f"lte.{max_price}"
        if status is not None:
            params["status"] = f"eq.{status}"
        rows = self._request("GET", "products", params=params)
        products = [self._product(row) for row in rows]
        # PostgREST returns a content-range when count=exact is requested. The
        # fallback is correct for adapters/tests that do not provide it.
        return products, offset + len(products)

    def update_inventory(
        self, product_id: UUID, request: InventoryUpdateRequest
    ) -> InventoryResponse | None:
        if self.get_product(product_id) is None:
            return None
        rows = self._request(
            "POST",
            "inventory",
            params={"product_id": f"eq.{product_id}"},
            payload=request.model_dump(),
            prefer="resolution=merge-duplicates,return=representation",
        )
        if not rows:
            raise RepositoryError("Database did not return updated inventory.")
        return InventoryResponse.model_validate(rows[0] | {"product_id": product_id})

    def get_inventory(self, product_id: UUID) -> InventoryResponse:
        rows = self._request(
            "GET",
            "inventory",
            params={"product_id": f"eq.{product_id}", "limit": "1"},
        )
        if rows:
            return InventoryResponse.model_validate(rows[0] | {"product_id": product_id})
        return InventoryResponse(
            product_id=product_id,
            available_quantity=0,
            production_capacity=0,
            unit="piece",
            updated_at=utc_now(),
        )

    def get_artisan(self, artisan_id: UUID) -> ArtisanProfileResponse | None:
        rows = self._request(
            "GET",
            "artisans",
            params={"id": f"eq.{artisan_id}", "limit": "1"},
        )
        return ArtisanProfileResponse.model_validate(rows[0]) if rows else None

    def list_artisan_products(self, artisan_id: UUID) -> list[ProductResponse]:
        rows, _ = self.list_products(artisan_id=artisan_id, limit=1000)
        return rows

    def create_quote(self, request: QuoteCreateRequest) -> QuoteResponse:
        rows = self._request(
            "POST",
            "quote_requests",
            payload=request.model_dump(mode="json"),
        )
        if not rows:
            raise RepositoryError("Database did not return the created quote.")
        return QuoteResponse.model_validate(rows[0])

    def get_quote(self, quote_id: UUID) -> QuoteRecord | None:
        rows = self._request(
            "GET",
            "quote_requests",
            params={"id": f"eq.{quote_id}", "limit": "1"},
        )
        if not rows:
            return None
        row = rows[0]
        request = QuoteCreateRequest.model_validate(
            {
                "buyer_id": row["buyer_id"],
                "product_id": row.get("product_id"),
                "quantity": row["quantity"],
                "budget_per_unit": row.get("budget_per_unit"),
                "total_budget": row.get("total_budget"),
                "requirement_text": row["requirement_text"],
            }
        )
        response = QuoteResponse.model_validate(row)
        return QuoteRecord(
            id=quote_id,
            request=request,
            status=response.status,
            created_at=response.created_at,
        )

    def save_quote_matches(self, quote_id: UUID, matches: list[dict]) -> None:
        for match in matches:
            self._request(
                "POST",
                "quote_request_artisans",
                payload={
                    "quote_request_id": str(quote_id),
                    "artisan_id": str(match["artisan_id"]),
                    "product_id": str(match["product_id"]),
                    "matched_quantity": match["matched_quantity"],
                    "match_score": match["match_score"],
                    "status": "matched",
                },
            )

    def update_product_image(
        self, product_id: UUID, image_url: str
    ) -> ProductResponse | None:
        rows = self._request(
            "PATCH",
            "products",
            params={"id": f"eq.{product_id}"},
            payload={"image_url": image_url, "updated_at": utc_now().isoformat()},
        )
        return self._product(rows[0]) if rows else None

    def save_embedding(
        self, product_id: UUID, embedding: list[float], model: str, source_text: str
    ) -> None:
        self._request(
            "POST",
            "product_embeddings",
            payload={
                "product_id": str(product_id),
                "embedding": embedding,
                "embedding_model": model,
                "source_text": source_text,
            },
            prefer="resolution=merge-duplicates,return=representation",
        )

    def semantic_search(
        self, embedding: list[float], limit: int = 50
    ) -> list[tuple[UUID, float]]:
        try:
            rows = self._request(
                "POST",
                "rpc/match_products",
                payload={
                    "query_embedding": embedding,
                    "match_threshold": 0.0,
                    "match_count": limit,
                },
            )
        except RepositoryError:
            return []
        matches: list[tuple[UUID, float]] = []
        for row in rows:
            product_id = row.get("product_id") or row.get("id")
            score = row.get("match_score") or row.get("similarity")
            if product_id is not None and score is not None:
                matches.append((UUID(str(product_id)), float(score)))
        return matches

    def save_price_observations(self, observations: list[PriceObservation]) -> None:
        for observation in observations:
            self._request(
                "POST",
                "market_price_observations",
                payload={
                    **observation.model_dump(),
                    "created_at": utc_now().isoformat(),
                },
            )