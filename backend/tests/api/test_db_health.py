from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.db.connection import (
    DatabasePoolManager,
    get_pool_manager,
    set_pool_manager,
)
from app.db.exceptions import (
    DatabaseConfigurationError,
    DatabaseConnectionError,
)
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_db_health_endpoint_healthy(client: TestClient) -> None:
    with patch("app.main.get_pool_manager") as mock_get_manager:
        mock_manager = AsyncMock()
        mock_manager.check_health.return_value = True
        mock_get_manager.return_value = mock_manager

        response = client.get("/api/health/db")
        assert response.status_code == 200
        assert response.json() == {
            "status": "ok",
            "database": "ok",
        }


def test_db_health_endpoint_unhealthy_false(client: TestClient) -> None:
    with patch("app.main.get_pool_manager") as mock_get_manager:
        mock_manager = AsyncMock()
        mock_manager.check_health.return_value = False
        mock_get_manager.return_value = mock_manager

        response = client.get("/api/health/db")
        assert response.status_code == 503
        assert response.json() == {
            "status": "error",
            "database": "unavailable",
        }


def test_db_health_endpoint_db_connection_error(client: TestClient) -> None:
    with patch("app.main.get_pool_manager") as mock_get_manager:
        mock_manager = AsyncMock()
        mock_manager.check_health.side_effect = DatabaseConnectionError("Failed to connect")
        mock_get_manager.return_value = mock_manager

        response = client.get("/api/health/db")
        assert response.status_code == 503
        assert response.json() == {
            "status": "error",
            "database": "unavailable",
        }


def test_db_health_endpoint_db_configuration_error(client: TestClient) -> None:
    with patch("app.main.get_pool_manager") as mock_get_manager:
        mock_manager = AsyncMock()
        mock_manager.check_health.side_effect = DatabaseConfigurationError("No DATABASE_URL")
        mock_get_manager.return_value = mock_manager

        response = client.get("/api/health/db")
        assert response.status_code == 503
        assert response.json() == {
            "status": "error",
            "database": "unavailable",
        }
