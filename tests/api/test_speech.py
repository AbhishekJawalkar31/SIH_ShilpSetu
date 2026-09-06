from __future__ import annotations

from typing import Any, Mapping

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.speech import get_speech_provider, router
from app.schemas.speech import SpeechTranscriptionResponse
from app.services.catalogue.providers.sarvam import SarvamRequestError


class FakeSpeechProvider:
    def __init__(
        self,
        response: Mapping[str, Any] | None = None,
        error: Exception | None = None,
    ) -> None:
        self.calls: list[dict[str, Any]] = []
        self._response = response or {"text": "Handwoven jute bag", "language": "hi-IN"}
        self._error = error

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str,
        mime_type: str,
        language: str | None,
    ) -> Mapping[str, Any]:
        self.calls.append(
            {
                "audio_bytes": audio_bytes,
                "filename": filename,
                "mime_type": mime_type,
                "language": language,
            }
        )
        if self._error is not None:
            raise self._error
        return self._response


def build_client(provider: FakeSpeechProvider) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_speech_provider] = lambda: provider
    return TestClient(app)


def audio_file() -> dict[str, tuple[str, bytes, str]]:
    return {"audio": ("product.wav", b"audio-data", "audio/wav")}


def test_successful_multipart_audio_request_uses_documented_response() -> None:
    client = build_client(FakeSpeechProvider())

    response = client.post("/api/speech/transcribe", files=audio_file())

    assert response.status_code == 200
    assert response.json() == {"text": "Handwoven jute bag", "language": "hi-IN"}
    assert set(response.json()) == {"text", "language"}


def test_audio_is_required() -> None:
    client = build_client(FakeSpeechProvider())

    response = client.post("/api/speech/transcribe")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "AUDIO_REQUIRED"


def test_optional_language_and_audio_metadata_are_forwarded() -> None:
    provider = FakeSpeechProvider()
    client = build_client(provider)

    response = client.post(
        "/api/speech/transcribe",
        files=audio_file(),
        data={"language": "hi-IN"},
    )

    assert response.status_code == 200
    assert provider.calls == [
        {
            "audio_bytes": b"audio-data",
            "filename": "product.wav",
            "mime_type": "audio/wav",
            "language": "hi-IN",
        }
    ]


def test_provider_failure_returns_safe_http_error() -> None:
    provider = FakeSpeechProvider(error=SarvamRequestError("SARVAM_API_KEY=secret-value"))
    client = build_client(provider)

    response = client.post("/api/speech/transcribe", files=audio_file())

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "SPEECH_TRANSCRIPTION_FAILED",
            "message": "Speech transcription could not be completed.",
        }
    }
    assert "secret-value" not in response.text


def test_malformed_provider_response_is_handled() -> None:
    client = build_client(FakeSpeechProvider(response={"text": "Missing language"}))

    response = client.post("/api/speech/transcribe", files=audio_file())

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "SPEECH_TRANSCRIPTION_FAILED"


def test_empty_audio_is_rejected() -> None:
    client = build_client(FakeSpeechProvider())

    response = client.post(
        "/api/speech/transcribe",
        files={"audio": ("empty.wav", b"", "audio/wav")},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_AUDIO"


def test_route_path_and_method_are_exact() -> None:
    route = next(route for route in router.routes if route.path == "/api/speech/transcribe")

    assert route.path == "/api/speech/transcribe"
    assert route.methods == {"POST"}


def test_valid_response_matches_schema() -> None:
    response = SpeechTranscriptionResponse.model_validate(
        {"text": "Handwoven jute bag", "language": "hi-IN"}
    )

    assert response.model_dump() == {"text": "Handwoven jute bag", "language": "hi-IN"}


def test_invalid_mime_type_is_rejected() -> None:
    client = build_client(FakeSpeechProvider())

    response = client.post(
        "/api/speech/transcribe",
        files={"audio": ("not-audio.txt", b"plain text", "text/plain")},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_AUDIO"


def test_unconfigured_speech_provider_returns_safe_http_error() -> None:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_speech_provider] = lambda: None
    client = TestClient(app)

    response = client.post("/api/speech/transcribe", files=audio_file())

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "SPEECH_TRANSCRIPTION_FAILED",
            "message": "Speech transcription could not be completed.",
        }
    }

