from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.db.repository import ProductRepository
from app.schemas.api import (
    BulkMatchingRequest,
    QuoteCreateRequest,
    QuoteMatchResponse,
    QuoteResponse,
)
from app.services.matching.service import MatchingService


router = APIRouter(prefix="/api/quotes", tags=["quotes"])


def get_quote_repository() -> ProductRepository:
    raise RuntimeError("Quote repository has not been configured.")


def get_quote_matching_service() -> MatchingService:
    raise RuntimeError("Matching service has not been configured.")


def _error(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


@router.post("", response_model=QuoteResponse, status_code=201)
def create_quote(
    request: QuoteCreateRequest,
    repository: ProductRepository = Depends(get_quote_repository),
) -> QuoteResponse | JSONResponse:
    if request.product_id is not None and repository.get_product(request.product_id) is None:
        return _error(404, "PRODUCT_NOT_FOUND", "Product was not found.")
    return repository.create_quote(request)


@router.post("/{quote_id}/match", response_model=QuoteMatchResponse)
def match_quote(
    quote_id: UUID,
    repository: ProductRepository = Depends(get_quote_repository),
    service: MatchingService = Depends(get_quote_matching_service),
) -> QuoteMatchResponse | JSONResponse:
    quote = repository.get_quote(quote_id)
    if quote is None:
        return _error(404, "QUOTE_NOT_FOUND", "Quote request was not found.")
    result = service.match(
        BulkMatchingRequest(
            query=quote.request.requirement_text,
            quantity=quote.request.quantity,
            budget_per_unit=quote.request.budget_per_unit,
        )
    )
    repository.save_quote_matches(
        quote_id,
        [match.model_dump(mode="json") for match in result.artisans],
    )
    return QuoteMatchResponse(
        quote_request_id=quote_id,
        required_quantity=result.required_quantity,
        matched_quantity=result.matched_quantity,
        artisans=result.artisans,
    )