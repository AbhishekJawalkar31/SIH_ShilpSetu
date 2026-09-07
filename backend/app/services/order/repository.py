from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg.rows import dict_row

from app.db.connection import DatabasePoolManager, get_pool_manager
from app.db.exceptions import DatabaseError, DatabaseQueryError
from app.schemas.order import (
    OrderItemResponse,
    OrderListResponse,
    OrderResponse,
    QuoteAcceptResponse,
)


class OrderError(DatabaseError):
    """Base exception for order processing."""


class QuoteNotFoundError(OrderError):
    """Raised when quote request does not exist."""


class QuoteAlreadyAcceptedError(OrderError):
    """Raised when quote request is already accepted or in an unacceptable state."""


class OrderAlreadyExistsError(OrderError):
    """Raised when an order has already been created for this quote."""


class NoAcceptableAllocationError(OrderError):
    """Raised when quote has no matched artisan allocations to fulfill."""


class InsufficientInventoryError(OrderError):
    """Raised when allocated product stock is insufficient."""


class OrderNotFoundError(OrderError):
    """Raised when an order is not found by ID."""


class OrderRepository:
    """Repository managing orders, order items, inventory commitment, and transactional quote acceptance."""

    def __init__(self, pool_manager: DatabasePoolManager | None = None) -> None:
        self._pool_manager = pool_manager or get_pool_manager()

    async def accept_quote_and_create_order(
        self,
        quote_id: UUID,
        expected_buyer_id: UUID | None = None,
    ) -> QuoteAcceptResponse:
        """
        Execute full atomic conversion of an accepted quote to order:
        1. Lock quote_requests row FOR UPDATE
        2. Validate quote exists and is not already accepted/closed
        3. Validate buyer ownership if expected_buyer_id is provided
        4. Verify no existing order linked to quote_request_id
        5. Fetch allocations for the quote (must have >= 1 allocation)
        6. For each allocation, deduct inventory atomically if product_id is associated
        7. Insert order record
        8. Insert order_items records for each allocation
        9. Update quote_requests.status to 'accepted'
        10. Update quote_request_artisans.status to 'accepted'
        11. Create buyer notification ('order_created')
        12. Create artisan notifications ('quote_accepted')
        13. Return QuoteAcceptResponse
        All steps occur inside a single atomic database transaction.
        """
        fetch_quote_query = """
            SELECT 
                id,
                buyer_id,
                product_id,
                quantity,
                budget_per_unit,
                total_budget,
                requirement_text,
                status
            FROM quote_requests
            WHERE id = %(quote_id)s
            FOR UPDATE;
        """

        check_existing_order_query = """
            SELECT id FROM orders WHERE quote_request_id = %(quote_id)s;
        """

        fetch_allocations_query = """
            SELECT 
                qra.id,
                qra.quote_request_id,
                qra.artisan_id,
                qra.matched_quantity,
                qra.match_score,
                qra.status,
                a.user_id AS artisan_user_id,
                a.business_name AS artisan_business_name,
                p.id AS product_id,
                p.title AS product_title,
                p.price AS product_price
            FROM quote_request_artisans qra
            JOIN artisans a ON qra.artisan_id = a.id
            LEFT JOIN products p ON p.artisan_id = a.id AND p.status = 'published'
            WHERE qra.quote_request_id = %(quote_id)s
            ORDER BY qra.matched_quantity DESC;
        """

        check_and_deduct_inventory_query = """
            UPDATE inventory
            SET available_quantity = available_quantity - %(quantity)s,
                updated_at = CURRENT_TIMESTAMP
            WHERE product_id = %(product_id)s AND available_quantity >= %(quantity)s
            RETURNING available_quantity;
        """

        insert_order_query = """
            INSERT INTO orders (
                buyer_id,
                artisan_id,
                product_id,
                quote_request_id,
                quantity,
                unit_price,
                total_price,
                status
            ) VALUES (
                %(buyer_id)s,
                %(artisan_id)s,
                %(product_id)s,
                %(quote_request_id)s,
                %(quantity)s,
                %(unit_price)s,
                %(total_price)s,
                'confirmed'
            ) RETURNING 
                id,
                buyer_id,
                artisan_id,
                product_id,
                quote_request_id,
                quantity,
                unit_price,
                total_price,
                status,
                created_at,
                updated_at;
        """

        insert_order_item_query = """
            INSERT INTO order_items (
                order_id,
                artisan_id,
                product_id,
                quantity,
                unit_price,
                total_price
            ) VALUES (
                %(order_id)s,
                %(artisan_id)s,
                %(product_id)s,
                %(quantity)s,
                %(unit_price)s,
                %(total_price)s
            ) RETURNING 
                id,
                order_id,
                artisan_id,
                product_id,
                quantity,
                unit_price,
                total_price,
                created_at;
        """

        update_quote_status_query = """
            UPDATE quote_requests
            SET status = 'accepted',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %(quote_id)s;
        """

        update_allocations_status_query = """
            UPDATE quote_request_artisans
            SET status = 'accepted'
            WHERE quote_request_id = %(quote_id)s;
        """

        insert_notification_query = """
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                reference_type,
                reference_id
            ) VALUES (
                %(user_id)s,
                %(type)s,
                %(title)s,
                %(message)s,
                %(reference_type)s,
                %(reference_id)s
            );
        """

        try:
            async with self._pool_manager.connection() as conn:
                async with conn.transaction():
                    async with conn.cursor(row_factory=dict_row) as cursor:
                        # 1. Fetch & lock quote
                        await cursor.execute(fetch_quote_query, {"quote_id": quote_id})
                        quote_row = await cursor.fetchone()
                        if quote_row is None:
                            raise QuoteNotFoundError(f"Quote {quote_id} not found.")

                        if quote_row["status"] == "accepted":
                            raise QuoteAlreadyAcceptedError(f"Quote {quote_id} has already been accepted.")
                        if quote_row["status"] in ("rejected", "closed"):
                            raise QuoteAlreadyAcceptedError(f"Quote {quote_id} is in '{quote_row['status']}' state and cannot be accepted.")

                        # Validate ownership
                        if expected_buyer_id is not None and quote_row["buyer_id"] != expected_buyer_id:
                            raise QuoteNotFoundError(f"Quote {quote_id} not found or you do not have permission to accept it.")

                        # 2. Check for duplicate order
                        await cursor.execute(check_existing_order_query, {"quote_id": quote_id})
                        existing_order = await cursor.fetchone()
                        if existing_order is not None:
                            raise OrderAlreadyExistsError(f"An order already exists for quote {quote_id}.")

                        # 3. Fetch allocations
                        await cursor.execute(fetch_allocations_query, {"quote_id": quote_id})
                        alloc_rows = await cursor.fetchall()
                        if not alloc_rows:
                            raise NoAcceptableAllocationError(f"Quote {quote_id} has no matched artisan allocations.")

                        # De-duplicate allocations by artisan_id in case multiple products matched
                        seen_artisans = set()
                        filtered_allocs = []
                        for row in alloc_rows:
                            if row["artisan_id"] not in seen_artisans:
                                seen_artisans.add(row["artisan_id"])
                                filtered_allocs.append(row)

                        # Determine pricing
                        unit_price = float(quote_row["budget_per_unit"] or 0.0)
                        total_quantity = int(quote_row["quantity"])
                        total_price = float(quote_row["total_budget"] or (unit_price * total_quantity))

                        # 4. Check & deduct inventory if product_id is linked to the quote
                        if quote_row["product_id"]:
                            await cursor.execute(
                                check_and_deduct_inventory_query,
                                {"product_id": quote_row["product_id"], "quantity": total_quantity},
                            )
                            deducted_row = await cursor.fetchone()
                            if deducted_row is None:
                                raise InsufficientInventoryError(
                                    f"Insufficient available inventory for product {quote_row['product_id']} to fulfill quantity {total_quantity}."
                                )

                        # 5. Insert order
                        # If single artisan allocation, set artisan_id; else multi-artisan (None)
                        primary_artisan_id = filtered_allocs[0]["artisan_id"] if len(filtered_allocs) == 1 else None
                        order_params = {
                            "buyer_id": quote_row["buyer_id"],
                            "artisan_id": primary_artisan_id,
                            "product_id": quote_row["product_id"],
                            "quote_request_id": quote_id,
                            "quantity": total_quantity,
                            "unit_price": unit_price,
                            "total_price": total_price,
                        }
                        await cursor.execute(insert_order_query, order_params)
                        order_row = await cursor.fetchone()
                        if order_row is None:
                            raise DatabaseQueryError("Failed to insert order record.")

                        new_order_id = order_row["id"]
                        order_items: list[OrderItemResponse] = []

                        # 6. Insert order items for each allocated artisan
                        for alloc in filtered_allocs:
                            alloc_qty = int(alloc["matched_quantity"] or 0)
                            if alloc_qty <= 0:
                                continue
                            item_total = alloc_qty * unit_price
                            item_params = {
                                "order_id": new_order_id,
                                "artisan_id": alloc["artisan_id"],
                                "product_id": alloc.get("product_id") or quote_row["product_id"],
                                "quantity": alloc_qty,
                                "unit_price": unit_price,
                                "total_price": item_total,
                            }
                            await cursor.execute(insert_order_item_query, item_params)
                            item_row = await cursor.fetchone()
                            if item_row is None:
                                raise DatabaseQueryError("Failed to insert order item.")

                            item_dict = dict(item_row)
                            item_dict["artisan_business_name"] = alloc.get("artisan_business_name")
                            item_dict["product_title"] = alloc.get("product_title")
                            order_items.append(OrderItemResponse.model_validate(item_dict))

                        # 7. Update quote status & allocations status
                        await cursor.execute(update_quote_status_query, {"quote_id": quote_id})
                        await cursor.execute(update_allocations_status_query, {"quote_id": quote_id})

                        # 8. Create buyer notification
                        buyer_notif_params = {
                            "user_id": quote_row["buyer_id"],
                            "type": "order_created",
                            "title": "Order Created Successfully",
                            "message": f"Your order for {total_quantity} units has been confirmed.",
                            "reference_type": "order",
                            "reference_id": new_order_id,
                        }
                        await cursor.execute(insert_notification_query, buyer_notif_params)

                        # 9. Create artisan notifications
                        for alloc in filtered_allocs:
                            artisan_user_id = alloc.get("artisan_user_id")
                            alloc_qty = int(alloc["matched_quantity"] or 0)
                            if artisan_user_id:
                                artisan_notif_params = {
                                    "user_id": artisan_user_id,
                                    "type": "quote_accepted",
                                    "title": "Quote Accepted & Order Received",
                                    "message": f"A quote has been accepted! You have been allocated {alloc_qty} units for Order {new_order_id}.",
                                    "reference_type": "order",
                                    "reference_id": new_order_id,
                                }
                                await cursor.execute(insert_notification_query, artisan_notif_params)

                        order_dict = dict(order_row)
                        order_dict["items"] = order_items
                        return QuoteAcceptResponse(
                            order=OrderResponse.model_validate(order_dict),
                            quote_id=quote_id,
                            message="Quote successfully accepted and converted to order.",
                        )
        except (QuoteNotFoundError, QuoteAlreadyAcceptedError, OrderAlreadyExistsError, NoAcceptableAllocationError, InsufficientInventoryError):
            raise
        except DatabaseError:
            raise
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to accept quote {quote_id}: {exc}") from exc

    async def get_order_by_id(self, order_id: UUID) -> OrderResponse | None:
        """Fetch order with its line items."""
        fetch_order_query = """
            SELECT 
                id,
                buyer_id,
                artisan_id,
                product_id,
                quote_request_id,
                quantity,
                unit_price,
                total_price,
                status,
                created_at,
                updated_at
            FROM orders
            WHERE id = %(order_id)s;
        """

        fetch_items_query = """
            SELECT 
                oi.id,
                oi.order_id,
                oi.artisan_id,
                oi.product_id,
                oi.quantity,
                oi.unit_price,
                oi.total_price,
                oi.created_at,
                a.business_name AS artisan_business_name,
                p.title AS product_title
            FROM order_items oi
            JOIN artisans a ON oi.artisan_id = a.id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = %(order_id)s
            ORDER BY oi.quantity DESC;
        """

        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(fetch_order_query, {"order_id": order_id})
                    order_row = await cursor.fetchone()
                    if order_row is None:
                        return None

                    await cursor.execute(fetch_items_query, {"order_id": order_id})
                    item_rows = await cursor.fetchall()

                    order_dict = dict(order_row)
                    order_dict["items"] = [OrderItemResponse.model_validate(row) for row in item_rows]
                    return OrderResponse.model_validate(order_dict)
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to fetch order {order_id}: {exc}") from exc

    async def list_orders(
        self,
        buyer_id: UUID | None = None,
        artisan_id: UUID | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> OrderListResponse:
        """List orders with filtering and pagination."""
        filters: list[str] = []
        params: dict[str, Any] = {
            "limit": limit,
            "offset": offset,
        }

        if buyer_id is not None:
            filters.append("o.buyer_id = %(buyer_id)s")
            params["buyer_id"] = buyer_id
        if artisan_id is not None:
            # Matches direct single-artisan order OR multi-artisan order items
            filters.append("(o.artisan_id = %(artisan_id)s OR EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.artisan_id = %(artisan_id)s))")
            params["artisan_id"] = artisan_id
        if status is not None:
            filters.append("o.status = %(status)s")
            params["status"] = status

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

        count_query = f"SELECT COUNT(*) FROM orders o {where_clause};"

        data_query = f"""
            SELECT 
                o.id,
                o.buyer_id,
                o.artisan_id,
                o.product_id,
                o.quote_request_id,
                o.quantity,
                o.unit_price,
                o.total_price,
                o.status,
                o.created_at,
                o.updated_at
            FROM orders o
            {where_clause}
            ORDER BY o.created_at DESC
            LIMIT %(limit)s OFFSET %(offset)s;
        """

        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(count_query, params)
                    count_row = await cursor.fetchone()
                    total = count_row["count"] if count_row and "count" in count_row else 0

                    await cursor.execute(data_query, params)
                    order_rows = await cursor.fetchall()
                    if not order_rows:
                        return OrderListResponse(items=[], total=total, limit=limit, offset=offset)

                    order_ids = [row["id"] for row in order_rows]

                    # Batch query order items to avoid N+1 queries
                    items_query = """
                        SELECT 
                            oi.id,
                            oi.order_id,
                            oi.artisan_id,
                            oi.product_id,
                            oi.quantity,
                            oi.unit_price,
                            oi.total_price,
                            oi.created_at,
                            a.business_name AS artisan_business_name,
                            p.title AS product_title
                        FROM order_items oi
                        JOIN artisans a ON oi.artisan_id = a.id
                        LEFT JOIN products p ON oi.product_id = p.id
                        WHERE oi.order_id = ANY(%(order_ids)s)
                        ORDER BY oi.quantity DESC;
                    """
                    await cursor.execute(items_query, {"order_ids": order_ids})
                    item_rows = await cursor.fetchall()

                    items_by_order: dict[UUID, list[OrderItemResponse]] = {}
                    for item in item_rows:
                        items_by_order.setdefault(item["order_id"], []).append(
                            OrderItemResponse.model_validate(item)
                        )

                    orders: list[OrderResponse] = []
                    for row in order_rows:
                        order_dict = dict(row)
                        order_dict["items"] = items_by_order.get(row["id"], [])
                        orders.append(OrderResponse.model_validate(order_dict))

                    return OrderListResponse(
                        items=orders,
                        total=total,
                        limit=limit,
                        offset=offset,
                    )
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to list orders: {exc}") from exc

    async def get_order_items(self, order_id: UUID) -> list[OrderItemResponse]:
        """Fetch all items belonging to a specific order."""
        query = """
            SELECT 
                oi.id,
                oi.order_id,
                oi.artisan_id,
                oi.product_id,
                oi.quantity,
                oi.unit_price,
                oi.total_price,
                oi.created_at,
                a.business_name AS artisan_business_name,
                p.title AS product_title
            FROM order_items oi
            JOIN artisans a ON oi.artisan_id = a.id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = %(order_id)s
            ORDER BY oi.quantity DESC;
        """
        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(query, {"order_id": order_id})
                    rows = await cursor.fetchall()
                    return [OrderItemResponse.model_validate(row) for row in rows]
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to fetch order items for order {order_id}: {exc}") from exc
