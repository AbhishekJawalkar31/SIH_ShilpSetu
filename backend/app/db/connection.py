from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import psycopg
from pgvector.psycopg import register_vector_async
from psycopg_pool import AsyncConnectionPool

from app.core.config import settings
from app.db.exceptions import (
    DatabaseConfigurationError,
    DatabaseConnectionError,
)


class DatabasePoolManager:
    """Manages an asynchronous connection pool with pgvector type registration."""

    def __init__(
        self,
        database_url: str | None = None,
        min_size: int = 1,
        max_size: int = 10,
    ) -> None:
        self._database_url = database_url
        self._min_size = min_size
        self._max_size = max_size
        self._pool: AsyncConnectionPool | None = None

    def _resolve_url(self) -> str:
        url = self._database_url or settings.database_url
        if not url:
            raise DatabaseConfigurationError("DATABASE_URL is not configured.")
        return url

    async def get_pool(self) -> AsyncConnectionPool:
        if self._pool is None or self._pool.closed:
            url = self._resolve_url()
            try:
                self._pool = AsyncConnectionPool(
                    conninfo=url,
                    min_size=self._min_size,
                    max_size=self._max_size,
                    open=False,
                    configure=register_vector_async,
                )
                await self._pool.open()
            except Exception as exc:
                raise DatabaseConnectionError(f"Failed to open database connection pool: {exc}") from exc
        return self._pool

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[psycopg.AsyncConnection]:
        pool = await self.get_pool()
        try:
            async with pool.connection() as conn:
                yield conn
        except (DatabaseConfigurationError, DatabaseConnectionError):
            raise
        except Exception as exc:
            raise DatabaseConnectionError(f"Database connection error: {exc}") from exc

    async def check_health(self) -> bool:
        """Perform a lightweight health check query (SELECT 1)."""
        async with self.connection() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute("SELECT 1;")
                row = await cursor.fetchone()
                return row is not None and row[0] == 1

    async def close(self) -> None:
        if self._pool is not None and not self._pool.closed:
            await self._pool.close()
            self._pool = None


# Default global pool manager instance for application lifecycle
_default_pool_manager: DatabasePoolManager = DatabasePoolManager()


def get_pool_manager() -> DatabasePoolManager:
    """Get the current application pool manager."""
    return _default_pool_manager


def set_pool_manager(manager: DatabasePoolManager) -> None:
    """Set or override the application pool manager (useful for testing)."""
    global _default_pool_manager
    _default_pool_manager = manager


async def init_db_pool() -> None:
    """
    Initialize the database connection pool during application startup.
    Does not raise an exception if DATABASE_URL is not configured or if initial
    connection fails, keeping the FastAPI application importable and alive.
    """
    try:
        await _default_pool_manager.get_pool()
    except (DatabaseConfigurationError, DatabaseConnectionError):
        # Graceful fallback: application remains alive even if DB is unavailable at startup
        pass


async def close_db_pool() -> None:
    """Close the database connection pool during application shutdown."""
    await _default_pool_manager.close()


@asynccontextmanager
async def get_db_connection(
    database_url: str | None = None,
) -> AsyncIterator[psycopg.AsyncConnection]:
    """Provide a single asynchronous connection with pgvector registered."""
    url = database_url or settings.database_url
    if not url:
        raise DatabaseConfigurationError("DATABASE_URL is not configured.")

    try:
        conn = await psycopg.AsyncConnection.connect(url, autocommit=False)
    except Exception as exc:
        raise DatabaseConnectionError(f"Could not connect to PostgreSQL: {exc}") from exc

    try:
        await register_vector_async(conn)
        yield conn
    finally:
        await conn.close()
