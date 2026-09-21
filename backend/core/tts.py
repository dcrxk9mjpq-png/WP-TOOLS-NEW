"""Text to speech.

A single, small, self-contained speech engine for the whole platform.

Why it is built this way
------------------------
* Pupils in the DSP tap the same communication symbol dozens of times a day.
  Re-synthesising "I would like a drink please" every single tap would be slow
  and would burn ElevenLabs characters for no benefit, so every clip is cached
  on disk, keyed by (model, voice, normalised text). A cache hit is a local file
  read - effectively instant, and free.
* The supplied ElevenLabs API key is scoped to text-to-speech only: the
  ``/v1/voices`` and ``/v1/user/subscription`` endpoints return 401
  ``missing_permissions``. The voice list is therefore a curated, verified set of
  British English voices held here rather than fetched at runtime. Each voice id
  below was confirmed working against the live API.
* This is a classroom tool. Speech must never hard-fail in front of a child, so
  every failure path raises :class:`TTSUnavailable` and the browser falls back to
  the device's own speech synthesis.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger("western_park.tts")

MAX_CHARS = 400
DEFAULT_OUTPUT_FORMAT = "mp3_44100_128"


# --------------------------------------------------------------------------- #
# Curated British English voices (verified against the live API)
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Voice:
    key: str
    voice_id: str
    name: str
    gender: str
    description: str


VOICES: tuple[Voice, ...] = (
    Voice(
        key="uk_female_warm",
        voice_id="pFZP5JQG7iQjIQuC4Bku",
        name="Lily",
        gender="female",
        description="British English, adult female. Warm and unhurried - the default classroom voice.",
    ),
    Voice(
        key="uk_female_clear",
        voice_id="Xb7hH8MSUJpSbSDYk0k2",
        name="Alice",
        gender="female",
        description="British English, adult female. Brighter and more clearly articulated.",
    ),
    Voice(
        key="uk_male_warm",
        voice_id="JBFqnCBsd6RMkjVDRZzb",
        name="George",
        gender="male",
        description="British English, adult male. Warm and gentle.",
    ),
    Voice(
        key="uk_male_calm",
        voice_id="onwK4e9ZLuTAKqWW03F9",
        name="Daniel",
        gender="male",
        description="British English, adult male. Calm and even, good for instructions.",
    ),
)

VOICES_BY_KEY: dict[str, Voice] = {v.key: v for v in VOICES}
VOICES_BY_ID: dict[str, Voice] = {v.voice_id: v for v in VOICES}

DEFAULT_VOICE_KEY = "uk_female_warm"

# eleven_turbo_v2_5 answers in ~0.2s which matters when a child taps a symbol.
# eleven_multilingual_v2 is richer but ~0.9s; offered as a quality option.
MODELS: tuple[dict[str, str], ...] = (
    {
        "id": "eleven_turbo_v2_5",
        "label": "Fast (recommended)",
        "note": "Responds in about a fifth of a second. Best for tapping symbols.",
    },
    {
        "id": "eleven_multilingual_v2",
        "label": "Highest quality",
        "note": "Slightly richer voice, about one second to respond.",
    },
)
MODEL_IDS = {m["id"] for m in MODELS}
DEFAULT_MODEL_ID = "eleven_turbo_v2_5"


class TTSUnavailable(RuntimeError):
    """Raised when speech cannot be produced. Callers fall back to the device."""


# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #
def api_key() -> str | None:
    key = (os.environ.get("ELEVENLABS_API_KEY") or "").strip()
    return key or None


def is_configured() -> bool:
    return api_key() is not None


def cache_dir() -> Path:
    path = Path(os.environ.get("TTS_CACHE_DIR") or (Path(__file__).resolve().parents[1] / "assets" / "tts"))
    path.mkdir(parents=True, exist_ok=True)
    return path


def resolve_voice(voice: str | None) -> Voice:
    """Accept a curated key, a raw ElevenLabs voice id, or nothing."""
    if voice:
        if voice in VOICES_BY_KEY:
            return VOICES_BY_KEY[voice]
        if voice in VOICES_BY_ID:
            return VOICES_BY_ID[voice]
    return VOICES_BY_KEY[DEFAULT_VOICE_KEY]


def resolve_model(model_id: str | None) -> str:
    return model_id if model_id in MODEL_IDS else DEFAULT_MODEL_ID


# --------------------------------------------------------------------------- #
# Cache
# --------------------------------------------------------------------------- #
_WHITESPACE = re.compile(r"\s+")


def normalise(text: str) -> str:
    """Normalise for both the cache key and the request itself.

    Symbol labels arrive with inconsistent casing and stray whitespace from the
    configuration screens; "Snack  time" and "snack time" must not be billed and
    stored twice.
    """
    cleaned = unicodedata.normalize("NFKC", str(text or "")).replace("\u2019", "'")
    return _WHITESPACE.sub(" ", cleaned).strip()


def cache_key(text: str, voice_id: str, model_id: str) -> str:
    raw = f"{model_id}|{voice_id}|{normalise(text).lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def cache_path(text: str, voice_id: str, model_id: str) -> Path:
    return cache_dir() / f"{cache_key(text, voice_id, model_id)}.mp3"


def cache_stats() -> dict:
    files = list(cache_dir().glob("*.mp3"))
    return {
        "clips": len(files),
        "bytes": sum(f.stat().st_size for f in files),
    }


def clear_cache() -> int:
    removed = 0
    for f in cache_dir().glob("*.mp3"):
        try:
            f.unlink()
            removed += 1
        except OSError:  # pragma: no cover - defensive
            pass
    return removed


# --------------------------------------------------------------------------- #
# Synthesis
# --------------------------------------------------------------------------- #
def _synthesize_blocking(text: str, voice_id: str, model_id: str) -> bytes:
    key = api_key()
    if not key:
        raise TTSUnavailable("No ElevenLabs API key is configured.")
    try:
        from elevenlabs.client import ElevenLabs
    except ImportError as exc:  # pragma: no cover - dependency is pinned
        raise TTSUnavailable("The elevenlabs package is not installed.") from exc

    client = ElevenLabs(api_key=key, timeout=30.0)
    try:
        stream = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id=model_id,
            output_format=DEFAULT_OUTPUT_FORMAT,
        )
        audio = b"".join(chunk for chunk in stream if chunk)
    except Exception as exc:  # noqa: BLE001 - any API/network failure degrades gracefully
        raise TTSUnavailable(f"ElevenLabs could not produce speech: {exc}") from exc
    if not audio:
        raise TTSUnavailable("ElevenLabs returned no audio.")
    return audio


async def speak(
    text: str,
    voice: str | None = None,
    model_id: str | None = None,
) -> tuple[bytes, dict]:
    """Return ``(mp3_bytes, meta)``. Raises :class:`TTSUnavailable` on failure."""
    phrase = normalise(text)
    if not phrase:
        raise TTSUnavailable("There is nothing to say.")
    if len(phrase) > MAX_CHARS:
        phrase = phrase[:MAX_CHARS].rsplit(" ", 1)[0]

    chosen = resolve_voice(voice)
    model = resolve_model(model_id)
    path = cache_path(phrase, chosen.voice_id, model)
    meta = {
        "voice_key": chosen.key,
        "voice_id": chosen.voice_id,
        "voice_name": chosen.name,
        "model_id": model,
        "characters": len(phrase),
        "cached": True,
    }

    if path.exists() and path.stat().st_size > 0:
        return path.read_bytes(), meta

    audio = await asyncio.to_thread(_synthesize_blocking, phrase, chosen.voice_id, model)
    meta["cached"] = False
    # Write via a temporary file so a killed process can never leave a truncated
    # clip in the cache that would then be served forever.
    tmp = path.with_suffix(".part")
    try:
        tmp.write_bytes(audio)
        tmp.replace(path)
    except OSError as exc:  # pragma: no cover - defensive
        logger.warning("could not cache tts clip: %s", exc)
        tmp.unlink(missing_ok=True)
    return audio, meta


def public_voices() -> list[dict]:
    return [
        {
            "key": v.key,
            "name": v.name,
            "gender": v.gender,
            "accent": "British English",
            "description": v.description,
            "is_default": v.key == DEFAULT_VOICE_KEY,
        }
        for v in VOICES
    ]
