from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.db.exceptions import DatabaseError
from app.schemas.product import ProductListResponse, ProductResponse
from app.schemas.product_write import InventoryUpdateRequest, ProductCreateRequest
from app.services.product.embedding_sync import ProductEmbeddingSyncService
from app.services.product.repository import ProductRepository
from app.services.product.write_repository import (
    ArtisanNotFoundError,
    ProductNotFoundError,
    ProductWriteRepository,
)


router = APIRouter(prefix="/api/products", tags=["products"])


def get_product_repository() -> ProductRepository:
    """Dependency provider for ProductRepository."""
    return ProductRepository()


def get_product_write_repository() -> ProductWriteRepository:
    """Dependency provider for ProductWriteRepository."""
    return ProductWriteRepository()


def get_embedding_sync_service() -> ProductEmbeddingSyncService:
    """Dependency provider for ProductEmbeddingSyncService."""
    return ProductEmbeddingSyncService()


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


from app.core.dependencies import get_current_user_optional
from app.schemas.auth import AuthUser


@router.post("", response_model=ProductResponse, status_code=201)
async def create_product(
    body: ProductCreateRequest,
    write_repo: ProductWriteRepository = Depends(get_product_write_repository),
    sync_service: ProductEmbeddingSyncService = Depends(get_embedding_sync_service),
    current_user: AuthUser | None = Depends(get_current_user_optional),
) -> ProductResponse | JSONResponse:
    """
    Atomically create a product and its initial inventory record.
    After successful database commit, synchronize the product embedding.
    """
    # IDOR check: if authenticated as non-admin, must be artisan and match body.artisan_id
    if current_user is not None and current_user.role != "admin":
        if current_user.role != "artisan":
            return _error_response(403, "INSUFFICIENT_ROLE", "Only artisans or admins can create products.")
        if current_user.artisan_id is not None and body.artisan_id != current_user.artisan_id:
            return _error_response(403, "FORBIDDEN", "Cannot create product for another artisan.")

    try:
        created_product = await write_repo.create_product(body)
    except ArtisanNotFoundError:
        return _error_response(404, "ARTISAN_NOT_FOUND", "Artisan was not found.")
    except DatabaseError:
        return _error_response(500, "DATABASE_ERROR", "Failed to create product.")
    except Exception:
        return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")

    # 2. Embedding synchronization occurs strictly AFTER product transaction commit
    await sync_service.sync_product(created_product)

    return created_product


@router.get("", response_model=ProductListResponse)
async def list_products(
    artisan_id: UUID | None = Query(default=None),
    category: str | None = Query(default=None),
    craft_type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    product_repo: ProductRepository = Depends(get_product_repository),
) -> ProductListResponse | JSONResponse:
    """Return paginated products list with safe optional filtering."""
    if status is not None and status not in {"draft", "published", "archived"}:
        return _error_response(422, "INVALID_STATUS", "Status must be draft, published, or archived.")

    try:
        return await product_repo.list_products(
            artisan_id=artisan_id,
            category=category,
            craft_type=craft_type,
            status=status,
            limit=limit,
            offset=offset,
        )
    except DatabaseError:
        return _error_response(500, "DATABASE_ERROR", "Failed to retrieve products.")
    except Exception:
        return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    product_repo: ProductRepository = Depends(get_product_repository),
) -> ProductResponse | JSONResponse:
    """Return detailed information for a single product."""
    try:
        product = await product_repo.get_product_by_id(product_id)
        if product is None:
            return _error_response(404, "PRODUCT_NOT_FOUND", "Product was not found.")
        return product
    except DatabaseError:
        return _error_response(500, "DATABASE_ERROR", "Failed to retrieve product details.")
    except Exception:
        return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")


@router.put("/{product_id}/inventory", response_model=ProductResponse)
async def update_inventory(
    product_id: UUID,
    body: InventoryUpdateRequest,
    write_repo: ProductWriteRepository = Depends(get_product_write_repository),
    current_user: AuthUser | None = Depends(get_current_user_optional),
) -> ProductResponse | JSONResponse:
    """Atomically update or insert inventory availability for a product."""
    if current_user is not None and current_user.role != "admin":
        if current_user.role != "artisan":
            return _error_response(403, "INSUFFICIENT_ROLE", "Only artisans or admins can update product inventory.")

    expected_artisan_id = current_user.artisan_id if (current_user is not None and current_user.role != "admin") else None

    try:
        updated_product = await write_repo.update_inventory(product_id, body, expected_artisan_id=expected_artisan_id)
        return updated_product
    except ProductNotFoundError:
        return _error_response(404, "PRODUCT_NOT_FOUND", "Product was not found or access denied.")
    except DatabaseError:
        return _error_response(500, "DATABASE_ERROR", "Failed to update product inventory.")
    except Exception:
        return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")
