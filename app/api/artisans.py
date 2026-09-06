from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.db.repository import ProductRepository
from app.schemas.api import ArtisanProductsResponse, ArtisanProfileResponse
from app.api.products import error_response, get_product_repository


router = APIRouter(prefix="/api/artisans", tags=["artisans"])


@router.get("/{artisan_id}", response_model=ArtisanProfileResponse)
def get_artisan(
    artisan_id: UUID,
    repository: ProductRepository = Depends(get_product_repository),
) -> ArtisanProfileResponse | JSONResponse:
    artisan = repository.get_artisan(artisan_id)
    if artisan is None:
        return error_response(404, "ARTISAN_NOT_FOUND", "Artisan was not found.")
    return artisan


@router.get("/{artisan_id}/products", response_model=ArtisanProductsResponse)
def get_artisan_products(
    artisan_id: UUID,
    repository: ProductRepository = Depends(get_product_repository),
) -> ArtisanProductsResponse | JSONResponse:
    if repository.get_artisan(artisan_id) is None:
        return error_response(404, "ARTISAN_NOT_FOUND", "Artisan was not found.")
    return ArtisanProductsResponse(
        artisan_id=artisan_id,
        products=repository.list_artisan_products(artisan_id),
    )