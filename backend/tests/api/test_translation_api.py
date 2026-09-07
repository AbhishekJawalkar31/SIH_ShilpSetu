from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.translation import get_translation_service
from app.main import app
from app.services.translation.service import (
    TranslationConfigError,
    TranslationExecutionError,
    TranslationService,
)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_translate_api_success_marathi_to_english(client: TestClient) -> None:
    mock_service = MagicMock(spec=TranslationService)
    mock_service.translate_text = AsyncMock(return_value="Beautiful clay pots")

    app.dependency_overrides[get_translation_service] = lambda: mock_service
    try:
        payload = {
            "text": "मातीची सुंदर भांडी",
            "source_language": "mr",
            "target_language": "en",
        }
        response = client.post("/api/translate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["translated_text"] == "Beautiful clay pots"
        assert data["source_language"] == "mr-IN"
        assert data["target_language"] == "en-IN"
        mock_service.translate_text.assert_awaited_once_with(
            text="मातीची सुंदर भांडी",
            source_language="mr-IN",
            target_language="en-IN",
        )
    finally:
        app.dependency_overrides.pop(get_translation_service, None)


def test_translate_api_success_english_to_marathi(client: TestClient) -> None:
    mock_service = MagicMock(spec=TranslationService)
    mock_service.translate_text = AsyncMock(return_value="मातीची सुंदर भांडी")

    app.dependency_overrides[get_translation_service] = lambda: mock_service
    try:
        payload = {
            "text": "Beautiful clay pots",
            "source_language": "en",
            "target_language": "mr",
        }
        response = client.post("/api/translate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["translated_text"] == "मातीची सुंदर भांडी"
        assert data["source_language"] == "en-IN"
        assert data["target_language"] == "mr-IN"
    finally:
        app.dependency_overrides.pop(get_translation_service, None)


def test_translate_api_same_language(client: TestClient) -> None:
    mock_service = MagicMock(spec=TranslationService)
    mock_service.translate_text = AsyncMock(return_value="Original Text")

    app.dependency_overrides[get_translation_service] = lambda: mock_service
    try:
        payload = {
            "text": "Original Text",
            "source_language": "mr",
            "target_language": "mr",
        }
        response = client.post("/api/translate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["translated_text"] == "Original Text"
    finally:
        app.dependency_overrides.pop(get_translation_service, None)


def test_translate_api_unsupported_source_language(client: TestClient) -> None:
    payload = {
        "text": "Hello world",
        "source_language": "unsupported_lang",
        "target_language": "en",
    }
    response = client.post("/api/translate", json=payload)
    assert response.status_code == 422


def test_translate_api_unsupported_target_language(client: TestClient) -> None:
    payload = {
        "text": "Hello world",
        "source_language": "en",
        "target_language": "unsupported_lang",
    }
    response = client.post("/api/translate", json=payload)
    assert response.status_code == 422


def test_translate_api_empty_text(client: TestClient) -> None:
    payload = {
        "text": "",
        "source_language": "en",
        "target_language": "hi",
    }
    response = client.post("/api/translate", json=payload)
    assert response.status_code == 422


def test_translate_api_whitespace_only_text(client: TestClient) -> None:
    payload = {
        "text": "     ",
        "source_language": "en",
        "target_language": "hi",
    }
    response = client.post("/api/translate", json=payload)
    assert response.status_code == 422


def test_translate_api_text_exceeds_max_length(client: TestClient) -> None:
    payload = {
        "text": "A" * 5001,
        "source_language": "en",
        "target_language": "hi",
    }
    response = client.post("/api/translate", json=payload)
    assert response.status_code == 422


def test_translate_api_provider_failure_returns_502(client: TestClient) -> None:
    mock_service = MagicMock(spec=TranslationService)
    mock_service.translate_text = AsyncMock(side_effect=TranslationExecutionError("Upstream timeout"))

    app.dependency_overrides[get_translation_service] = lambda: mock_service
    try:
        payload = {
            "text": "Hello world",
            "source_language": "en",
            "target_language": "hi",
        }
        response = client.post("/api/translate", json=payload)
        assert response.status_code == 502
        data = response.json()
        assert data["error"]["code"] == "TRANSLATION_PROVIDER_ERROR"
        assert "temporarily unavailable" in data["error"]["message"]
        # Ensure no secrets or raw exception leaked
        assert "Upstream timeout" not in str(data)
    finally:
        app.dependency_overrides.pop(get_translation_service, None)


def test_translate_api_config_error_returns_502(client: TestClient) -> None:
    mock_service = MagicMock(spec=TranslationService)
    mock_service.translate_text = AsyncMock(side_effect=TranslationConfigError("Key missing"))

    app.dependency_overrides[get_translation_service] = lambda: mock_service
    try:
        payload = {
            "text": "Hello world",
            "source_language": "en",
            "target_language": "hi",
        }
        response = client.post("/api/translate", json=payload)
        assert response.status_code == 502
        data = response.json()
        assert data["error"]["code"] == "TRANSLATION_PROVIDER_ERROR"
        assert "Key missing" not in str(data)
    finally:
        app.dependency_overrides.pop(get_translation_service, None)
