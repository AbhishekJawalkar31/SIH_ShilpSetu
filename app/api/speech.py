from __future__ import annotations

from typing import Mapping

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.speech import SpeechTranscriptionResponse
from app.services.catalogue.providers.base import SpeechProvider
from app.services.catalogue.providers.sarvam import (
    SarvamConfigurationError,
    SarvamProviderError,
    SarvamSpeechProvider,
)


router = APIRouter(prefix="/api/speech")


def get_speech_provider() -> SpeechProvider | None:
    """Provide the configured Sarvam adapter during application composition."""
    try:
        return SarvamSpeechProvider()
    except SarvamConfigurationError:
        return None


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


@router.post("/transcribe", response_model=SpeechTranscriptionResponse)
async def transcribe_speech(
    audio: UploadFile | None = File(default=None),
    language: str | None = Form(default=None),
    speech_provider: SpeechProvider | None = Depends(get_speech_provider),
) -> SpeechTranscriptionResponse | JSONResponse:
    """Transcribe an uploaded audio file through the speech provider abstraction."""
    if audio is None:
        return _error_response(422, "AUDIO_REQUIRED", "An audio file is required.")
    if speech_provider is None:
        return _error_response(
            500,
            "SPEECH_TRANSCRIPTION_FAILED",
            "Speech transcription could not be completed.",
        )

    mime_type = audio.content_type
    if mime_type is None or not mime_type.startswith("audio/"):
        return _error_response(422, "INVALID_AUDIO", "Uploaded file must be audio.")

    try:
        audio_bytes = await audio.read(settings.max_audio_upload_bytes + 1)
    except Exception:
        return _error_response(422, "INVALID_AUDIO", "Unable to read uploaded audio.")

    if not audio_bytes:
        return _error_response(422, "INVALID_AUDIO", "Uploaded audio file is empty.")
    if len(audio_bytes) > settings.max_audio_upload_bytes:
        return _error_response(
            413,
            "AUDIO_TOO_LARGE",
            f"Audio must be {settings.max_audio_upload_bytes // (1024 * 1024)} MB or smaller.",
        )

    try:
        provider_response = await speech_provider.transcribe(
            audio_bytes=audio_bytes,
            filename=audio.filename or "audio",
            mime_type=mime_type,
            language=language,
        )
        if not isinstance(provider_response, Mapping):
            raise ValidationError.from_exception_data(
                "SpeechTranscriptionResponse",
                [],
            )
        return SpeechTranscriptionResponse.model_validate(provider_response)
    except (SarvamProviderError, ValidationError):
        return _error_response(
            500,
            "SPEECH_TRANSCRIPTION_FAILED",
            "Speech transcription could not be completed.",
        )
    except Exception:
        return _error_response(
            500,
            "SPEECH_TRANSCRIPTION_FAILED",
            "Speech transcription could not be completed.",
        )
