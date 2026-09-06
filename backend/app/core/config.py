from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or a local .env file."""

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    sarvam_api_key: str | None = None
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    database_url: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings: Settings = Settings()
