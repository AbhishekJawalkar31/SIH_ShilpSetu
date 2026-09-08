from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or a local .env file."""

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.6-flash"
    gemini_embedding_model: str = "gemini-embedding-001"
    embedding_dimension: int = 768
    sarvam_api_key: str | None = None
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    database_url: str | None = None

    # Authentication settings
    jwt_secret_key: str = "change-this-in-production-shilpsetu-secret-key-2026"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    auth_required: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings: Settings = Settings()
