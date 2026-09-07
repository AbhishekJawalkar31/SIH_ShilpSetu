from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.schemas.translation import TranslationRequest, TranslationResponse
from app.services.translation.languages import UnsupportedLanguageError
from app.services.translation.service import (
    TranslationConfigError,
    TranslationExecutionError,
    TranslationService,
)

router = APIRouter(prefix="/api/translate", tags=["translation"])


def get_translation_service() -> TranslationService:
    """Dependency provider for TranslationService."""
    return TranslationService()


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


@router.post("", response_model=TranslationResponse)
async def translate(
    body: TranslationRequest,
    service: TranslationService = Depends(get_translation_service),
) -> TranslationResponse | JSONResponse:
    """Translate regional Indian language text to/from English using Sarvam AI."""
    try:
        translated_text = await service.translate_text(
            text=body.text,
            source_language=body.source_language,
            target_language=body.target_language,
        )
        return TranslationResponse(
            translated_text=translated_text,
            source_language=body.source_language,
            target_language=body.target_language,
        )
    except UnsupportedLanguageError as exc:
        return _error_response(422, "UNSUPPORTED_LANGUAGE", str(exc))
    except TranslationConfigError:
        return _error_response(
            502,
            "TRANSLATION_PROVIDER_ERROR",
            "Translation service is temporarily unavailable.",
        )
    except TranslationExecutionError:
        return _error_response(
            502,
            "TRANSLATION_PROVIDER_ERROR",
            "Translation service is temporarily unavailable.",
        )
    except Exception:
        return _error_response(
            502,
            "TRANSLATION_PROVIDER_ERROR",
            "Translation service is temporarily unavailable.",
        )
