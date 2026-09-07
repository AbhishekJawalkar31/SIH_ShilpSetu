from __future__ import annotations

import json
from uuid import UUID

from psycopg.rows import dict_row

from app.db.connection import DatabasePoolManager, get_pool_manager
from app.db.exceptions import DatabaseError, DatabaseQueryError
from app.schemas.product import ProductResponse
from app.schemas.product_write import InventoryUpdateRequest, ProductCreateRequest


class ArtisanNotFoundError(DatabaseError):
    """Raised when an artisan ID does not exist in the artisans table."""


class ProductNotFoundError(DatabaseError):
    """Raised when a product ID does not exist in the products table."""


class ProductWriteRepository:
    """Repository managing transactional product creation and inventory updates."""

    def __init__(self, pool_manager: DatabasePoolManager | None = None) -> None:
        self._pool_manager = pool_manager or get_pool_manager()

    async def create_product(self, request: ProductCreateRequest) -> ProductResponse:
        """
        Atomically create a product and its associated inventory record.

        Transaction steps:
        1. BEGIN
        2. Verify artisan exists (raise ArtisanNotFoundError if not found)
        3. INSERT INTO products RETURNING ...
        4. INSERT INTO inventory (product_id, available_quantity, production_capacity, unit)
        5. COMMIT
        On error: ROLLBACK
        """
        check_artisan_query = "SELECT id FROM artisans WHERE id = %(artisan_id)s;"

        insert_product_query = """
            INSERT INTO products (
                artisan_id,
                title,
                description,
                category,
                material,
                craft_type,
                tags,
                attributes,
                price,
                currency,
                image_url,
                status
            ) VALUES (
                %(artisan_id)s,
                %(title)s,
                %(description)s,
                %(category)s,
                %(material)s,
                %(craft_type)s,
                %(tags)s,
                %(attributes)s,
                %(price)s,
                %(currency)s,
                %(image_url)s,
                %(status)s
            ) RETURNING 
                id,
                artisan_id,
                title,
                description,
                category,
                material,
                craft_type,
                tags,
                attributes,
                price,
                currency,
                image_url,
                status,
                created_at,
                updated_at;
        """

        insert_inventory_query = """
            INSERT INTO inventory (
                product_id,
                available_quantity,
                production_capacity,
                unit
            ) VALUES (
                %(product_id)s,
                %(available_quantity)s,
                %(production_capacity)s,
                %(unit)s
            ) RETURNING 
                available_quantity,
                production_capacity,
                unit;
        """

        try:
            async with self._pool_manager.connection() as conn:
                async with conn.transaction():
                    async with conn.cursor(row_factory=dict_row) as cursor:
                        # 1. Verify artisan exists
                        await cursor.execute(check_artisan_query, {"artisan_id": request.artisan_id})
                        artisan_row = await cursor.fetchone()
                        if artisan_row is None:
                            raise ArtisanNotFoundError(f"Artisan {request.artisan_id} does not exist.")

                        # 2. Insert product
                        attributes_json = json.dumps(request.attributes) if request.attributes is not None else "{}"
                        product_params = {
                            "artisan_id": request.artisan_id,
                            "title": request.title,
                            "description": request.description,
                            "category": request.category,
                            "material": request.material,
                            "craft_type": request.craft_type,
                            "tags": request.tags,
                            "attributes": attributes_json,
                            "price": request.price,
                            "currency": request.currency,
                            "image_url": request.image_url,
                            "status": request.status,
                        }
                        await cursor.execute(insert_product_query, product_params)
                        product_row = await cursor.fetchone()
                        if product_row is None:
                            raise DatabaseQueryError("Failed to insert product record.")

                        new_product_id = product_row["id"]

                        # 3. Insert inventory
                        inventory_params = {
                            "product_id": new_product_id,
                            "available_quantity": request.available_quantity,
                            "production_capacity": request.production_capacity,
                            "unit": request.unit,
                        }
                        await cursor.execute(insert_inventory_query, inventory_params)
                        inventory_row = await cursor.fetchone()
                        if inventory_row is None:
                            raise DatabaseQueryError("Failed to insert inventory record.")

                        # Combine into ProductResponse shape
                        result = dict(product_row)
                        result["available_quantity"] = inventory_row["available_quantity"]
                        result["production_capacity"] = inventory_row["production_capacity"]
                        result["unit"] = inventory_row["unit"]

                        return ProductResponse.model_validate(result)
        except (ArtisanNotFoundError, ProductNotFoundError):
            raise
        except DatabaseError:
            raise
        except Exception as exc:
            raise DatabaseQueryError(f"Transaction failed during product creation: {exc}") from exc

    async def update_inventory(
        self,
        product_id: UUID,
        request: InventoryUpdateRequest,
        expected_artisan_id: UUID | None = None,
    ) -> ProductResponse:
        """
        Atomically update or insert inventory for an existing product.

        Transaction steps:
        1. BEGIN
        2. Verify product exists and matches expected_artisan_id if provided
        3. UPSERT INTO inventory
        4. SELECT joined product + inventory
        5. COMMIT
        On error: ROLLBACK
        """
        check_product_query = "SELECT id, artisan_id FROM products WHERE id = %(product_id)s;"

        upsert_inventory_query = """
            INSERT INTO inventory (
                product_id,
                available_quantity,
                production_capacity,
                unit
            ) VALUES (
                %(product_id)s,
                %(available_quantity)s,
                %(production_capacity)s,
                %(unit)s
            )
            ON CONFLICT (product_id) DO UPDATE SET
                available_quantity = EXCLUDED.available_quantity,
                production_capacity = EXCLUDED.production_capacity,
                unit = EXCLUDED.unit,
                updated_at = CURRENT_TIMESTAMP;
        """

        fetch_updated_product_query = """
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
                async with conn.transaction():
                    async with conn.cursor(row_factory=dict_row) as cursor:
                        # 1. Verify product exists
                        await cursor.execute(check_product_query, {"product_id": product_id})
                        product_check = await cursor.fetchone()
                        if product_check is None:
                            raise ProductNotFoundError(f"Product {product_id} was not found.")

                        if expected_artisan_id is not None and product_check["artisan_id"] != expected_artisan_id:
                            raise ProductNotFoundError(f"Product {product_id} was not found or access denied.")

                        # 2. Upsert inventory
                        inventory_params = {
                            "product_id": product_id,
                            "available_quantity": request.available_quantity,
                            "production_capacity": request.production_capacity,
                            "unit": request.unit,
                        }
                        await cursor.execute(upsert_inventory_query, inventory_params)

                        # 3. Retrieve updated product representation
                        await cursor.execute(fetch_updated_product_query, {"product_id": product_id})
                        updated_row = await cursor.fetchone()
                        if updated_row is None:
                            raise DatabaseQueryError(f"Could not retrieve updated product {product_id}.")

                        return ProductResponse.model_validate(updated_row)
        except (ArtisanNotFoundError, ProductNotFoundError):
            raise
        except DatabaseError:
            raise
        except Exception as exc:
            raise DatabaseQueryError(f"Transaction failed during inventory update: {exc}") from exc
