from __future__ import annotations

import base64
from typing import Any
from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.catalogue import get_catalogue_service, router
from app.schemas.catalogue import CatalogueGenerationResponse
from app.services.catalogue.exceptions import CatalogueProviderError


VALID_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ"
    "/pLvAAAAAElFTkSuQmCC"
)

ARTISAN_ID = "123e4567-e89b-12d3-a456-426614174000"


class FakeCatalogueService:
    def __init__(
        self,
        response: CatalogueGenerationResponse | None = None,
        error: Exception | None = None,
    ) -> None:
        self.calls: list[dict[str, Any]] = []
        self._response = response or CatalogueGenerationResponse(
            title="Handwoven Jute Bag",
            description="Eco-friendly handwoven bag.",
            category="Bags",
            material="Jute",
            craft_type="Handwoven",
            tags=["handmade", "jute"],
            attributes={"color": "natural brown"},
            recommended_price_min=550,
            recommended_price_max=650,
        )
        self._error = error

    async def generate_catalogue(
        self,
        image_bytes: bytes,
        mime_type: str,
        voice_text: str | None,
        artisan_id: UUID,
    ) -> CatalogueGenerationResponse:
        self.calls.append(
            {
                "image_bytes": image_bytes,
                "mime_type": mime_type,
                "voice_text": voice_text,
                "artisan_id": artisan_id,
            }
        )
        if self._error is not None:
            raise self._error
        return self._response


def build_client(service: FakeCatalogueService) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_catalogue_service] = lambda: service
    return TestClient(app)


def image_file() -> dict[str, tuple[str, bytes, str]]:
    return {"image": ("product.png", VALID_PNG, "image/png")}


def test_successful_multipart_request_uses_documented_response() -> None:
    service = FakeCatalogueService()
    client = build_client(service)

    response = client.post(
        "/api/catalogue/generate",
        files=image_file(),
        data={"artisan_id": ARTISAN_ID},
    )

    assert response.status_code == 200
    assert response.json() == service._response.model_dump()
    assert set(response.json()) == {
        "title",
        "description",
        "category",
        "material",
        "craft_type",
        "tags",
        "attributes",
        "recommended_price_min",
        "recommended_price_max",
    }


def test_image_and_artisan_id_are_required() -> None:
    client = build_client(FakeCatalogueService())

    missing_image = client.post("/api/catalogue/generate", data={"artisan_id": ARTISAN_ID})
    missing_artisan_id = client.post("/api/catalogue/generate", files=image_file())

    assert missing_image.status_code == 422
    assert missing_artisan_id.status_code == 422


def test_optional_voice_text_is_accepted_and_forwarded() -> None:
    service = FakeCatalogueService()
    client = build_client(service)

    response = client.post(
        "/api/catalogue/generate",
        files=image_file(),
        data={"artisan_id": ARTISAN_ID, "voice_text": "This bag is handwoven."},
    )

    assert response.status_code == 200
    assert service.calls[0]["voice_text"] == "This bag is handwoven."


def test_image_bytes_mime_type_and_artisan_id_reach_service() -> None:
    service = FakeCatalogueService()
    client = build_client(service)

    response = client.post(
        "/api/catalogue/generate",
        files=image_file(),
        data={"artisan_id": ARTISAN_ID},
    )

    assert response.status_code == 200
    assert service.calls[0]["image_bytes"] == VALID_PNG
    assert service.calls[0]["mime_type"] == "image/png"
    assert service.calls[0]["artisan_id"] == UUID(ARTISAN_ID)


def test_service_failure_returns_safe_http_error() -> None:
    service = FakeCatalogueService(
        error=CatalogueProviderError("GEMINI_API_KEY=secret-value")
    )
    client = build_client(service)

    response = client.post(
        "/api/catalogue/generate",
        files=image_file(),
        data={"artisan_id": ARTISAN_ID},
    )

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "CATALOGUE_GENERATION_FAILED",
            "message": "Catalogue generation could not be completed.",
        }
    }
    assert "secret-value" not in response.text


def test_invalid_image_input_is_rejected() -> None:
    client = build_client(FakeCatalogueService())

    response = client.post(
        "/api/catalogue/generate",
        files={"image": ("not-image.jpg", b"not an image", "image/jpeg")},
        data={"artisan_id": ARTISAN_ID},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_IMAGE"


def test_route_path_and_method_are_exact() -> None:
    route = next(route for route in router.routes if route.path == "/api/catalogue/generate")

    assert route.path == "/api/catalogue/generate"
    assert route.methods == {"POST"}


def test_invalid_artisan_id_format_is_rejected() -> None:
    client = build_client(FakeCatalogueService())

    response = client.post(
        "/api/catalogue/generate",
        files=image_file(),
        data={"artisan_id": "not-a-valid-uuid"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_ARTISAN_ID"


def test_non_image_mime_type_is_rejected() -> None:
    client = build_client(FakeCatalogueService())

    response = client.post(
        "/api/catalogue/generate",
        files={"image": ("document.txt", b"plain text", "text/plain")},
        data={"artisan_id": ARTISAN_ID},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_IMAGE"


def test_empty_image_is_rejected() -> None:
    client = build_client(FakeCatalogueService())

    response = client.post(
        "/api/catalogue/generate",
        files={"image": ("empty.png", b"", "image/png")},
        data={"artisan_id": ARTISAN_ID},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_IMAGE"

