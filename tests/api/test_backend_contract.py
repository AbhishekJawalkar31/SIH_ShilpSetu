from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def product_payload(artisan_id: str | None = None) -> dict:
    return {
        "artisan_id": artisan_id or str(uuid4()),
        "title": "Handwoven Jute Bag",
        "description": "Eco-friendly handwoven jute bag.",
        "category": "Bags",
        "material": "Jute",
        "craft_type": "Handwoven",
        "tags": ["handmade", "jute"],
        "attributes": {"color": "natural brown"},
        "price": 620,
        "currency": "INR",
        "image_url": "https://storage.example/product.jpg",
        "status": "published",
    }


def test_health_and_product_inventory_contract() -> None:
    assert client.get("/api/health").json() == {"status": "ok"}
    artisan_id = str(uuid4())
    created = client.post("/api/products", json=product_payload(artisan_id))
    assert created.status_code == 201
    product = created.json()
    assert product["artisan_id"] == artisan_id

    fetched = client.get(f"/api/products/{product['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == product["id"]

    inventory = client.put(
        f"/api/products/{product['id']}/inventory",
        json={
            "available_quantity": 20,
            "production_capacity": 50,
            "unit": "piece",
        },
    )
    assert inventory.status_code == 200
    assert inventory.json()["available_quantity"] == 20


def test_search_matching_and_quote_flow_contract() -> None:
    product = client.post(
        "/api/products", json=product_payload(str(uuid4()))
    ).json()
    client.put(
        f"/api/products/{product['id']}/inventory",
        json={"available_quantity": 40, "production_capacity": 60, "unit": "piece"},
    )
    search = client.post(
        "/api/search",
        json={
            "query": "100 handmade jute bags under 700",
            "quantity": 100,
            "budget_per_unit": 700,
        },
    )
    assert search.status_code == 200
    assert {"intent", "results"} <= set(search.json())

    matching = client.post(
        "/api/matching/bulk",
        json={
            "query": "100 handmade jute bags",
            "quantity": 100,
            "budget_per_unit": 700,
        },
    )
    assert matching.status_code == 200
    assert matching.json()["required_quantity"] == 100

    quote = client.post(
        "/api/quotes",
        json={
            "buyer_id": str(uuid4()),
            "product_id": product["id"],
            "quantity": 100,
            "budget_per_unit": 700,
            "total_budget": 70000,
            "requirement_text": "100 handmade jute bags for my hotel",
        },
    )
    assert quote.status_code == 201
    matched = client.post(f"/api/quotes/{quote.json()['id']}/match")
    assert matched.status_code == 200
    assert matched.json()["quote_request_id"] == quote.json()["id"]


def test_validation_and_not_found_use_standard_error_shape() -> None:
    invalid = client.post("/api/products", json={"title": "missing fields"})
    assert invalid.status_code == 422
    assert set(invalid.json()) == {"error"}
    assert set(invalid.json()["error"]) == {"code", "message"}

    missing = client.get(f"/api/products/{uuid4()}")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "PRODUCT_NOT_FOUND"