from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.translation.languages import (
    UnsupportedLanguageError,
    normalize_language_code,
)

MAX_TRANSLATION_TEXT_LENGTH = 5000


class TranslationRequest(BaseModel):
    """Request schema for text translation."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=MAX_TRANSLATION_TEXT_LENGTH)
    source_language: str = Field(min_length=2, max_length=20)
    target_language: str = Field(min_length=2, max_length=20)

    @field_validator("text")
    @classmethod
    def text_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("text must not be empty or whitespace only")
        return v.strip()

    @field_validator("source_language")
    @classmethod
    def validate_source_language(cls, v: str) -> str:
        try:
            return normalize_language_code(v, allow_auto=True)
        except UnsupportedLanguageError as exc:
            raise ValueError(str(exc)) from exc

    @field_validator("target_language")
    @classmethod
    def validate_target_language(cls, v: str) -> str:
        try:
            return normalize_language_code(v, allow_auto=False)
        except UnsupportedLanguageError as exc:
            raise ValueError(str(exc)) from exc


class TranslationResponse(BaseModel):
    """Response schema for translated text."""

    model_config = ConfigDict(extra="ignore")

    translated_text: str
    source_language: str
    target_language: str
