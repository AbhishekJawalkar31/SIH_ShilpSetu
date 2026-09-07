from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health_check(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_registered_routes() -> None:
    openapi_schema = app.openapi()
    paths = openapi_schema.get("paths", {})

    assert "/api/health" in paths
    assert "get" in paths["/api/health"]

    assert "/api/health/db" in paths
    assert "get" in paths["/api/health/db"]

    assert "/api/catalogue/generate" in paths
    assert "post" in paths["/api/catalogue/generate"]

    assert "/api/search" in paths
    assert "post" in paths["/api/search"]

    assert "/api/matching/bulk" in paths
    assert "post" in paths["/api/matching/bulk"]

    assert "/api/speech/transcribe" in paths
    assert "post" in paths["/api/speech/transcribe"]

    assert "/api/artisans/{artisan_id}" in paths
    assert "get" in paths["/api/artisans/{artisan_id}"]

    assert "/api/artisans/{artisan_id}/products" in paths
    assert "get" in paths["/api/artisans/{artisan_id}/products"]

    assert "/api/products" in paths
    assert "get" in paths["/api/products"]
    assert "post" in paths["/api/products"]

    assert "/api/products/{product_id}" in paths
    assert "get" in paths["/api/products/{product_id}"]

    assert "/api/products/{product_id}/inventory" in paths
    assert "put" in paths["/api/products/{product_id}/inventory"]

    assert "/api/translate" in paths
    assert "post" in paths["/api/translate"]

    assert "/api/quotes" in paths
    assert "get" in paths["/api/quotes"]
    assert "post" in paths["/api/quotes"]

    assert "/api/quotes/{quote_id}" in paths
    assert "get" in paths["/api/quotes/{quote_id}"]

    assert "/api/quotes/{quote_id}/accept" in paths
    assert "post" in paths["/api/quotes/{quote_id}/accept"]

    assert "/api/orders" in paths
    assert "get" in paths["/api/orders"]

    assert "/api/orders/{order_id}" in paths
    assert "get" in paths["/api/orders/{order_id}"]

    assert "/api/orders/{order_id}/items" in paths
    assert "get" in paths["/api/orders/{order_id}/items"]

    assert "/api/notifications" in paths
    assert "get" in paths["/api/notifications"]

    assert "/api/notifications/unread" in paths
    assert "get" in paths["/api/notifications/unread"]

    assert "/api/notifications/{notification_id}/read" in paths
    assert "patch" in paths["/api/notifications/{notification_id}/read"]

    assert "/api/auth/register" in paths
    assert "post" in paths["/api/auth/register"]

    assert "/api/auth/login" in paths
    assert "post" in paths["/api/auth/login"]

    assert "/api/auth/me" in paths
    assert "get" in paths["/api/auth/me"]
