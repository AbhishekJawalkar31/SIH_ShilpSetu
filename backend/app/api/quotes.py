from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.db.exceptions import DatabaseError
from app.schemas.quote import (
    QuoteCreateRequest,
    QuoteListResponse,
    QuoteResponse,
)
from app.services.quote.repository import (
    BuyerNotFoundError,
    ProductNotFoundError,
)
from app.services.quote.service import (
    QuoteMatchingError,
    QuoteService,
)

router = APIRouter(prefix="/api/quotes", tags=["quotes"])


def get_quote_service() -> QuoteService:
    """Dependency provider for QuoteService."""
    return QuoteService()


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


from app.core.dependencies import get_current_user_optional
from app.schemas.auth import AuthUser


@router.post("", response_model=QuoteResponse, status_code=201)
async def create_quote(
    body: QuoteCreateRequest,
    service: QuoteService = Depends(get_quote_service),
    current_user: AuthUser | None = Depends(get_current_user_optional),
) -> QuoteResponse | JSONResponse:
    """Create a B2B quote request, automatically run multi-artisan matching, and persist allocations."""
    # IDOR protection: if authenticated as non-admin buyer, force buyer_id to current user
    if current_user is not None and current_user.role != "admin":
        if current_user.role != "buyer":
            return _error_response(403, "INSUFFICIENT_ROLE", "Only buyers or admins can create quote requests.")
        if body.buyer_id != current_user.id:
            return _error_response(403, "FORBIDDEN", "Cannot create quote request on behalf of another user.")

    try:
        return await service.create_quote(body)
    except BuyerNotFoundError:
        return _error_response(404, "BUYER_NOT_FOUND", "Buyer account was not found.")
    except ProductNotFoundError:
        return _error_response(404, "PRODUCT_NOT_FOUND", "Referenced product was not found.")
    except QuoteMatchingError as exc:
        return _error_response(500, "MATCHING_FAILED", f"Quote matching could not be completed: {exc}")
    except DatabaseError:
        return _error_response(500, "DATABASE_ERROR", "Failed to persist quote request.")
    except Exception:
        return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")


@router.get("", response_model=QuoteListResponse)
async def list_quotes(
    buyer_id: UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    service: QuoteService = Depends(get_quote_service),
    current_user: AuthUser | None = Depends(get_current_user_optional),
) -> QuoteListResponse | JSONResponse:
    """List quote requests with pagination and optional buyer or status filters."""
    valid_statuses = {"pending", "responded", "accepted", "rejected", "closed"}
    if status is not None and status not in valid_statuses:
        return _error_response(422, "INVALID_STATUS", f"Status must be one of {sorted(valid_statuses)}.")

    # IDOR protection: non-admin buyer can only view their own quotes
    effective_buyer_id = buyer_id
    if current_user is not None and current_user.role != "admin":
        if current_user.role == "buyer":
            effective_buyer_id = current_user.id

    try:
        return await service.list_quotes(
            buyer_id=effective_buyer_id,
            status=status,
            limit=limit,
            offset=offset,
        )
    except DatabaseError:
        return _error_response(500, "DATABASE_ERROR", "Failed to retrieve quote requests.")
    except Exception:
        return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: UUID,
    service: QuoteService = Depends(get_quote_service),
    current_user: AuthUser | None = Depends(get_current_user_optional),
) -> QuoteResponse | JSONResponse:
    """Retrieve details and matched artisan allocations for a specific quote request."""
    try:
        quote = await service.get_quote(quote_id)
        if quote is None:
            return _error_response(404, "QUOTE_NOT_FOUND", "Quote request was not found.")

        # IDOR check: if authenticated non-admin buyer, verify quote ownership
        if current_user is not None and current_user.role != "admin":
            if current_user.role == "buyer" and quote.buyer_id != current_user.id:
                return _error_response(403, "FORBIDDEN", "You do not have permission to view this quote request.")

        return quote
    except DatabaseError:
        return _error_response(500, "DATABASE_ERROR", "Failed to retrieve quote details.")
    except Exception:
        return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")

