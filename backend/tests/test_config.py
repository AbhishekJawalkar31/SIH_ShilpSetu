from __future__ import annotations

from app.core.config import Settings


def test_settings_load_from_environment(monkeypatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("SARVAM_API_KEY", "test-sarvam-key")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "test-supabase-key")
    monkeypatch.setenv("DATABASE_URL", "postgresql://example")

    settings = Settings(_env_file=None)

    assert settings.gemini_api_key == "test-gemini-key"
    assert settings.sarvam_api_key == "test-sarvam-key"
    assert settings.supabase_url == "https://example.supabase.co"
    assert settings.supabase_anon_key == "test-supabase-key"
    assert settings.database_url == "postgresql://example"
