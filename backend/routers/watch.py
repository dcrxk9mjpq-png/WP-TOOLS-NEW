"""Watch - the classroom's video library.

One place for every piece of video the classroom uses, so staff never have to
remember which screen a link was added on.

Why it is a library and not a list of hard-coded videos: the provision decides
what its children watch. The platform ships with the videos taken from the
school's own Morning Meeting PowerPoint plus the official Alphablocks and
Numberblocks channels, all clearly marked as sample content, and every one of
them can be renamed, re-collected, hidden or deleted.

Collections map onto the moments in the day when a video is actually reached
for, rather than onto content genres:

``morning_song``  the song that opens Morning Meeting
``learning``      Alphablocks, Numberblocks and similar, used in transitions
``movement``      wake-the-body-up clips
``calm``          settle-the-body-down clips
``story``         story time
``other``         anything else

``featured`` means "on today's board" - it is what the pupil-facing Watch screen
and the Today screen surface, so a child is offered a short, chosen set rather
than an entire library.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from core import videolink
from core.crud import delete_doc, patch_doc, reorder_docs
from core.db import C, get_db
from core.security import current_user, require
from core.util import new_id, serialize_doc, serialize_docs, utcnow_iso

router = APIRouter(prefix="/watch", tags=["watch"])

COLLECTIONS = ("morning_song", "learning", "movement", "calm", "story", "other")

COLLECTION_LABELS = {
    "morning_song": "Morning song",
    "learning": "Learning",
    "movement": "Movement",
    "calm": "Calming",
    "story": "Story time",
    "other": "Other",
}

FIELDS = {
    "title",
    "description",
    "url",
    "collection",
    "symbol_concept",
    "duration_seconds",
    "enabled",
    "featured",
    "order",
}


def _decorate(doc: dict) -> dict:
    doc = dict(doc)
    doc["video"] = videolink.describe(doc.get("url") or "")
    doc["collection_label"] = COLLECTION_LABELS.get(doc.get("collection"), "Other")
    return doc


def _validate(data: dict) -> dict:
    url = str(data.get("url") or "").strip()
    if not url:
        raise HTTPException(400, "Add the link to the video.")
    described = videolink.describe(url)
    if described["provider"] == "unknown":
        raise HTTPException(400, "That does not look like a web link. It must start with https://")
    data["url"] = url
    if data.get("collection") and data["collection"] not in COLLECTIONS:
        raise HTTPException(400, "That is not one of the collections.")
    try:
        data["duration_seconds"] = int(data.get("duration_seconds") or 0)
    except (TypeError, ValueError):
        data["duration_seconds"] = 0
    data["duration_seconds"] = max(0, min(7200, data["duration_seconds"]))
    return data


@router.get("")
async def list_videos(
    collection: str | None = None,
    enabled_only: bool = False,
    featured_only: bool = False,
    user: dict = Depends(current_user),
):
    """Readable by anyone signed in, including the pupil-facing display."""
    db = get_db()
    query: dict = {}
    if collection in COLLECTIONS:
        query["collection"] = collection
    if enabled_only:
        query["enabled"] = True
    if featured_only:
        query["featured"] = True
    docs = await db[C.watch].find(query, {"_id": 0}).sort("order", 1).to_list(400)
    return serialize_docs([_decorate(d) for d in docs])


@router.get("/collections")
async def list_collections(user: dict = Depends(current_user)):
    db = get_db()
    counts = {}
    async for doc in db[C.watch].find({}, {"_id": 0, "collection": 1, "enabled": 1}):
        key = doc.get("collection") or "other"
        entry = counts.setdefault(key, {"total": 0, "enabled": 0})
        entry["total"] += 1
        if doc.get("enabled"):
            entry["enabled"] += 1
    return [
        {
            "key": key,
            "label": COLLECTION_LABELS[key],
            "total": counts.get(key, {}).get("total", 0),
            "enabled": counts.get(key, {}).get("enabled", 0),
        }
        for key in COLLECTIONS
    ]


@router.post("")
async def create_video(body: dict, user: dict = Depends(require("watch.edit"))):
    db = get_db()
    data = _validate({k: v for k, v in body.items() if k in FIELDS})
    if not str(data.get("title") or "").strip():
        raise HTTPException(400, "Give the video a name the children will recognise.")
    doc = {
        "id": new_id(),
        "collection": "other",
        "symbol_concept": "resource.brain_break",
        "description": "",
        "enabled": True,
        "featured": False,
        "is_sample": False,
        "created_at": utcnow_iso(),
        "order": await db[C.watch].count_documents({}),
        **data,
    }
    await db[C.watch].insert_one(dict(doc))
    return serialize_doc(_decorate(doc))


@router.post("/reorder")
async def reorder(body: dict, user: dict = Depends(require("watch.edit"))):
    return await reorder_docs(C.watch, body.get("ids", []))


@router.patch("/{video_id}")
async def update_video(video_id: str, body: dict, user: dict = Depends(require("watch.edit"))):
    db = get_db()
    existing = await db[C.watch].find_one({"id": video_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Video not found")
    patch = {k: v for k, v in body.items() if k in FIELDS}
    if "url" in patch or "collection" in patch or "duration_seconds" in patch:
        merged = _validate({**existing, **patch})
        patch = {**patch, **{k: v for k, v in merged.items() if k in patch}}
    updated = await patch_doc(C.watch, video_id, patch, FIELDS)
    return serialize_doc(_decorate(updated))


@router.delete("/{video_id}")
async def remove_video(video_id: str, user: dict = Depends(require("watch.edit"))):
    return await delete_doc(C.watch, video_id)
