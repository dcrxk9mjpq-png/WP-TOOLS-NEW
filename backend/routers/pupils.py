"""Pupils, groups, profiles, avatars and access-controlled photographs.

Data minimisation: only educational/support information is stored. Photographs
are kept out of list payloads, require an explicit permission, and each pupil
controls which contexts may display their photograph.
"""
from __future__ import annotations

import base64

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from pydantic import BaseModel

from core.crud import create_doc, delete_doc, list_docs, patch_doc, reorder_docs
from core.db import C, get_db
from core.permissions import has_permission
from core.security import current_user, require
from core.util import new_id, serialize_doc, serialize_docs, utcnow_iso

router = APIRouter(prefix="/pupils", tags=["pupils"])

PUPIL_FIELDS = [
    "first_name",
    "last_initial",
    "display_name",
    "avatar",
    "photo_contexts",
    "group_ids",
    "active",
    "pronouns",
]


def _scoped(user: dict) -> dict:
    role = user.get("role") or {}
    scope = role.get("visibility_scope", "assigned_pupils")
    if has_permission(role, "*") or scope == "all_pupils":
        return {}
    if scope == "none":
        return {"id": {"$in": []}}
    return {"id": {"$in": user.get("pupil_ids") or []}}


@router.get("")
async def list_pupils(user: dict = Depends(require("pupil.view"))):
    db = get_db()
    docs = (
        await db[C.pupils]
        .find({**_scoped(user), "active": True}, {"_id": 0})
        .sort("first_name", 1)
        .to_list(500)
    )
    can_photo = has_permission(user.get("role"), "pupil.photo.view")
    for d in docs:
        d["has_photo"] = bool(d.get("photo_id"))
        d["photo_visible"] = bool(d.get("photo_id")) and can_photo
    return serialize_docs(docs)


class PupilIn(BaseModel):
    first_name: str
    last_initial: str = ""
    avatar: dict | None = None
    group_ids: list[str] = []


@router.post("")
async def create_pupil(body: PupilIn, user: dict = Depends(require("pupil.edit"))):
    db = get_db()
    pid = new_id()
    doc = {
        "id": pid,
        "first_name": body.first_name,
        "last_initial": body.last_initial,
        "display_name": f"{body.first_name} {body.last_initial}".strip(),
        "avatar": body.avatar or {"kind": "avatar", "colour": "teal", "symbol_concept": "system.pupil"},
        "photo_id": None,
        "photo_contexts": {"today": False, "picker": True, "jobs": True, "profile": True},
        "group_ids": body.group_ids,
        "active": True,
        "is_sample": False,
        "created_at": utcnow_iso(),
    }
    await db[C.pupils].insert_one(dict(doc))
    await db[C.pupil_profiles].insert_one(
        {"id": new_id(), "pupil_id": pid, "sections": {}, "is_sample": False, "updated_at": utcnow_iso()}
    )
    return serialize_doc(doc)


@router.get("/groups")
async def list_groups(user: dict = Depends(require("pupil.view"))):
    return await list_docs(C.groups, sort=[("name", 1)])


@router.post("/groups")
async def create_group(body: dict, user: dict = Depends(require("pupil.edit"))):
    return await create_doc(
        C.groups,
        {k: v for k, v in body.items() if k in {"name", "colour", "pupil_ids"}},
        {"colour": "teal", "pupil_ids": []},
    )


@router.patch("/groups/{group_id}")
async def update_group(group_id: str, body: dict, user: dict = Depends(require("pupil.edit"))):
    return await patch_doc(C.groups, group_id, body, {"name", "colour", "pupil_ids"})


@router.delete("/groups/{group_id}")
async def remove_group(group_id: str, user: dict = Depends(require("pupil.edit"))):
    db = get_db()
    await db[C.pupils].update_many({}, {"$pull": {"group_ids": group_id}})
    return await delete_doc(C.groups, group_id)


# ---------------- configurable profile sections ---------------- #
@router.get("/profile-sections")
async def profile_sections(user: dict = Depends(require("pupil.view"))):
    return await list_docs(C.profile_sections, sort=[("order", 1)])


