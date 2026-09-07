from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg.rows import dict_row

from app.db.connection import DatabasePoolManager, get_pool_manager
from app.db.exceptions import DatabaseError, DatabaseQueryError
from app.schemas.auth import AuthUser, UserRegisterRequest


class UserAlreadyExistsError(DatabaseError):
    """Raised when trying to register an email that is already registered."""


class UserRepository:
    """Repository managing user account lookups, registration, and artisan linkages."""

    def __init__(self, pool_manager: DatabasePoolManager | None = None) -> None:
        self._pool_manager = pool_manager or get_pool_manager()

    async def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        """Fetch user record by normalized email."""
        query = """
            SELECT 
                u.id,
                u.name,
                u.email,
                u.phone,
                u.role,
                u.password_hash,
                COALESCE(u.is_active, TRUE) AS is_active,
                a.id AS artisan_id
            FROM users u
            LEFT JOIN artisans a ON a.user_id = u.id
            WHERE LOWER(u.email) = LOWER(%(email)s);
        """
        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(query, {"email": email.strip()})
                    return await cursor.fetchone()
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to lookup user by email: {exc}") from exc

    async def get_user_by_id(self, user_id: UUID) -> AuthUser | None:
        """Fetch user profile by UUID."""
        query = """
            SELECT 
                u.id,
                u.name,
                u.email,
                u.phone,
                u.role,
                COALESCE(u.is_active, TRUE) AS is_active,
                a.id AS artisan_id
            FROM users u
            LEFT JOIN artisans a ON a.user_id = u.id
            WHERE u.id = %(user_id)s;
        """
        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(query, {"user_id": user_id})
                    row = await cursor.fetchone()
                    if row is None:
                        return None
                    return AuthUser.model_validate(row)
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to fetch user by ID: {exc}") from exc

    async def create_user(self, request: UserRegisterRequest, password_hash: str) -> AuthUser:
        """Atomically create a user, and if role is artisan, create corresponding artisan profile."""
        check_email_query = "SELECT id FROM users WHERE LOWER(email) = LOWER(%(email)s);"

        insert_user_query = """
            INSERT INTO users (
                name,
                email,
                phone,
                role,
                password_hash,
                is_active
            ) VALUES (
                %(name)s,
                %(email)s,
                %(phone)s,
                %(role)s,
                %(password_hash)s,
                TRUE
            ) RETURNING 
                id,
                name,
                email,
                phone,
                role,
                is_active;
        """

        insert_artisan_query = """
            INSERT INTO artisans (
                user_id,
                business_name,
                craft_type,
                city,
                state
            ) VALUES (
                %(user_id)s,
                %(business_name)s,
                %(craft_type)s,
                %(city)s,
                %(state)s
            ) RETURNING id;
        """

        normalized_email = request.email.lower().strip()

        try:
            async with self._pool_manager.connection() as conn:
                async with conn.transaction():
                    async with conn.cursor(row_factory=dict_row) as cursor:
                        # 1. Check duplicate
                        await cursor.execute(check_email_query, {"email": normalized_email})
                        existing = await cursor.fetchone()
                        if existing is not None:
                            raise UserAlreadyExistsError(f"User with email '{normalized_email}' already exists.")

                        # 2. Insert user
                        user_params = {
                            "name": request.name,
                            "email": normalized_email,
                            "phone": request.phone,
                            "role": request.role,
                            "password_hash": password_hash,
                        }
                        await cursor.execute(insert_user_query, user_params)
                        user_row = await cursor.fetchone()
                        if user_row is None:
                            raise DatabaseQueryError("Failed to insert user record.")

                        new_user_id = user_row["id"]
                        artisan_id: UUID | None = None

                        # 3. If role is artisan, create an artisan record
                        if request.role == "artisan":
                            artisan_params = {
                                "user_id": new_user_id,
                                "business_name": request.business_name or f"{request.name} Workshop",
                                "craft_type": request.craft_type or "Traditional Crafts",
                                "city": request.city,
                                "state": request.state,
                            }
                            await cursor.execute(insert_artisan_query, artisan_params)
                            artisan_row = await cursor.fetchone()
                            if artisan_row:
                                artisan_id = artisan_row["id"]

                        user_dict = dict(user_row)
                        user_dict["artisan_id"] = artisan_id
                        return AuthUser.model_validate(user_dict)
        except UserAlreadyExistsError:
            raise
        except DatabaseError:
            raise
        except Exception as exc:
            raise DatabaseQueryError(f"Failed to create user: {exc}") from exc
