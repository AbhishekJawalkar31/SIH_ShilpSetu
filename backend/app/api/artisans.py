from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.db.exceptions import DatabaseError
from app.schemas.artisan import ArtisanProfileResponse
from app.schemas.product import ProductResponse
from app.services.artisan.repository import ArtisanRepository
from app.services.product.repository import ProductRepository


router = APIRouter(prefix="/api/artisans", tags=["artisans"])


def get_artisan_repository() -> ArtisanRepository:
    """Dependency provider for ArtisanRepository."""
    return ArtisanRepository()


def get_product_repository() -> ProductRepository:
    """Dependency provider for ProductRepository."""
    return ProductRepository()


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


@router.get("/{artisan_id}", response_model=ArtisanProfileResponse)
async def get_artisan(
    artisan_id: UUID,
    artisan_repo: ArtisanRepository = Depends(get_artisan_repository),
) -> ArtisanProfileResponse | JSONResponse:
    """Return the public profile of a single artisan."""
    try:
        artisan = await artisan_repo.get_artisan_by_id(artisan_id)
        if artisan is None:
            return _error_response(404, "ARTISAN_NOT_FOUND", "Artisan was not found.")
        return artisan
    except DatabaseError:
        return _error_response(500, "DATABASE_ERROR", "Failed to retrieve artisan profile.")
    except Exception:
        return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")


@router.get("/{artisan_id}/products", response_model=list[ProductResponse])
async def get_artisan_products(
    artisan_id: UUID,
    artisan_repo: ArtisanRepository = Depends(get_artisan_repository),
    product_repo: ProductRepository = Depends(get_product_repository),
) -> list[ProductResponse] | JSONResponse:
    """Return products belonging to the specified artisan."""
    try:
        artisan = await artisan_repo.get_artisan_by_id(artisan_id)
        if artisan is None:
            return _error_response(404, "ARTISAN_NOT_FOUND", "Artisan was not found.")
        return await product_repo.list_artisan_products(artisan_id)
    except DatabaseError:
        return _error_response(500, "DATABASE_ERROR", "Failed to retrieve artisan products.")
    except Exception:
        return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")
