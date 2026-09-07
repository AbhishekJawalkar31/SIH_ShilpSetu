from __future__ import annotations

from typing import Any, AsyncIterator
from uuid import UUID

from psycopg.rows import dict_row

from app.db.connection import DatabasePoolManager, get_pool_manager
from app.db.exceptions import DatabaseQueryError
from app.schemas.artisan import ArtisanProfileResponse


class ArtisanRepository:
    """Repository for querying artisan profile information from PostgreSQL."""

    def __init__(self, pool_manager: DatabasePoolManager | None = None) -> None:
        self._pool_manager = pool_manager or get_pool_manager()

    async def get_artisan_by_id(self, artisan_id: UUID) -> ArtisanProfileResponse | None:
        """Fetch artisan profile joined with user account data."""
        query = """
            SELECT 
                a.id,
                a.user_id,
                u.name,
                a.business_name,
                a.craft_type,
                a.description,
                a.location,
                a.city,
                a.state,
                a.country,
                a.languages,
                a.rating,
                a.created_at,
                a.updated_at
            FROM artisans a
            JOIN users u ON a.user_id = u.id
            WHERE a.id = %(artisan_id)s;
        """
        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(query, {"artisan_id": artisan_id})
                    row = await cursor.fetchone()
                    if row is None:
                        return None
                    return ArtisanProfileResponse.model_validate(row)
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to fetch artisan {artisan_id}: {exc}") from exc
