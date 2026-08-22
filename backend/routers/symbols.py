"""Canonical Symbol System.

Every recurring concept in the platform has exactly ONE symbol. Screens never
choose their own artwork - they ask for a ``conceptKey`` and this module decides
what is rendered. Replacing a symbol here changes it everywhere.
"""
from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File, Form
from pydantic import BaseModel

from core.db import C, get_db
from core.security import require
from core.util import new_id, serialize_docs, utcnow_iso

ASSETS = Path(__file__).resolve().parents[1] / "assets" / "symbols"
MANIFEST = ASSETS / "manifest.json"

router = APIRouter(prefix="/symbols", tags=["symbols"])


def load_manifest() -> list[dict]:
    if not MANIFEST.exists():
        return []
    return json.loads(MANIFEST.read_text())


@router.get("")
async def list_symbols(group: str | None = None, q: str | None = None, source: str | None = None):
    """The whole library. Unauthenticated: pictograms contain no pupil data."""
    db = get_db()
    query: dict = {}
    if group:
        query["group"] = group
    if source:
        query["source"] = source
    docs = await db[C.symbols].find(query, {"_id": 0, "custom_data": 0}).sort("concept_key", 1).to_list(2000)
    if q:
        needle = q.lower()
        docs = [
            d
            for d in docs
            if needle in d.get("label", "").lower() or needle in d.get("concept_key", "").lower()
        ]
    return serialize_docs(docs)


@router.get("/groups")
async def symbol_groups():
    db = get_db()
    groups = await db[C.symbols].distinct("group")
    return sorted(g for g in groups if g)


@router.get("/attributions")
async def attributions():
    db = get_db()
    docs = await db[C.symbols].find({}, {"_id": 0, "source": 1, "attribution": 1}).to_list(2000)
    seen: dict[str, str] = {}
    for d in docs:
        if d.get("source") and d.get("attribution"):
            seen[d["source"]] = d["attribution"]
    return [{"source": k, "attribution": v} for k, v in sorted(seen.items())]


async def _symbol_bytes(concept_key: str) -> tuple[bytes, str, str] | None:
    db = get_db()
    doc = await db[C.symbols].find_one({"concept_key": concept_key})
    if not doc:
        return None
    if doc.get("custom_data"):
        raw = base64.b64decode(doc["custom_data"])
        return raw, doc.get("custom_mime", "image/png"), doc.get("updated_at", "custom")
    path = ASSETS / doc["file"]
    if not path.exists():
        return None
    return path.read_bytes(), "image/png", doc.get("updated_at", "bundled")


@router.get("/{concept_key}/image")
async def symbol_image(concept_key: str):
    found = await _symbol_bytes(concept_key)
    if not found:
        raise HTTPException(404, f"No symbol assigned to '{concept_key}'")
    raw, mime, version = found
    etag = hashlib.sha1(raw).hexdigest()[:16]
    return Response(
        content=raw,
        media_type=mime,
        headers={"Cache-Control": "public, max-age=60", "ETag": etag, "X-Symbol-Version": str(version)},
    )


@router.get("/{concept_key}")
async def get_symbol(concept_key: str):
    db = get_db()
    doc = await db[C.symbols].find_one({"concept_key": concept_key}, {"_id": 0, "custom_data": 0})
    if not doc:
        raise HTTPException(404, "Symbol not found")
    return doc


class SymbolPatch(BaseModel):
    label: str | None = None
    group: str | None = None


@router.patch("/{concept_key}")
async def patch_symbol(concept_key: str, body: SymbolPatch, user: dict = Depends(require("symbols.edit"))):
    db = get_db()
    patch = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not patch:
        raise HTTPException(400, "Nothing to update")
    patch["updated_at"] = utcnow_iso()
    res = await db[C.symbols].update_one({"concept_key": concept_key}, {"$set": patch})
    if not res.matched_count:
        raise HTTPException(404, "Symbol not found")
    return await db[C.symbols].find_one({"concept_key": concept_key}, {"_id": 0, "custom_data": 0})


