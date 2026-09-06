from __future__ import annotations

import asyncio
import time
from types import SimpleNamespace
from typing import Any

import pytest

from app.services.catalogue.providers import sarvam


class FakeSpeechToText:
    def __init__(self, response: Any = None, error: Exception | None = None) -> None:
        self.calls: list[dict[str, Any]] = []
        self._response = response
        self._error = error

    def transcribe(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        if self._error is not None:
            raise self._error
        return self._response


class SlowSpeechToText:
    def transcribe(self, **kwargs: Any) -> None:
        time.sleep(0.05)


class FakeClient:
    def __init__(self, speech_to_text: Any) -> None:
        self.speech_to_text = speech_to_text


def build_provider(
    response: Any = None,
    error: Exception | None = None,
) -> tuple[sarvam.SarvamSpeechProvider, FakeSpeechToText]:
    speech_to_text = FakeSpeechToText(response=response, error=error)
    provider = sarvam.SarvamSpeechProvider(
        api_key="test-key",
        client=FakeClient(speech_to_text),
    )
    return provider, speech_to_text


def test_valid_transcription_response() -> None:
    provider, _ = build_provider(
        response=SimpleNamespace(transcript="Handwoven jute bag", language_code="hi-IN")
    )

    result = asyncio.run(
        provider.transcribe(b"audio", "product.wav", "audio/wav", None)
    )

    assert result == {"text": "Handwoven jute bag", "language": "hi-IN"}


def test_audio_bytes_and_metadata_are_forwarded() -> None:
    provider, speech_to_text = build_provider(
        response={"transcript": "Bag", "language_code": "en-IN"}
    )

    asyncio.run(
        provider.transcribe(b"original-audio", "product.mp3", "audio/mpeg", None)
    )

    audio_file = speech_to_text.calls[0]["file"]
    assert audio_file.getvalue() == b"original-audio"
    assert audio_file.name == "product.mp3"
    assert audio_file.content_type == "audio/mpeg"


def test_optional_language_is_forwarded() -> None:
    provider, speech_to_text = build_provider(
        response={"transcript": "Bag", "language_code": "hi-IN"}
    )

    asyncio.run(
        provider.transcribe(b"audio", "product.wav", "audio/wav", "hi-IN")
    )

    assert speech_to_text.calls[0]["language_code"] == "hi-IN"


def test_missing_api_key_is_rejected() -> None:
    with pytest.raises(sarvam.SarvamConfigurationError):
        sarvam.SarvamSpeechProvider(api_key="")


def test_provider_failure_is_wrapped() -> None:
    provider, _ = build_provider(error=RuntimeError("provider failure"))

    with pytest.raises(sarvam.SarvamRequestError):
        asyncio.run(provider.transcribe(b"audio", "product.wav", "audio/wav", None))


def test_malformed_response_is_rejected() -> None:
    provider, _ = build_provider(response={"transcript": "Bag"})

    with pytest.raises(sarvam.SarvamMalformedResponseError):
        asyncio.run(provider.transcribe(b"audio", "product.wav", "audio/wav", None))


def test_missing_transcription_text_is_rejected() -> None:
    provider, _ = build_provider(response={"transcript": "", "language_code": "hi-IN"})

    with pytest.raises(sarvam.SarvamMissingTranscriptionError):
        asyncio.run(provider.transcribe(b"audio", "product.wav", "audio/wav", None))


def test_timeout_is_wrapped() -> None:
    provider = sarvam.SarvamSpeechProvider(
        api_key="test-key",
        client=FakeClient(SlowSpeechToText()),
        timeout_seconds=0.001,
    )

    with pytest.raises(sarvam.SarvamTimeoutError):
        asyncio.run(provider.transcribe(b"audio", "product.wav", "audio/wav", None))
