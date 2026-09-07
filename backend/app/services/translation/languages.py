from __future__ import annotations

from typing import Final


# Canonical 22 Scheduled Indian Languages + English in Sarvam BCP-47 form
SARVAM_LANGUAGE_CODES: Final[frozenset[str]] = frozenset(
    {
        "as-IN",
        "bn-IN",
        "brx-IN",
        "doi-IN",
        "en-IN",
        "gu-IN",
        "hi-IN",
        "kn-IN",
        "kok-IN",
        "ks-IN",
        "mai-IN",
        "ml-IN",
        "mni-IN",
        "mr-IN",
        "ne-IN",
        "od-IN",
        "pa-IN",
        "sa-IN",
        "sat-IN",
        "sd-IN",
        "ta-IN",
        "te-IN",
        "ur-IN",
    }
)

LANGUAGE_ALIASES: Final[dict[str, str]] = {
    alias: code
    for code in SARVAM_LANGUAGE_CODES
    for alias in (code.lower(), code.split("-", 1)[0])
}

# Add full English names and common alternatives
LANGUAGE_ALIASES.update(
    {
        "auto": "auto",
        "assamese": "as-IN",
        "bengali": "bn-IN",
        "bodo": "brx-IN",
        "dogri": "doi-IN",
        "english": "en-IN",
        "gujarati": "gu-IN",
        "hindi": "hi-IN",
        "kannada": "kn-IN",
        "kashmiri": "ks-IN",
        "konkani": "kok-IN",
        "maithili": "mai-IN",
        "malayalam": "ml-IN",
        "manipuri": "mni-IN",
        "marathi": "mr-IN",
        "nepali": "ne-IN",
        "odia": "od-IN",
        "oriya": "od-IN",
        "punjabi": "pa-IN",
        "sanskrit": "sa-IN",
        "santali": "sat-IN",
        "sindhi": "sd-IN",
        "tamil": "ta-IN",
        "telugu": "te-IN",
        "urdu": "ur-IN",
    }
)


class UnsupportedLanguageError(ValueError):
    """Raised when a language code is not supported by the translation provider."""


def normalize_language_code(value: str, *, allow_auto: bool = False) -> str:
    """Return a canonical Sarvam language code (e.g. 'mr-IN') for a user-facing code."""
    normalized = value.strip().lower().replace("_", "-")
    if not normalized:
        raise UnsupportedLanguageError("Language code must not be blank.")

    if normalized == "auto":
        if allow_auto:
            return "auto"
        raise UnsupportedLanguageError("Automatic detection is only valid for source_language.")

    canonical = LANGUAGE_ALIASES.get(normalized)
    if canonical is None:
        raise UnsupportedLanguageError(
            f"Unsupported language '{value}'. Use a supported Indian language code or English."
        )
    return canonical
