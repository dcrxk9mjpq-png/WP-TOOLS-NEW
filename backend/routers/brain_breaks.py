"""Brain Breaks - one to two minute mindfulness and movement activities.

These are the platform's *own* guided activities. The server holds the script
(ordered steps, each with a symbol, a number of seconds and a sentence to say
aloud) and the pupil screen animates it and narrates it with the classroom
voice. They need no internet video, show no adverts, cannot trail off into
unrelated content and work on a bad school connection.

Videos deliberately do not live here. Every piece of video the classroom uses -
the morning song, Alphablocks, Numberblocks, movement clips - is managed in one
single place, Watch (``routers/watch.py``), so staff never have to remember
which screen a link was added on.

Like every other classroom concept these are data, not code: an administrator
can rename, re-time, re-order, disable or delete any of them, and can write
entirely new guided breaks without a code change.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.crud import delete_doc, patch_doc, reorder_docs
from core.db import C, get_db
from core.security import current_user, require
from core.util import new_id, serialize_doc, serialize_docs, utcnow_iso

router = APIRouter(prefix="/brain-breaks", tags=["brain breaks"])

PURPOSES = {"calm", "move", "focus"}

FIELDS = {
    "title",
    "description",
    "purpose",
    "symbol_concept",
    "colour",
    "duration_seconds",
    "repeat",
    "steps",
    "enabled",
    "order",
}


def _clean_steps(steps: list | None) -> list[dict]:
    out: list[dict] = []
    for raw in steps or []:
        if not isinstance(raw, dict):
            continue
        title = str(raw.get("title") or "").strip()
        if not title:
            continue
        try:
            seconds = int(raw.get("seconds") or 20)
        except (TypeError, ValueError):
            seconds = 20
        out.append(
            {
                "id": raw.get("id") or new_id(),
                "title": title,
                "say": str(raw.get("say") or title).strip(),
                "symbol_concept": raw.get("symbol_concept") or "regulation.calm",
                "seconds": max(3, min(180, seconds)),
                "pattern": raw.get("pattern") if raw.get("pattern") in {"in", "hold", "out", None} else None,
            }
        )
    return out


def _decorate(doc: dict) -> dict:
    doc = dict(doc)
    doc["kind"] = "guided"
    steps = doc.get("steps") or []
    if steps:
        repeat = max(1, int(doc.get("repeat") or 1))
        doc["duration_seconds"] = sum(int(s.get("seconds") or 0) for s in steps) * repeat
    return doc


def _validate(data: dict) -> dict:
    if data.get("purpose") and data["purpose"] not in PURPOSES:
        raise HTTPException(400, "Purpose must be calm, move or focus.")
    try:
        data["repeat"] = max(1, min(20, int(data.get("repeat") or 1)))
    except (TypeError, ValueError):
        data["repeat"] = 1
    data["steps"] = _clean_steps(data.get("steps"))
    if not data["steps"]:
        raise HTTPException(400, "A guided break needs at least one step.")
    data["duration_seconds"] = sum(s["seconds"] for s in data["steps"]) * data["repeat"]
    return data


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@router.get("")
async def list_breaks(
    enabled_only: bool = False,
    user: dict = Depends(current_user),
):
    """Readable by anyone signed in, including the pupil-facing display."""
    db = get_db()
    query: dict = {"enabled": True} if enabled_only else {}
    docs = await db[C.brain_breaks].find(query, {"_id": 0}).sort("order", 1).to_list(200)
    return serialize_docs([_decorate(d) for d in docs])


@router.post("")
async def create_break(body: dict, user: dict = Depends(require("brain_breaks.edit"))):
    db = get_db()
    data = _validate({k: v for k, v in body.items() if k in FIELDS})
    if not str(data.get("title") or "").strip():
        raise HTTPException(400, "Give the brain break a name.")
    doc = {
        "id": new_id(),
        "purpose": "calm",
        "symbol_concept": "regulation.calm",
        "colour": "mint",
        "description": "",
        "repeat": 1,
        "enabled": True,
        "is_sample": False,
        "created_at": utcnow_iso(),
        "order": await db[C.brain_breaks].count_documents({}),
        **data,
    }
    await db[C.brain_breaks].insert_one(dict(doc))
    return serialize_doc(_decorate(doc))


@router.post("/reorder")
async def reorder(body: dict, user: dict = Depends(require("brain_breaks.edit"))):
    return await reorder_docs(C.brain_breaks, body.get("ids", []))


class RunIn(BaseModel):
    break_id: str
    pupil_id: str | None = None
    completed: bool = True
    note: str = Field(default="", max_length=400)


@router.post("/runs")
async def log_run(body: RunIn, user: dict = Depends(current_user)):
    """A light record so brain breaks show up in progress patterns."""
    db = get_db()
    doc = {
        "id": new_id(),
        **body.model_dump(),
        "at": utcnow_iso(),
        "staff_id": user["id"],
    }
    await db[C.brain_break_runs].insert_one(dict(doc))
    return {"ok": True}


@router.get("/runs")
async def list_runs(limit: int = 30, user: dict = Depends(current_user)):
    db = get_db()
    runs = await db[C.brain_break_runs].find({}, {"_id": 0}).sort("at", -1).to_list(min(limit, 200))
    breaks = {b["id"]: b for b in await db[C.brain_breaks].find({}, {"_id": 0}).to_list(200)}
    pupils = {p["id"]: p for p in await db[C.pupils].find({}, {"_id": 0}).to_list(500)}
    for run in runs:
        run["brain_break"] = breaks.get(run.get("break_id"))
        run["pupil"] = pupils.get(run.get("pupil_id"))
    return serialize_docs(runs)


@router.patch("/{break_id}")
async def update_break(break_id: str, body: dict, user: dict = Depends(require("brain_breaks.edit"))):
    db = get_db()
    existing = await db[C.brain_breaks].find_one({"id": break_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Brain break not found")
    patch = {k: v for k, v in body.items() if k in FIELDS}
    if {"steps", "repeat", "duration_seconds"} & set(patch):
        merged = _validate({**existing, **patch})
        patch = {
            **patch,
            **{k: v for k, v in merged.items() if k in patch or k in {"duration_seconds", "repeat"}},
        }
    updated = await patch_doc(C.brain_breaks, break_id, patch, FIELDS)
    return serialize_doc(_decorate(updated))


@router.delete("/{break_id}")
async def remove_break(break_id: str, user: dict = Depends(require("brain_breaks.edit"))):
    return await delete_doc(C.brain_breaks, break_id)
