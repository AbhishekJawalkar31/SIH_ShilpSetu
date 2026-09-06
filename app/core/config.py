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
    supabase_storage_bucket: str = "product-images"
    gemini_embedding_model: str = "gemini-embedding-001"
    sarvam_api_base_url: str = "https://api.sarvam.ai"
    sarvam_translation_model: str = "sarvam-translate:v1"
    sarvam_translation_mode: str = "formal"
    sarvam_translation_timeout_seconds: float = 20.0
    translation_api_url: str | None = None
    translation_api_key: str | None = None
    max_image_upload_bytes: int = 10 * 1024 * 1024
    max_audio_upload_bytes: int = 15 * 1024 * 1024
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str | None = None
    twilio_whatsapp_from: str | None = None
    fcm_server_key: str | None = None
    auth_required: bool = False
    supabase_jwt_secret: str | None = None
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings: Settings = Settings()
