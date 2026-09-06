from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.catalogue import CatalogueGenerationResponse
from app.schemas.speech import SpeechTranscriptionResponse


def valid_catalogue_payload() -> dict[str, object]:
    return {
        "title": "Handwoven Jute Bag",
        "description": "Eco-friendly handwoven bag.",
        "category": "Bags",
        "material": "Jute",
        "craft_type": "Handwoven",
        "tags": ["handmade", "jute"],
        "attributes": {"color": "natural brown", "size": "medium"},
        "recommended_price_min": 550,
        "recommended_price_max": 650,
    }


def test_valid_catalogue_response() -> None:
    response = CatalogueGenerationResponse.model_validate(valid_catalogue_payload())

    assert response.title == "Handwoven Jute Bag"
    assert response.recommended_price_min == 550
    assert response.recommended_price_max == 650


def test_negative_catalogue_price_is_rejected() -> None:
    payload = valid_catalogue_payload()
    payload["recommended_price_min"] = -1

    with pytest.raises(ValidationError):
        CatalogueGenerationResponse.model_validate(payload)


def test_inverted_catalogue_price_range_is_rejected() -> None:
    payload = valid_catalogue_payload()
    payload["recommended_price_min"] = 700
    payload["recommended_price_max"] = 650

    with pytest.raises(ValidationError):
        CatalogueGenerationResponse.model_validate(payload)


def test_valid_speech_response() -> None:
    response = SpeechTranscriptionResponse.model_validate(
        {"text": "Handwoven jute bag", "language": "hi-IN"}
    )

    assert response.text == "Handwoven jute bag"
    assert response.language == "hi-IN"


def test_catalogue_tags_are_a_list() -> None:
    response = CatalogueGenerationResponse.model_validate(valid_catalogue_payload())

    assert isinstance(response.tags, list)
    assert response.tags == ["handmade", "jute"]


def test_catalogue_attributes_are_a_dictionary() -> None:
    response = CatalogueGenerationResponse.model_validate(valid_catalogue_payload())

    assert isinstance(response.attributes, dict)
    assert response.attributes == {"color": "natural brown", "size": "medium"}
