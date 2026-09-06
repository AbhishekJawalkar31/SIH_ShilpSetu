from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.schemas.api import TranslationRequest, TranslationResponse
from app.services.translation.service import (
    HttpTranslationService,
    PassthroughTranslationService,
    SarvamTranslationService,
    TranslationConfigurationError,
    TranslationProviderError,
    TranslationRequestError,
    TranslationService,
)


router = APIRouter(prefix="/api/translation", tags=["translation"])


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


def get_translation_service() -> TranslationService:
    if settings.sarvam_api_key:
        return SarvamTranslationService(
            settings.sarvam_api_key,
            endpoint=f"{settings.sarvam_api_base_url.rstrip('/')}/translate",
            model=settings.sarvam_translation_model,
            mode=settings.sarvam_translation_mode,
            timeout=settings.sarvam_translation_timeout_seconds,
        )
    # Keep the old gateway setting as a migration path for deployments that
    # already use it. New deployments should use SARVAM_API_KEY instead.
    if settings.translation_api_url:
        return HttpTranslationService(
            settings.translation_api_url, settings.translation_api_key
        )
    return PassthroughTranslationService()


@router.post("", response_model=TranslationResponse)
def translate(
    request: TranslationRequest,
    service: TranslationService = Depends(get_translation_service),
) -> TranslationResponse | JSONResponse:
    try:
        return service.translate(request)
    except TranslationConfigurationError:
        return _error_response(
            503,
            "TRANSLATION_PROVIDER_NOT_CONFIGURED",
            "Regional translation is not configured. Set SARVAM_API_KEY.",
        )
    except TranslationRequestError as exc:
        return _error_response(400, "TRANSLATION_REQUEST_FAILED", str(exc))
    except TranslationProviderError:
        return _error_response(
            502,
            "TRANSLATION_PROVIDER_FAILED",
            "Regional translation could not be completed.",
        )