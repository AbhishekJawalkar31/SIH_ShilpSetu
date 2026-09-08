from __future__ import annotations

from uuid import UUID

from app.schemas.order import (
    OrderItemResponse,
    OrderListResponse,
    OrderResponse,
    QuoteAcceptResponse,
)
from app.services.order.repository import OrderRepository


class OrderService:
    """Service orchestrating order operations and quote conversion."""

    def __init__(self, repository: OrderRepository | None = None) -> None:
        self._repo = repository or OrderRepository()

    async def accept_quote(
        self,
        quote_id: UUID,
        expected_buyer_id: UUID | None = None,
    ) -> QuoteAcceptResponse:
        return await self._repo.accept_quote_and_create_order(
            quote_id=quote_id,
            expected_buyer_id=expected_buyer_id,
        )

    async def get_order(self, order_id: UUID) -> OrderResponse | None:
        return await self._repo.get_order_by_id(order_id=order_id)

    async def list_orders(
        self,
        buyer_id: UUID | None = None,
        artisan_id: UUID | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> OrderListResponse:
        return await self._repo.list_orders(
            buyer_id=buyer_id,
            artisan_id=artisan_id,
            status=status,
            limit=limit,
            offset=offset,
        )

    async def get_order_items(self, order_id: UUID) -> list[OrderItemResponse]:
        return await self._repo.get_order_items(order_id=order_id)

    async def create_direct_order(
        self,
        buyer_id: UUID,
        items: list[tuple[UUID, int]],
        shipping_address: str | None = None,
        notes: str | None = None,
    ) -> OrderResponse:
        return await self._repo.create_direct_order(
            buyer_id=buyer_id,
            items=items,
            shipping_address=shipping_address,
            notes=notes,
        )

