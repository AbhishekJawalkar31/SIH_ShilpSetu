from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg.rows import dict_row

from app.db.connection import DatabasePoolManager, get_pool_manager
from app.db.exceptions import DatabaseQueryError
from app.schemas.product import ProductListResponse, ProductResponse


class ProductRepository:
    """Repository for querying product and inventory records from PostgreSQL."""

    def __init__(self, pool_manager: DatabasePoolManager | None = None) -> None:
        self._pool_manager = pool_manager or get_pool_manager()

    async def get_product_by_id(self, product_id: UUID) -> ProductResponse | None:
        """Fetch a single product joined with its inventory data."""
        query = """
            SELECT 
                p.id,
                p.artisan_id,
                p.title,
                p.description,
                p.category,
                p.material,
                p.craft_type,
                p.tags,
                p.attributes,
                p.price,
                p.currency,
                p.image_url,
                p.status,
                COALESCE(i.available_quantity, 0) AS available_quantity,
                COALESCE(i.production_capacity, 0) AS production_capacity,
                COALESCE(i.unit, 'piece') AS unit,
                p.created_at,
                p.updated_at
            FROM products p
            LEFT JOIN inventory i ON i.product_id = p.id
            WHERE p.id = %(product_id)s;
        """
        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(query, {"product_id": product_id})
                    row = await cursor.fetchone()
                    if row is None:
                        return None
                    return ProductResponse.model_validate(row)
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to fetch product {product_id}: {exc}") from exc

    async def list_artisan_products(self, artisan_id: UUID) -> list[ProductResponse]:
        """Fetch all products for a specific artisan with inventory joined in a single query."""
        query = """
            SELECT 
                p.id,
                p.artisan_id,
                p.title,
                p.description,
                p.category,
                p.material,
                p.craft_type,
                p.tags,
                p.attributes,
                p.price,
                p.currency,
                p.image_url,
                p.status,
                COALESCE(i.available_quantity, 0) AS available_quantity,
                COALESCE(i.production_capacity, 0) AS production_capacity,
                COALESCE(i.unit, 'piece') AS unit,
                p.created_at,
                p.updated_at
            FROM products p
            LEFT JOIN inventory i ON i.product_id = p.id
            WHERE p.artisan_id = %(artisan_id)s
            ORDER BY p.created_at DESC, p.id ASC;
        """
        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(query, {"artisan_id": artisan_id})
                    rows = await cursor.fetchall()
                    return [ProductResponse.model_validate(row) for row in rows]
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to fetch products for artisan {artisan_id}: {exc}") from exc

    async def list_products(
        self,
        artisan_id: UUID | None = None,
        category: str | None = None,
        craft_type: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> ProductListResponse:
        """List products with optional filters, joined with inventory, using single/bounded queries."""
        filters: list[str] = []
        params: dict[str, Any] = {
            "limit": limit,
            "offset": offset,
        }

        if artisan_id is not None:
            filters.append("p.artisan_id = %(artisan_id)s")
            params["artisan_id"] = artisan_id
        if category is not None:
            filters.append("p.category = %(category)s")
            params["category"] = category
        if craft_type is not None:
            filters.append("p.craft_type = %(craft_type)s")
            params["craft_type"] = craft_type
        if status is not None:
            filters.append("p.status = %(status)s")
            params["status"] = status

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

        count_query = f"SELECT COUNT(*) FROM products p {where_clause};"

        data_query = f"""
            SELECT 
                p.id,
                p.artisan_id,
                p.title,
                p.description,
                p.category,
                p.material,
                p.craft_type,
                p.tags,
                p.attributes,
                p.price,
                p.currency,
                p.image_url,
                p.status,
                COALESCE(i.available_quantity, 0) AS available_quantity,
                COALESCE(i.production_capacity, 0) AS production_capacity,
                COALESCE(i.unit, 'piece') AS unit,
                p.created_at,
                p.updated_at
            FROM products p
            LEFT JOIN inventory i ON i.product_id = p.id
            {where_clause}
            ORDER BY p.created_at DESC, p.id ASC
            LIMIT %(limit)s OFFSET %(offset)s;
        """

        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(count_query, params)
                    count_row = await cursor.fetchone()
                    total = count_row["count"] if count_row and "count" in count_row else 0

                    await cursor.execute(data_query, params)
                    rows = await cursor.fetchall()
                    products = [ProductResponse.model_validate(row) for row in rows]

                    return ProductListResponse(
                        products=products,
                        total=total,
                        limit=limit,
                        offset=offset,
                    )
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to list products: {exc}") from exc