@router.post("/profile-sections")
async def create_profile_section(body: dict, user: dict = Depends(require("settings.edit"))):
    data = {k: v for k, v in body.items() if k in {"key", "title", "symbol_concept", "mainstream_visible", "enabled"}}
    data.setdefault("key", (data.get("title", "section")).lower().replace(" ", "_"))
    return await create_doc(C.profile_sections, data, {"symbol_concept": "system.symbol", "mainstream_visible": False})


@router.patch("/profile-sections/{section_id}")
async def update_profile_section(section_id: str, body: dict, user: dict = Depends(require("settings.edit"))):
    return await patch_doc(
        C.profile_sections, section_id, body, {"title", "symbol_concept", "enabled", "mainstream_visible", "order"}
    )


@router.delete("/profile-sections/{section_id}")
async def delete_profile_section(section_id: str, user: dict = Depends(require("settings.edit"))):
    return await delete_doc(C.profile_sections, section_id)


@router.post("/profile-sections/reorder")
async def reorder_profile_sections(body: dict, user: dict = Depends(require("settings.edit"))):
    return await reorder_docs(C.profile_sections, body.get("ids", []))


# ---------------- individual pupil ---------------- #
@router.get("/{pupil_id}")
async def get_pupil(pupil_id: str, user: dict = Depends(require("pupil.view"))):
    db = get_db()
    scoped = _scoped(user)
    q = {"id": pupil_id}
    if scoped.get("id"):
        allowed = scoped["id"]["$in"]
        if pupil_id not in allowed:
            raise HTTPException(403, "You do not have access to this pupil's record")
    pupil = await db[C.pupils].find_one(q, {"_id": 0})
    if not pupil:
        raise HTTPException(404, "Pupil not found")
    profile = await db[C.pupil_profiles].find_one({"pupil_id": pupil_id}, {"_id": 0})
    sections = await db[C.profile_sections].find({"enabled": True}, {"_id": 0}).sort("order", 1).to_list(100)
    targets = await db[C.targets].find({"pupil_id": pupil_id}, {"_id": 0}).to_list(100)
    supports = await db[C.pupil_supports].find_one({"pupil_id": pupil_id}, {"_id": 0})
    view = await db[C.pupil_view].find_one({"pupil_id": pupil_id}, {"_id": 0})
    groups = await db[C.groups].find({"id": {"$in": pupil.get("group_ids", [])}}, {"_id": 0}).to_list(20)
    pupil["has_photo"] = bool(pupil.get("photo_id"))
    pupil["photo_visible"] = bool(pupil.get("photo_id")) and has_permission(
        user.get("role"), "pupil.photo.view"
    )
    return {
        "pupil": serialize_doc(pupil),
        "profile": serialize_doc(profile) or {"pupil_id": pupil_id, "sections": {}},
        "sections": serialize_docs(sections),
        "targets": serialize_docs(targets),
        "supports": serialize_doc(supports) or {"pupil_id": pupil_id, "strategy_ids": [], "notes": ""},
        "view": serialize_doc(view)
        or {"pupil_id": pupil_id, "timetable_visibility": "now_next", "show_times": False},
        "groups": serialize_docs(groups),
    }


@router.patch("/{pupil_id}")
async def update_pupil(pupil_id: str, body: dict, user: dict = Depends(require("pupil.edit"))):
    db = get_db()
    patch = {k: v for k, v in body.items() if k in PUPIL_FIELDS}
    if "first_name" in patch or "last_initial" in patch:
        existing = await db[C.pupils].find_one({"id": pupil_id}, {"_id": 0})
        first = patch.get("first_name", (existing or {}).get("first_name", ""))
        last = patch.get("last_initial", (existing or {}).get("last_initial", ""))
        patch["display_name"] = f"{first} {last}".strip()
    return await patch_doc(C.pupils, pupil_id, patch, set(PUPIL_FIELDS) | {"display_name"})


@router.delete("/{pupil_id}")
async def archive_pupil(pupil_id: str, user: dict = Depends(require("pupil.edit"))):
    db = get_db()
    await db[C.pupils].update_one({"id": pupil_id}, {"$set": {"active": False}})
    return {"ok": True}


class ProfileIn(BaseModel):
    sections: dict


