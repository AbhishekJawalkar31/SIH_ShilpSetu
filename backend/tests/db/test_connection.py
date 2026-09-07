from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.connection import (
    DatabasePoolManager,
    close_db_pool,
    get_pool_manager,
    init_db_pool,
    set_pool_manager,
)
from app.db.exceptions import (
    DatabaseConfigurationError,
    DatabaseConnectionError,
)


class FakeCursor:
    def __init__(self, fetch_result: tuple[int, ...] | None = (1,), error: Exception | None = None) -> None:
        self.fetch_result = fetch_result
        self.error = error
        self.executed_queries: list[str] = []

    async def execute(self, query: str, params: Any = None) -> None:
        self.executed_queries.append(query)
        if self.error is not None:
            raise self.error

    async def fetchone(self) -> tuple[int, ...] | None:
        return self.fetch_result


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self._cursor = cursor

    @asynccontextmanager
    async def cursor(self) -> AsyncIterator[FakeCursor]:
        yield self._cursor


class FakePool:
    def __init__(self, connection: FakeConnection, closed: bool = False, open_error: Exception | None = None) -> None:
        self._connection = connection
        self.closed = closed
        self._open_error = open_error
        self.open_called = False
        self.close_called = False

    async def open(self) -> None:
        self.open_called = True
        if self._open_error is not None:
            raise self._open_error

    async def close(self) -> None:
        self.close_called = True
        self.closed = True

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[FakeConnection]:
        yield self._connection


@pytest.mark.anyio
async def test_pool_manager_requires_database_url() -> None:
    manager = DatabasePoolManager(database_url=None)
    with patch("app.db.connection.settings.database_url", None):
        with pytest.raises(DatabaseConfigurationError, match="DATABASE_URL is not configured"):
            await manager.get_pool()


@pytest.mark.anyio
async def test_pool_manager_get_pool_and_close() -> None:
    fake_cursor = FakeCursor(fetch_result=(1,))
    fake_conn = FakeConnection(fake_cursor)
    fake_pool = FakePool(fake_conn)

    manager = DatabasePoolManager(database_url="postgresql://user:pass@localhost:5432/testdb")

    with patch("app.db.connection.AsyncConnectionPool", return_value=fake_pool):
        pool = await manager.get_pool()
        assert pool is fake_pool
        assert fake_pool.open_called is True
        assert fake_pool.closed is False

        await manager.close()
        assert fake_pool.close_called is True
        assert manager._pool is None


@pytest.mark.anyio
async def test_pool_manager_open_error_raises_database_connection_error() -> None:
    fake_cursor = FakeCursor()
    fake_conn = FakeConnection(fake_cursor)
    fake_pool = FakePool(fake_conn, open_error=RuntimeError("connection refused"))

    manager = DatabasePoolManager(database_url="postgresql://user:pass@localhost:5432/testdb")

    with patch("app.db.connection.AsyncConnectionPool", return_value=fake_pool):
        with pytest.raises(DatabaseConnectionError, match="Failed to open database connection pool"):
            await manager.get_pool()


@pytest.mark.anyio
async def test_pool_manager_check_health_success() -> None:
    fake_cursor = FakeCursor(fetch_result=(1,))
    fake_conn = FakeConnection(fake_cursor)
    fake_pool = FakePool(fake_conn)

    manager = DatabasePoolManager(database_url="postgresql://user:pass@localhost:5432/testdb")

    with patch("app.db.connection.AsyncConnectionPool", return_value=fake_pool):
        healthy = await manager.check_health()
        assert healthy is True
        assert "SELECT 1;" in fake_cursor.executed_queries


@pytest.mark.anyio
async def test_pool_manager_check_health_failure() -> None:
    fake_cursor = FakeCursor(error=RuntimeError("query failed"))
    fake_conn = FakeConnection(fake_cursor)
    fake_pool = FakePool(fake_conn)

    manager = DatabasePoolManager(database_url="postgresql://user:pass@localhost:5432/testdb")

    with patch("app.db.connection.AsyncConnectionPool", return_value=fake_pool):
        with pytest.raises(DatabaseConnectionError):
            await manager.check_health()


@pytest.mark.anyio
async def test_init_and_close_db_pool_lifecycle() -> None:
    fake_manager = MagicMock(spec=DatabasePoolManager)
    fake_manager.get_pool = AsyncMock()
    fake_manager.close = AsyncMock()

    original_manager = get_pool_manager()
    try:
        set_pool_manager(fake_manager)
        await init_db_pool()
        fake_manager.get_pool.assert_awaited_once()

        await close_db_pool()
        fake_manager.close.assert_awaited_once()
    finally:
        set_pool_manager(original_manager)


@pytest.mark.anyio
async def test_init_db_pool_survives_missing_db() -> None:
    fake_manager = MagicMock(spec=DatabasePoolManager)
    fake_manager.get_pool = AsyncMock(side_effect=DatabaseConfigurationError("Missing DB"))

    original_manager = get_pool_manager()
    try:
        set_pool_manager(fake_manager)
        # Should not raise exception
        await init_db_pool()
        fake_manager.get_pool.assert_awaited_once()
    finally:
        set_pool_manager(original_manager)
