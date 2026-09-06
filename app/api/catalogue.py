from __future__ import annotations

import io
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from app.core.config import settings
from app.schemas.catalogue import CatalogueGenerationResponse
from app.services.catalogue.exceptions import CatalogueServiceError
from app.services.catalogue.providers.gemini import GeminiProviderError
from app.services.catalogue.service import CatalogueService


router = APIRouter(prefix="/api/catalogue")


def get_catalogue_service() -> CatalogueService:
    """Provide the configured catalogue service during application composition."""
    raise RuntimeError("Catalogue service has not been configured.")


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


def _is_valid_image(image_bytes: bytes) -> bool:
    if not image_bytes:
        return False

    try:
        with Image.open(io.BytesIO(image_bytes)) as uploaded_image:
            uploaded_image.verify()
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
        return False
    return True



@router.post("/generate", response_model=CatalogueGenerationResponse)
async def generate_catalogue(
    image: UploadFile | None = File(default=None),
    artisan_id: str | None = Form(default=None),
    voice_text: str | None = Form(default=None),
    catalogue_service: CatalogueService = Depends(get_catalogue_service),
) -> CatalogueGenerationResponse | JSONResponse:
    """Generate a catalogue from an uploaded image and optional transcribed text."""
    if image is None:
        return _error_response(422, "IMAGE_REQUIRED", "An image file is required.")
    if artisan_id is None:
        return _error_response(422, "ARTISAN_ID_REQUIRED", "An artisan ID is required.")

    try:
        parsed_artisan_id = UUID(artisan_id)
    except ValueError:
        return _error_response(422, "INVALID_ARTISAN_ID", "Artisan ID must be a UUID.")

    mime_type = image.content_type
    if mime_type is None or not mime_type.startswith("image/"):
        return _error_response(422, "INVALID_IMAGE", "Uploaded file must be an image.")

    try:
        image_bytes = await image.read(settings.max_image_upload_bytes + 1)
    except Exception:
        return _error_response(422, "INVALID_IMAGE", "Unable to read uploaded image.")

    if len(image_bytes) > settings.max_image_upload_bytes:
        return _error_response(
            413,
            "IMAGE_TOO_LARGE",
            f"Image must be {settings.max_image_upload_bytes // (1024 * 1024)} MB or smaller.",
        )

    if not _is_valid_image(image_bytes):
        return _error_response(422, "INVALID_IMAGE", "Uploaded file is not a valid image.")

    try:
        return await catalogue_service.generate_catalogue(
            image_bytes=image_bytes,
            mime_type=mime_type,
            voice_text=voice_text,
            artisan_id=parsed_artisan_id,
        )
    except (GeminiProviderError, CatalogueServiceError):
        return _error_response(
            500,
            "CATALOGUE_GENERATION_FAILED",
            "Catalogue generation could not be completed.",
        )
    except Exception:
        return _error_response(
            500,
            "CATALOGUE_GENERATION_FAILED",
            "Catalogue generation could not be completed.",
        )
