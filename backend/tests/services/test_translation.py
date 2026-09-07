from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.translation.languages import (
    UnsupportedLanguageError,
    normalize_language_code,
)
from app.services.translation.sarvam import (
    SarvamTranslationConfigurationError,
    SarvamTranslationProvider,
    SarvamTranslationRequestError,
    SarvamTranslationResponseError,
    SarvamTranslationTimeoutError,
)
from app.services.translation.service import (
    TranslationConfigError,
    TranslationExecutionError,
    TranslationService,
)


# ===========================================================================
# 1. Language Normalization & Validation Tests
# ===========================================================================

def test_language_normalization_valid_codes() -> None:
    assert normalize_language_code("mr") == "mr-IN"
    assert normalize_language_code("MR-IN") == "mr-IN"
    assert normalize_language_code("marathi") == "mr-IN"
    assert normalize_language_code("en") == "en-IN"
    assert normalize_language_code("english") == "en-IN"
    assert normalize_language_code("hi") == "hi-IN"
    assert normalize_language_code("hindi") == "hi-IN"
    assert normalize_language_code("bn") == "bn-IN"
    assert normalize_language_code("ta") == "ta-IN"
    assert normalize_language_code("te") == "te-IN"
    assert normalize_language_code("gu") == "gu-IN"
    assert normalize_language_code("kn") == "kn-IN"
    assert normalize_language_code("ml") == "ml-IN"
    assert normalize_language_code("pa") == "pa-IN"
    assert normalize_language_code("od") == "od-IN"


def test_language_normalization_auto() -> None:
    assert normalize_language_code("auto", allow_auto=True) == "auto"
    with pytest.raises(UnsupportedLanguageError, match="Automatic detection is only valid"):
        normalize_language_code("auto", allow_auto=False)


def test_language_normalization_unsupported() -> None:
    with pytest.raises(UnsupportedLanguageError, match="Unsupported language 'xx'"):
        normalize_language_code("xx")

    with pytest.raises(UnsupportedLanguageError, match="Language code must not be blank"):
        normalize_language_code("   ")


# ===========================================================================
# 2. Sarvam Translation Provider Tests
# ===========================================================================

@pytest.mark.anyio
async def test_sarvam_provider_missing_api_key() -> None:
    with pytest.raises(SarvamTranslationConfigurationError, match="Sarvam API key is not configured"):
        SarvamTranslationProvider(api_key=None)


@pytest.mark.anyio
async def test_sarvam_provider_translate_success() -> None:
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.translated_text = "Beautiful clay pots"
    mock_client.text.translate.return_value = mock_resp

    provider = SarvamTranslationProvider(api_key="fake-key", client=mock_client)
    result = await provider.translate(
        text="मातीची सुंदर भांडी",
        source_language="mr",
        target_language="en",
    )

    assert result == "Beautiful clay pots"
    mock_client.text.translate.assert_called_once_with(
        input="मातीची सुंदर भांडी",
        source_language_code="mr-IN",
        target_language_code="en-IN",
        model="sarvam-translate:v1",
        mode="formal",
    )


@pytest.mark.anyio
async def test_sarvam_provider_timeout_error() -> None:
    mock_client = MagicMock()
    mock_client.text.translate.side_effect = TimeoutError()

    provider = SarvamTranslationProvider(api_key="fake-key", client=mock_client, timeout_seconds=0.01)
    with pytest.raises(SarvamTranslationTimeoutError):
        await provider.translate("test", "en", "hi")


@pytest.mark.anyio
async def test_sarvam_provider_request_error() -> None:
    mock_client = MagicMock()
    mock_client.text.translate.side_effect = RuntimeError("Service 500 error")

    provider = SarvamTranslationProvider(api_key="fake-key", client=mock_client)
    with pytest.raises(SarvamTranslationRequestError):
        await provider.translate("test", "en", "hi")


@pytest.mark.anyio
async def test_sarvam_provider_empty_response_error() -> None:
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.translated_text = ""
    mock_client.text.translate.return_value = mock_resp

    provider = SarvamTranslationProvider(api_key="fake-key", client=mock_client)
    with pytest.raises(SarvamTranslationResponseError):
        await provider.translate("test", "en", "hi")


# ===========================================================================
# 3. Translation Service Orchestrator Tests
# ===========================================================================

@pytest.mark.anyio
async def test_service_translate_same_language_returns_original() -> None:
    mock_provider = MagicMock()
    mock_provider.translate = AsyncMock()

    service = TranslationService(primary_provider=mock_provider)
    result = await service.translate_text("नमस्कार", "mr", "mr")

    assert result == "नमस्कार"
    # Same language should NOT call the upstream provider API
    mock_provider.translate.assert_not_awaited()


@pytest.mark.anyio
async def test_service_translate_success() -> None:
    mock_provider = MagicMock()
    mock_provider.translate = AsyncMock(return_value="Beautiful clay pots")

    service = TranslationService(primary_provider=mock_provider)
    result = await service.translate_text("मातीची सुंदर भांडी", "mr", "en")

    assert result == "Beautiful clay pots"
    mock_provider.translate.assert_awaited_once_with(
        text="मातीची सुंदर भांडी",
        source_language="mr-IN",
        target_language="en-IN",
    )


@pytest.mark.anyio
async def test_service_translate_empty_text_error() -> None:
    service = TranslationService()
    with pytest.raises(ValueError, match="Text to translate must not be empty"):
        await service.translate_text("   ", "mr", "en")


@pytest.mark.anyio
async def test_service_translate_provider_failure_raises_execution_error() -> None:
    mock_provider = MagicMock()
    mock_provider.translate = AsyncMock(side_effect=SarvamTranslationRequestError("API rejected"))

    service = TranslationService(primary_provider=mock_provider)
    with pytest.raises(TranslationExecutionError, match="Translation provider failed"):
        await service.translate_text("hello", "en", "hi")
