from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.order import (
    DirectOrderCreateRequest,
    OrderItemResponse,
    OrderListResponse,
    OrderResponse,
    QuoteAcceptResponse,
)
from app.services.order.repository import (
    InsufficientInventoryError,
    InvalidOrderItemsError,
    NoAcceptableAllocationError,
    OrderAlreadyExistsError,
    ProductNotFoundError,
    QuoteAlreadyAcceptedError,
    QuoteNotFoundError,
)
from app.services.order.service import OrderService

from app.core.dependencies import get_current_user, get_current_user_optional
from app.schemas.auth import AuthUser

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Orders"])
_service = OrderService()


@router.post(
    "/quotes/{quote_id}/accept",
    response_model=QuoteAcceptResponse,
    status_code=status.HTTP_200_OK,
    summary="Accept an existing quote request and convert it to an order",
)
async def accept_quote(
    quote_id: UUID,
    current_user: AuthUser | None = Depends(get_current_user_optional),
) -> QuoteAcceptResponse:
    """
    Accept a quote request and convert it to an order:
    - Atomically creates order and order items for matched artisan allocations
    - Transitions quote and allocation statuses to 'accepted'
    - Updates inventory safely if linked to committed stock
    - Generates in-app notifications for buyer and artisans
    - Enforces duplicate prevention and buyer ownership
    """
    expected_buyer_id = current_user.id if (current_user is not None and current_user.role != "admin") else None

    try:
        return await _service.accept_quote(quote_id, expected_buyer_id=expected_buyer_id)
    except QuoteNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "QUOTE_NOT_FOUND", "message": str(exc)},
        ) from exc
    except QuoteAlreadyAcceptedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "QUOTE_ALREADY_ACCEPTED", "message": str(exc)},
        ) from exc
    except OrderAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ORDER_ALREADY_EXISTS", "message": str(exc)},
        ) from exc
    except NoAcceptableAllocationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "NO_ACCEPTABLE_ALLOCATION", "message": str(exc)},
        ) from exc
    except InsufficientInventoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "INVENTORY_INSUFFICIENT", "message": str(exc)},
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error accepting quote %s: %s", quote_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred while accepting the quote."},
        ) from exc


@router.post(
    "/orders/direct",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a direct customer D2C order from cart items",
)
async def create_direct_order(
    body: DirectOrderCreateRequest,
    current_user: AuthUser = Depends(get_current_user),
) -> OrderResponse:
    """
    Create a direct customer order from cart items:
    - Requires authenticated buyer or admin
    - Validates products exist and are published
    - Validates and transactionally decrements inventory
    - Computes real totals from product catalog prices
    - Creates order and order line items
    - Generates in-app notifications
    - Returns the created order in 'pending' status
    """
    if current_user.role not in ("buyer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "INSUFFICIENT_ROLE", "message": "Only buyers or administrators can place direct orders."},
        )

    item_tuples = [(item.product_id, item.quantity) for item in body.items]

    try:
        return await _service.create_direct_order(
            buyer_id=current_user.id,
            items=item_tuples,
            shipping_address=body.shipping_address,
            notes=body.notes,
        )
    except ProductNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PRODUCT_NOT_FOUND", "message": str(exc)},
        ) from exc
    except InsufficientInventoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "INVENTORY_INSUFFICIENT", "message": str(exc)},
        ) from exc
    except InvalidOrderItemsError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_ORDER_ITEMS", "message": str(exc)},
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error creating direct order: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred while placing the order."},
        ) from exc


@router.get(
    "/orders/{order_id}",
    response_model=OrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Fetch an order by ID including line items",
)
async def get_order(
    order_id: UUID,
    current_user: AuthUser | None = Depends(get_current_user_optional),
) -> OrderResponse:
    try:
        order = await _service.get_order(order_id)
        if order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "ORDER_NOT_FOUND", "message": f"Order {order_id} not found."},
            )

        # IDOR check: if authenticated non-admin user, must be buyer OR allocated artisan
        if current_user is not None and current_user.role != "admin":
            is_buyer = order.buyer_id == current_user.id
            is_artisan = (
                current_user.artisan_id is not None
                and (
                    order.artisan_id == current_user.artisan_id
                    or any(item.artisan_id == current_user.artisan_id for item in order.items)
                )
            )
            if not is_buyer and not is_artisan:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"code": "FORBIDDEN", "message": "You do not have permission to view this order."},
                )

        return order
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error fetching order %s: %s", order_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred while retrieving the order."},
        ) from exc


@router.get(
    "/orders",
    response_model=OrderListResponse,
    status_code=status.HTTP_200_OK,
    summary="List orders with optional buyer, artisan, and status filters",
)
async def list_orders(
    buyer_id: UUID | None = Query(None, description="Filter by buyer user ID"),
    artisan_id: UUID | None = Query(None, description="Filter by artisan ID"),
    status_filter: str | None = Query(None, alias="status", description="Filter by order status"),
    limit: int = Query(50, ge=1, le=100, description="Page limit (1-100)"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: AuthUser | None = Depends(get_current_user_optional),
) -> OrderListResponse:
    effective_buyer_id = buyer_id
    effective_artisan_id = artisan_id

    # IDOR scoping
    if current_user is not None and current_user.role != "admin":
        if current_user.role == "buyer":
            effective_buyer_id = current_user.id
            effective_artisan_id = None
        elif current_user.role == "artisan":
            effective_artisan_id = current_user.artisan_id
            effective_buyer_id = None

    try:
        return await _service.list_orders(
            buyer_id=effective_buyer_id,
            artisan_id=effective_artisan_id,
            status=status_filter,
            limit=limit,
            offset=offset,
        )
    except Exception as exc:
        logger.exception("Unexpected error listing orders: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred while listing orders."},
        ) from exc


@router.get(
    "/orders/{order_id}/items",
    response_model=list[OrderItemResponse],
    status_code=status.HTTP_200_OK,
    summary="Fetch line items for a specific order",
)
async def get_order_items(
    order_id: UUID,
    current_user: AuthUser | None = Depends(get_current_user_optional),
) -> list[OrderItemResponse]:
    try:
        if current_user is not None and current_user.role != "admin":
            order = await _service.get_order(order_id)
            if order is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"code": "ORDER_NOT_FOUND", "message": f"Order {order_id} not found."},
                )
            is_buyer = order.buyer_id == current_user.id
            is_artisan = (
                current_user.artisan_id is not None
                and (
                    order.artisan_id == current_user.artisan_id
                    or any(item.artisan_id == current_user.artisan_id for item in order.items)
                )
            )
            if not is_buyer and not is_artisan:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"code": "FORBIDDEN", "message": "You do not have permission to view this order's items."},
                )

        return await _service.get_order_items(order_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error fetching items for order %s: %s", order_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred while retrieving order items."},
        ) from exc