@router.post("/{concept_key}/replace")
async def replace_symbol(
    concept_key: str,
    file: UploadFile = File(...),
    label: str | None = Form(default=None),
    user: dict = Depends(require("symbols.edit")),
):
    """Replace one concept's artwork everywhere in the platform."""
    db = get_db()
    doc = await db[C.symbols].find_one({"concept_key": concept_key})
    if not doc:
        raise HTTPException(404, "Symbol not found")
    raw = await file.read()
    if len(raw) > 3_000_000:
        raise HTTPException(400, "Image must be smaller than 3MB")
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Please upload an image file")
    patch = {
        "custom_data": base64.b64encode(raw).decode("ascii"),
        "custom_mime": file.content_type,
        "source": "school-upload",
        "attribution": "Uploaded by the school",
        "updated_at": utcnow_iso(),
        "updated_by": user["id"],
    }
    if label:
        patch["label"] = label
    await db[C.symbols].update_one({"concept_key": concept_key}, {"$set": patch})
    await db[C.audit].insert_one(
        {
            "id": new_id(),
            "actor_id": user["id"],
            "action": "update",
            "entity": "symbol",
            "entity_id": concept_key,
            "summary": f"Replaced the symbol for '{concept_key}' across the platform",
            "at": utcnow_iso(),
        }
    )
    return {"ok": True, "concept_key": concept_key}


@router.post("/{concept_key}/reset")
async def reset_symbol(concept_key: str, user: dict = Depends(require("symbols.edit"))):
    db = get_db()
    manifest = {m["conceptKey"]: m for m in load_manifest()}
    original = manifest.get(concept_key)
    if not original:
        raise HTTPException(400, "This concept has no bundled default to restore")
    await db[C.symbols].update_one(
        {"concept_key": concept_key},
        {
            "$set": {
                "source": original["source"],
                "attribution": original["attribution"],
                "file": original["file"],
                "label": original["label"],
                "updated_at": utcnow_iso(),
            },
            "$unset": {"custom_data": "", "custom_mime": ""},
        },
    )
    return {"ok": True}


class AssignIn(BaseModel):
    from_concept: str


@router.post("/{concept_key}/assign")
async def assign_from_existing(
    concept_key: str, body: AssignIn, user: dict = Depends(require("symbols.edit"))
):
    """Point one concept at another approved symbol's artwork."""
    db = get_db()
    src = await db[C.symbols].find_one({"concept_key": body.from_concept})
    dst = await db[C.symbols].find_one({"concept_key": concept_key})
    if not src or not dst:
        raise HTTPException(404, "Symbol not found")
    patch = {
        "file": src["file"],
        "source": src.get("source"),
        "attribution": src.get("attribution"),
        "updated_at": utcnow_iso(),
    }
    unset = {"custom_data": "", "custom_mime": ""}
    if src.get("custom_data"):
        patch["custom_data"] = src["custom_data"]
        patch["custom_mime"] = src.get("custom_mime", "image/png")
        unset = {}
    op: dict = {"$set": patch}
    if unset:
        op["$unset"] = unset
    await db[C.symbols].update_one({"concept_key": concept_key}, op)
    return {"ok": True}


class NewConcept(BaseModel):
    concept_key: str
    label: str
    group: str = "Custom"
    from_concept: str | None = None


@router.post("")
async def create_concept(body: NewConcept, user: dict = Depends(require("symbols.edit"))):
    db = get_db()
    if await db[C.symbols].find_one({"concept_key": body.concept_key}):
        raise HTTPException(400, "That concept key already exists")
    base = None
    if body.from_concept:
        base = await db[C.symbols].find_one({"concept_key": body.from_concept}, {"_id": 0})
    doc = {
        "id": new_id(),
        "concept_key": body.concept_key,
        "label": body.label,
        "group": body.group,
        "file": (base or {}).get("file", "system__symbol.png"),
        "source": (base or {}).get("source", "arasaac"),
        "attribution": (base or {}).get("attribution", ""),
        "created_at": utcnow_iso(),
    }
    await db[C.symbols].insert_one(doc)
    doc.pop("_id", None)
    return doc
