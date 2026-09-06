from __future__ import annotations

from uuid import UUID

import io
from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from app.core.config import settings
from app.db.repository import ProductRepository
from app.schemas.api import (
    EmbeddingResponse,
    InventoryResponse,
    InventoryUpdateRequest,
    ProductCreateRequest,
    ProductImageResponse,
    ProductListResponse,
    ProductResponse,
)
from app.services.embeddings.service import EmbeddingService
from app.services.storage.service import StorageService


router = APIRouter(prefix="/api/products", tags=["products"])


def get_product_repository() -> ProductRepository:
    raise RuntimeError("Product repository has not been configured.")


def get_embedding_service() -> EmbeddingService | None:
    return None


def get_storage_service() -> StorageService:
    raise RuntimeError("Storage service has not been configured.")


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


@router.post("", response_model=ProductResponse, status_code=201)
def create_product(
    request: ProductCreateRequest,
    repository: ProductRepository = Depends(get_product_repository),
    embedding_service: EmbeddingService | None = Depends(get_embedding_service),
) -> ProductResponse:
    product = repository.create_product(request)
    if embedding_service is not None:
        embedding_service.embed_product(product)
    return product


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: UUID,
    repository: ProductRepository = Depends(get_product_repository),
) -> ProductResponse | JSONResponse:
    product = repository.get_product(product_id)
    if product is None:
        return error_response(404, "PRODUCT_NOT_FOUND", "Product was not found.")
    return product


@router.get("", response_model=ProductListResponse)
def list_products(
    category: str | None = Query(default=None),
    artisan_id: UUID | None = Query(default=None),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    repository: ProductRepository = Depends(get_product_repository),
) -> ProductListResponse | JSONResponse:
    if min_price is not None and max_price is not None and min_price > max_price:
        return error_response(
            422, "INVALID_PRICE_RANGE", "min_price must not exceed max_price."
        )
    if status is not None and status not in {"draft", "published", "archived"}:
        return error_response(422, "INVALID_STATUS", "Unsupported product status.")
    products, total = repository.list_products(
        category=category,
        artisan_id=artisan_id,
        min_price=min_price,
        max_price=max_price,
        status=status,
        limit=limit,
        offset=offset,
    )
    return ProductListResponse(products=products, total=total)


@router.put("/{product_id}/inventory", response_model=InventoryResponse)
def update_inventory(
    product_id: UUID,
    request: InventoryUpdateRequest,
    repository: ProductRepository = Depends(get_product_repository),
) -> InventoryResponse | JSONResponse:
    inventory = repository.update_inventory(product_id, request)
    if inventory is None:
        return error_response(404, "PRODUCT_NOT_FOUND", "Product was not found.")
    return inventory


@router.post("/{product_id}/embedding", response_model=EmbeddingResponse)
def generate_product_embedding(
    product_id: UUID,
    repository: ProductRepository = Depends(get_product_repository),
    embedding_service: EmbeddingService | None = Depends(get_embedding_service),
) -> EmbeddingResponse | JSONResponse:
    product = repository.get_product(product_id)
    if product is None:
        return error_response(404, "PRODUCT_NOT_FOUND", "Product was not found.")
    if embedding_service is None:
        return error_response(
            503,
            "EMBEDDING_SERVICE_UNAVAILABLE",
            "Embedding generation is not configured.",
        )
    return embedding_service.embed_product(product)


@router.post("/{product_id}/image", response_model=ProductImageResponse)
async def upload_product_image(
    product_id: UUID,
    image: UploadFile = File(...),
    repository: ProductRepository = Depends(get_product_repository),
    storage_service: StorageService = Depends(get_storage_service),
) -> ProductImageResponse | JSONResponse:
    if repository.get_product(product_id) is None:
        return error_response(404, "PRODUCT_NOT_FOUND", "Product was not found.")
    if not image.content_type or not image.content_type.startswith("image/"):
        return error_response(422, "INVALID_IMAGE", "Uploaded file must be an image.")
    try:
        image_bytes = await image.read(settings.max_image_upload_bytes + 1)
        if len(image_bytes) > settings.max_image_upload_bytes:
            return error_response(
                413,
                "IMAGE_TOO_LARGE",
                f"Image must be {settings.max_image_upload_bytes // (1024 * 1024)} MB or smaller.",
            )
        with Image.open(io.BytesIO(image_bytes)) as uploaded_image:
            uploaded_image.verify()
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
        return error_response(422, "INVALID_IMAGE", "Uploaded file is not valid.")
    try:
        image_url = storage_service.upload_product_image(
            product_id, image_bytes, image.content_type
        )
        updated = repository.update_product_image(product_id, image_url)
    except Exception:
        return error_response(
            502, "IMAGE_UPLOAD_FAILED", "Product image upload failed."
        )
    if updated is None:
        return error_response(404, "PRODUCT_NOT_FOUND", "Product was not found.")
    return ProductImageResponse(product_id=product_id, image_url=image_url)