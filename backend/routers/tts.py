"""Speech endpoints.

The browser sends the phrase it wants spoken and gets back an ``audio/mpeg``
body it can play immediately. The frontend keeps its own in-memory blob cache
and falls back to the device's speech synthesis whenever this returns 503.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from core import tts
from core.db import C, get_db
from core.security import current_user, require

logger = logging.getLogger("western_park.tts")

router = APIRouter(prefix="/tts", tags=["speech"])


class SpeakIn(BaseModel):
    text: str = Field(min_length=1)
    voice: str | None = None
    model_id: str | None = None
    pupil_id: str | None = None


async def _settings() -> dict:
    db = get_db()
    return await db[C.settings].find_one({"id": "global"}, {"_id": 0}) or {}


async def _voice_for(pupil_id: str | None, requested: str | None) -> tuple[str, str, bool]:
    """Resolve (voice_key, model_id, enabled) from request > pupil > class default."""
    settings = await _settings()
    conf = settings.get("tts") or {}
    enabled = conf.get("enabled", True)
    voice = requested
    if not voice and pupil_id:
        db = get_db()
        pupil = await db[C.pupils].find_one({"id": pupil_id}, {"_id": 0, "tts": 1})
        pupil_conf = (pupil or {}).get("tts") or {}
        if pupil_conf.get("enabled") is False:
            enabled = False
        voice = pupil_conf.get("voice")
    if not voice:
        voice = conf.get("voice") or tts.DEFAULT_VOICE_KEY
    return voice, conf.get("model_id") or tts.DEFAULT_MODEL_ID, bool(enabled)


@router.get("/status")
async def status(user: dict = Depends(current_user)):
    """What the frontend needs to decide whether to try the server at all."""
    settings = await _settings()
    conf = settings.get("tts") or {}
    return {
        "configured": tts.is_configured(),
        "enabled": bool(conf.get("enabled", True)) and tts.is_configured(),
        "voice": conf.get("voice") or tts.DEFAULT_VOICE_KEY,
        "model_id": conf.get("model_id") or tts.DEFAULT_MODEL_ID,
        "voices": tts.public_voices(),
        "models": list(tts.MODELS),
        "provider": "ElevenLabs",
    }


@router.get("/cache")
async def cache(user: dict = Depends(require("settings.edit"))):
    return tts.cache_stats()


@router.delete("/cache")
async def drop_cache(user: dict = Depends(require("settings.edit"))):
    return {"ok": True, "removed": tts.clear_cache()}


@router.post("/speak")
async def speak(body: SpeakIn, user: dict = Depends(current_user)):
    voice, model_id, enabled = await _voice_for(body.pupil_id, body.voice)
    if not enabled:
        raise HTTPException(503, "Natural voices are switched off for this classroom.")
    try:
        audio, meta = await tts.speak(body.text, voice=voice, model_id=body.model_id or model_id)
    except tts.TTSUnavailable as exc:
        # 503 is the agreed signal for "use the device voice instead".
        logger.warning("tts unavailable: %s", exc)
        raise HTTPException(503, str(exc)) from None
    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "private, max-age=86400",
            "X-Tts-Voice": meta["voice_name"],
            "X-Tts-Cached": "1" if meta["cached"] else "0",
            "X-Tts-Model": meta["model_id"],
            "Content-Disposition": 'inline; filename="speech.mp3"',
        },
    )
