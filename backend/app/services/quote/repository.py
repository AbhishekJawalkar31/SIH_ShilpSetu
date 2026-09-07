from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg.rows import dict_row

from app.db.connection import DatabasePoolManager, get_pool_manager
from app.db.exceptions import DatabaseError, DatabaseQueryError
from app.schemas.quote import (
    QuoteArtisanAllocation,
    QuoteCreateRequest,
    QuoteListResponse,
    QuoteResponse,
)


class BuyerNotFoundError(DatabaseError):
    """Raised when the specified buyer_id is not present in users table."""


class ProductNotFoundError(DatabaseError):
    """Raised when the specified product_id is not present in products table."""


class QuoteNotFoundError(DatabaseError):
    """Raised when a quote request ID does not exist."""


class QuoteRepository:
    """Repository managing quote requests and matched artisan allocations in PostgreSQL."""

    def __init__(self, pool_manager: DatabasePoolManager | None = None) -> None:
        self._pool_manager = pool_manager or get_pool_manager()

    async def create_quote_with_allocations(
        self,
        request: QuoteCreateRequest,
        allocations: list[dict[str, Any]],
    ) -> QuoteResponse:
        """
        Atomically create a quote request and its generated artisan allocations.
        Runs entirely in a single transaction.
        """
        check_buyer_query = "SELECT id, role FROM users WHERE id = %(buyer_id)s;"
        check_product_query = "SELECT id FROM products WHERE id = %(product_id)s;"

        insert_quote_query = """
            INSERT INTO quote_requests (
                buyer_id,
                product_id,
                quantity,
                budget_per_unit,
                total_budget,
                requirement_text,
                status
            ) VALUES (
                %(buyer_id)s,
                %(product_id)s,
                %(quantity)s,
                %(budget_per_unit)s,
                %(total_budget)s,
                %(requirement_text)s,
                'pending'
            ) RETURNING 
                id,
                buyer_id,
                product_id,
                quantity,
                budget_per_unit,
                total_budget,
                requirement_text,
                status,
                created_at,
                updated_at;
        """

        insert_allocation_query = """
            INSERT INTO quote_request_artisans (
                quote_request_id,
                artisan_id,
                matched_quantity,
                match_score,
                status
            ) VALUES (
                %(quote_request_id)s,
                %(artisan_id)s,
                %(matched_quantity)s,
                %(match_score)s,
                'matched'
            ) RETURNING 
                id,
                quote_request_id,
                artisan_id,
                matched_quantity,
                match_score,
                status,
                created_at;
        """

        calculated_total_budget = (
            request.total_budget
            if request.total_budget is not None
            else (request.budget_per_unit * request.quantity if request.budget_per_unit is not None else None)
        )

        try:
            async with self._pool_manager.connection() as conn:
                async with conn.transaction():
                    async with conn.cursor(row_factory=dict_row) as cursor:
                        # 1. Verify buyer exists
                        await cursor.execute(check_buyer_query, {"buyer_id": request.buyer_id})
                        buyer_row = await cursor.fetchone()
                        if buyer_row is None:
                            raise BuyerNotFoundError(f"Buyer {request.buyer_id} does not exist.")

                        # 2. Verify product if specified
                        if request.product_id is not None:
                            await cursor.execute(check_product_query, {"product_id": request.product_id})
                            product_row = await cursor.fetchone()
                            if product_row is None:
                                raise ProductNotFoundError(f"Product {request.product_id} does not exist.")

                        # 3. Insert quote request
                        quote_params = {
                            "buyer_id": request.buyer_id,
                            "product_id": request.product_id,
                            "quantity": request.quantity,
                            "budget_per_unit": request.budget_per_unit,
                            "total_budget": calculated_total_budget,
                            "requirement_text": request.requirement_text,
                        }
                        await cursor.execute(insert_quote_query, quote_params)
                        quote_row = await cursor.fetchone()
                        if quote_row is None:
                            raise DatabaseQueryError("Failed to insert quote request.")

                        new_quote_id = quote_row["id"]
                        saved_allocations: list[QuoteArtisanAllocation] = []

                        # 4. Insert each allocation
                        for alloc in allocations:
                            alloc_params = {
                                "quote_request_id": new_quote_id,
                                "artisan_id": alloc["artisan_id"],
                                "matched_quantity": alloc["matched_quantity"],
                                "match_score": alloc["match_score"],
                            }
                            await cursor.execute(insert_allocation_query, alloc_params)
                            alloc_row = await cursor.fetchone()
                            if alloc_row is None:
                                raise DatabaseQueryError("Failed to insert allocation record.")

                            # Attach metadata from the matching engine
                            alloc_dict = dict(alloc_row)
                            alloc_dict["business_name"] = alloc.get("business_name")
                            alloc_dict["product_id"] = alloc.get("product_id")
                            saved_allocations.append(QuoteArtisanAllocation.model_validate(alloc_dict))

                        result = dict(quote_row)
                        result["allocations"] = saved_allocations
                        return QuoteResponse.model_validate(result)
        except (BuyerNotFoundError, ProductNotFoundError):
            raise
        except DatabaseError:
            raise
        except Exception as exc:
            raise DatabaseQueryError(f"Transaction failed during quote creation: {exc}") from exc

    async def get_quote_by_id(self, quote_id: UUID) -> QuoteResponse | None:
        """Fetch quote request with its matched artisan allocations in single queries (no N+1)."""
        fetch_quote_query = """
            SELECT 
                id,
                buyer_id,
                product_id,
                quantity,
                budget_per_unit,
                total_budget,
                requirement_text,
                status,
                created_at,
                updated_at
            FROM quote_requests
            WHERE id = %(quote_id)s;
        """

        fetch_allocations_query = """
            SELECT 
                qra.id,
                qra.quote_request_id,
                qra.artisan_id,
                qra.matched_quantity,
                qra.match_score,
                qra.status,
                qra.created_at,
                a.business_name,
                a.city,
                a.state,
                u.name AS artisan_name
            FROM quote_request_artisans qra
            JOIN artisans a ON qra.artisan_id = a.id
            JOIN users u ON a.user_id = u.id
            WHERE qra.quote_request_id = %(quote_id)s
            ORDER BY qra.match_score DESC, qra.matched_quantity DESC;
        """

        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(fetch_quote_query, {"quote_id": quote_id})
                    quote_row = await cursor.fetchone()
                    if quote_row is None:
                        return None

                    await cursor.execute(fetch_allocations_query, {"quote_id": quote_id})
                    alloc_rows = await cursor.fetchall()

                    allocations = [QuoteArtisanAllocation.model_validate(row) for row in alloc_rows]
                    result = dict(quote_row)
                    result["allocations"] = allocations
                    return QuoteResponse.model_validate(result)
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to fetch quote request {quote_id}: {exc}") from exc

    async def list_quotes(
        self,
        buyer_id: UUID | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> QuoteListResponse:
        """List quote requests with optional buyer and status filtering, including allocations."""
        filters: list[str] = []
        params: dict[str, Any] = {
            "limit": limit,
            "offset": offset,
        }

        if buyer_id is not None:
            filters.append("qr.buyer_id = %(buyer_id)s")
            params["buyer_id"] = buyer_id
        if status is not None:
            filters.append("qr.status = %(status)s")
            params["status"] = status

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

        count_query = f"SELECT COUNT(*) FROM quote_requests qr {where_clause};"

        data_query = f"""
            SELECT 
                qr.id,
                qr.buyer_id,
                qr.product_id,
                qr.quantity,
                qr.budget_per_unit,
                qr.total_budget,
                qr.requirement_text,
                qr.status,
                qr.created_at,
                qr.updated_at
            FROM quote_requests qr
            {where_clause}
            ORDER BY qr.created_at DESC, qr.id ASC
            LIMIT %(limit)s OFFSET %(offset)s;
        """

        allocations_query = """
            SELECT 
                qra.id,
                qra.quote_request_id,
                qra.artisan_id,
                qra.matched_quantity,
                qra.match_score,
                qra.status,
                qra.created_at,
                a.business_name,
                a.city,
                a.state,
                u.name AS artisan_name
            FROM quote_request_artisans qra
            JOIN artisans a ON qra.artisan_id = a.id
            JOIN users u ON a.user_id = u.id
            WHERE qra.quote_request_id = ANY(%(quote_ids)s)
            ORDER BY qra.match_score DESC;
        """

        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    # 1. Count
                    await cursor.execute(count_query, params)
                    count_row = await cursor.fetchone()
                    total = count_row["count"] if count_row and "count" in count_row else 0

                    # 2. Quotes page
                    await cursor.execute(data_query, params)
                    quote_rows = await cursor.fetchall()
                    if not quote_rows:
                        return QuoteListResponse(quotes=[], total=total, limit=limit, offset=offset)

                    quote_ids = [row["id"] for row in quote_rows]

                    # 3. Batch fetch allocations in single query (avoids N+1)
                    await cursor.execute(allocations_query, {"quote_ids": quote_ids})
                    alloc_rows = await cursor.fetchall()

                    alloc_map: dict[UUID, list[QuoteArtisanAllocation]] = {qid: [] for qid in quote_ids}
                    for a_row in alloc_rows:
                        qid = a_row["quote_request_id"]
                        if qid in alloc_map:
                            alloc_map[qid].append(QuoteArtisanAllocation.model_validate(a_row))

                    quotes = []
                    for q_row in quote_rows:
                        qd = dict(q_row)
                        qd["allocations"] = alloc_map.get(qd["id"], [])
                        quotes.append(QuoteResponse.model_validate(qd))

                    return QuoteListResponse(
                        quotes=quotes,
                        total=total,
                        limit=limit,
                        offset=offset,
                    )
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to list quote requests: {exc}") from exc
