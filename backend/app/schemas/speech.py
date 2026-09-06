from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class SpeechTranscriptionResponse(BaseModel):
    """Speech transcription output for POST /api/speech/transcribe."""

    model_config = ConfigDict(extra="forbid")

    text: str
    language: str
