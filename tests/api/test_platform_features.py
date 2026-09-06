from __future__ import annotations

import base64
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)
VALID_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ"
    "/pLvAAAAAElFTkSuQmCC"
)


def make_product() -> dict:
    return client.post(
        "/api/products",
        json={
            "artisan_id": str(uuid4()),
            "title": "Handwoven Jute Bag",
            "description": "Natural jute bag",
            "category": "Bags",
            "material": "Jute",
            "craft_type": "Handwoven",
            "tags": ["jute"],
            "attributes": {},
            "price": 600,
            "currency": "INR",
            "status": "published",
        },
    ).json()


def test_embedding_and_storage_contracts() -> None:
    product = make_product()
    embedding = client.post(f"/api/products/{product['id']}/embedding")
    assert embedding.status_code == 200
    assert embedding.json()["product_id"] == product["id"]
    assert embedding.json()["dimensions"] > 0

    image = client.post(
        f"/api/products/{product['id']}/image",
        files={"image": ("product.png", VALID_PNG, "image/png")},
    )
    assert image.status_code == 200
    assert image.json()["product_id"] == product["id"]
    assert image.json()["image_url"].endswith(f"/{product['id']}")


def test_translation_notification_chat_and_price_model_contracts() -> None:
    translation = client.post(
        "/api/translation",
        json={"text": "Handmade bag", "target_language": "hi"},
    )
    assert translation.status_code == 200
    assert translation.json()["target_language"] == "hi"

    notification = client.post(
        "/api/notifications/send",
        json={"channel": "push", "recipient": "device-token", "message": "New quote"},
    )
    assert notification.status_code == 200
    assert notification.json()["status"] == "queued"

    participant_a, participant_b = str(uuid4()), str(uuid4())
    conversation = client.post(
        "/api/conversations",
        json={"participant_ids": [participant_a, participant_b]},
    )
    assert conversation.status_code == 201
    conversation_id = conversation.json()["id"]
    message = client.post(
        f"/api/conversations/{conversation_id}/messages",
        json={"sender_id": participant_a, "body": "Can you quote this order?"},
    )
    assert message.status_code == 201
    assert len(client.get(f"/api/conversations/{conversation_id}/messages").json()) == 1

    observations = [
        {
            "category": "Bags",
            "material": "Jute",
            "craft_type": "Handwoven",
            "price": 550,
        },
        {
            "category": "Bags",
            "material": "Jute",
            "craft_type": "Handwoven",
            "price": 600,
        },
        {
            "category": "Bags",
            "material": "Jute",
            "craft_type": "Handwoven",
            "price": 650,
        },
    ]
    trained = client.post("/api/pricing/train", json={"observations": observations})
    assert trained.status_code == 200
    recommendation = client.post(
        "/api/pricing/recommend",
        json={"category": "Bags", "material": "Jute", "craft_type": "Handwoven"},
    )
    assert recommendation.status_code == 200
    assert recommendation.json()["recommended_price_min"] > 0


def test_auth_requires_verified_configuration_for_access_tokens() -> None:
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] in {
        "AUTHENTICATION_REQUIRED",
        "INVALID_AUTHENTICATION",
    }