@router.put("/{pupil_id}/profile")
async def save_profile(
    pupil_id: str, body: ProfileIn, user: dict = Depends(require("pupil.profile.edit"))
):
    db = get_db()
    await db[C.pupil_profiles].update_one(
        {"pupil_id": pupil_id},
        {
            "$set": {
                "sections": body.sections,
                "updated_at": utcnow_iso(),
                "updated_by": user["id"],
                "is_sample": False,
            },
            "$setOnInsert": {"id": new_id(), "pupil_id": pupil_id},
        },
        upsert=True,
    )
    return serialize_doc(await db[C.pupil_profiles].find_one({"pupil_id": pupil_id}, {"_id": 0}))


# ---------------- photographs (access controlled) ---------------- #
@router.post("/{pupil_id}/photo")
async def upload_photo(
    pupil_id: str, file: UploadFile = File(...), user: dict = Depends(require("pupil.edit"))
):
    db = get_db()
    raw = await file.read()
    if len(raw) > 4_000_000:
        raise HTTPException(400, "Photograph must be smaller than 4MB")
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Please choose an image file")
    media_id = new_id()
    await db[C.pupil_media].delete_many({"pupil_id": pupil_id})
    await db[C.pupil_media].insert_one(
        {
            "id": media_id,
            "pupil_id": pupil_id,
            "mime": file.content_type,
            "data": base64.b64encode(raw).decode("ascii"),
            "uploaded_by": user["id"],
            "created_at": utcnow_iso(),
        }
    )
    await db[C.pupils].update_one({"id": pupil_id}, {"$set": {"photo_id": media_id}})
    await db[C.audit].insert_one(
        {
            "id": new_id(),
            "actor_id": user["id"],
            "action": "create",
            "entity": "pupil_photo",
            "entity_id": pupil_id,
            "summary": "Uploaded a pupil photograph",
            "at": utcnow_iso(),
        }
    )
    return {"ok": True, "photo_id": media_id}


@router.get("/{pupil_id}/photo")
async def get_photo(pupil_id: str, user: dict = Depends(require("pupil.photo.view"))):
    db = get_db()
    media = await db[C.pupil_media].find_one({"pupil_id": pupil_id})
    if not media:
        raise HTTPException(404, "No photograph stored")
    return Response(
        content=base64.b64decode(media["data"]),
        media_type=media.get("mime", "image/jpeg"),
        headers={"Cache-Control": "private, max-age=30"},
    )


@router.delete("/{pupil_id}/photo")
async def delete_photo(pupil_id: str, user: dict = Depends(require("pupil.edit"))):
    db = get_db()
    await db[C.pupil_media].delete_many({"pupil_id": pupil_id})
    await db[C.pupils].update_one({"id": pupil_id}, {"$set": {"photo_id": None}})
    return {"ok": True}


# ---------------- targets ---------------- #
@router.get("/{pupil_id}/targets")
async def list_targets(pupil_id: str, user: dict = Depends(require("pupil.view"))):
    return await list_docs(C.targets, {"pupil_id": pupil_id}, sort=[("created_at", -1)])


@router.post("/{pupil_id}/targets")
async def create_target(
    pupil_id: str, body: dict, user: dict = Depends(require("pupil.profile.edit"))
):
    data = {k: v for k, v in body.items() if k in {"area", "text", "status"}}
    data["pupil_id"] = pupil_id
    return await create_doc(C.targets, data, {"status": "active", "area": "Communication"})


@router.patch("/targets/{target_id}")
async def update_target(target_id: str, body: dict, user: dict = Depends(require("pupil.profile.edit"))):
    return await patch_doc(C.targets, target_id, body, {"area", "text", "status"})


@router.delete("/targets/{target_id}")
async def delete_target(target_id: str, user: dict = Depends(require("pupil.profile.edit"))):
    return await delete_doc(C.targets, target_id)


# ---------------- individual regulation supports ---------------- #
class SupportsIn(BaseModel):
    strategy_ids: list[str] = []
    notes: str = ""


@router.put("/{pupil_id}/supports")
async def save_supports(
    pupil_id: str, body: SupportsIn, user: dict = Depends(require("regulation.edit"))
):
    db = get_db()
    doc = {"pupil_id": pupil_id, **body.model_dump(), "updated_at": utcnow_iso()}
    await db[C.pupil_supports].update_one(
        {"pupil_id": pupil_id}, {"$set": doc, "$setOnInsert": {"id": new_id()}}, upsert=True
    )
    return serialize_doc(doc)
