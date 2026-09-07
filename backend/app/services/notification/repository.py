from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg.rows import dict_row

from app.db.connection import DatabasePoolManager, get_pool_manager
from app.db.exceptions import DatabaseError, DatabaseQueryError
from app.schemas.notification import NotificationListResponse, NotificationResponse


class NotificationNotFoundError(DatabaseError):
    """Raised when a notification with the specified ID does not exist."""


class NotificationRepository:
    """Repository managing in-app notifications in PostgreSQL."""

    def __init__(self, pool_manager: DatabasePoolManager | None = None) -> None:
        self._pool_manager = pool_manager or get_pool_manager()

    async def list_notifications(
        self,
        user_id: UUID | None = None,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> NotificationListResponse:
        """List notifications for a user, optionally filtering for unread only."""
        filters: list[str] = []
        params: dict[str, Any] = {
            "limit": limit,
            "offset": offset,
        }

        if user_id is not None:
            filters.append("user_id = %(user_id)s")
            params["user_id"] = user_id
        if unread_only:
            filters.append("is_read = FALSE")

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

        count_query = f"SELECT COUNT(*) FROM notifications {where_clause};"
        
        unread_clause = f"WHERE user_id = %(user_id)s AND is_read = FALSE" if user_id is not None else "WHERE is_read = FALSE"
        unread_count_query = f"SELECT COUNT(*) FROM notifications {unread_clause};"

        data_query = f"""
            SELECT 
                id,
                user_id,
                type,
                title,
                message,
                reference_type,
                reference_id,
                is_read,
                created_at
            FROM notifications
            {where_clause}
            ORDER BY created_at DESC
            LIMIT %(limit)s OFFSET %(offset)s;
        """

        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(count_query, params)
                    count_row = await cursor.fetchone()
                    total = count_row["count"] if count_row and "count" in count_row else 0

                    await cursor.execute(unread_count_query, params if user_id is not None else {})
                    unread_row = await cursor.fetchone()
                    unread_total = unread_row["count"] if unread_row and "count" in unread_row else 0

                    await cursor.execute(data_query, params)
                    rows = await cursor.fetchall()
                    items = [NotificationResponse.model_validate(row) for row in rows]

                    return NotificationListResponse(
                        items=items,
                        total=total,
                        unread_count=unread_total,
                    )
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to list notifications: {exc}") from exc

    async def mark_as_read(
        self,
        notification_id: UUID,
        expected_user_id: UUID | None = None,
    ) -> NotificationResponse:
        """Mark a specific notification as read."""
        user_check = " AND user_id = %(user_id)s" if expected_user_id is not None else ""
        update_query = f"""
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = %(id)s{user_check}
            RETURNING 
                id,
                user_id,
                type,
                title,
                message,
                reference_type,
                reference_id,
                is_read,
                created_at;
        """
        params: dict[str, Any] = {"id": notification_id}
        if expected_user_id is not None:
            params["user_id"] = expected_user_id

        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(update_query, params)
                    row = await cursor.fetchone()
                    if row is None:
                        raise NotificationNotFoundError(f"Notification {notification_id} not found or access denied.")
                    return NotificationResponse.model_validate(row)
        except NotificationNotFoundError:
            raise
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to mark notification as read: {exc}") from exc
