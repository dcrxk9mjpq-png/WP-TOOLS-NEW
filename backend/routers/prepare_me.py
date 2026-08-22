"""Prepare Me - the reusable social story / preparation framework."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.crud import create_doc, delete_doc, list_docs, patch_doc
from core.db import C, get_db
from core.security import require
from core.util import new_id, serialize_doc, serialize_docs, utcnow_iso

router = APIRouter(prefix="/prepare-me", tags=["prepare-me"])

DEFAULT_SECTIONS = [
    ("doing_now", "We are doing this now"),
    ("because", "We do this because\u2026"),
    ("what_happens", "What will happen?"),
    ("see_hear", "What might I see, hear or experience?"),
    ("what_can_i_do", "What can I do?"),
    ("what_helps", "What can help me?"),
    ("afterwards", "What happens afterwards?"),
]


@router.get("/templates")
async def templates(user: dict = Depends(require("prepare_me.view"))):
    return await list_docs(C.prepare_templates, sort=[("name", 1)])


@router.post("/templates")
async def create_template(body: dict, user: dict = Depends(require("prepare_me.edit"))):
    data = {k: v for k, v in body.items() if k in {"name", "symbol_concept", "sections"}}
    data.setdefault(
        "sections",
        [
            {"id": new_id(), "key": k, "prompt": p, "order": n, "enabled": True}
            for n, (k, p) in enumerate(DEFAULT_SECTIONS)
        ],
    )
    return await create_doc(C.prepare_templates, data, {"symbol_concept": "system.prepare_me"})


@router.patch("/templates/{template_id}")
async def update_template(template_id: str, body: dict, user: dict = Depends(require("prepare_me.edit"))):
    return await patch_doc(C.prepare_templates, template_id, body, {"name", "symbol_concept", "sections"})


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(require("prepare_me.edit"))):
    return await delete_doc(C.prepare_templates, template_id)


@router.get("/stories")
async def stories(pupil_id: str | None = None, user: dict = Depends(require("prepare_me.view"))):
    db = get_db()
    q = {"pupil_ids": pupil_id} if pupil_id else {}
    docs = await db[C.prepare_stories].find(q, {"_id": 0}).sort("created_at", -1).to_list(300)
    pupils = {p["id"]: p for p in await db[C.pupils].find({}, {"_id": 0}).to_list(500)}
    for d in docs:
        d["pupils"] = [pupils.get(p) for p in d.get("pupil_ids", []) if pupils.get(p)]
    return serialize_docs(docs)


class StorySection(BaseModel):
    key: str
    prompt: str
    text: str = ""
    symbol_concept: str | None = None
    enabled: bool = True


class StoryIn(BaseModel):
    title: str
    template_id: str | None = None
    symbol_concept: str = "system.prepare_me"
    pupil_ids: list[str] = []
    event_date: str | None = None
    sections: list[StorySection] = []


@router.post("/stories")
async def create_story(body: StoryIn, user: dict = Depends(require("prepare_me.edit"))):
    db = get_db()
    sections = [s.model_dump() for s in body.sections]
    if not sections and body.template_id:
        tpl = await db[C.prepare_templates].find_one({"id": body.template_id}, {"_id": 0})
        sections = [
            {"key": s["key"], "prompt": s["prompt"], "text": "", "symbol_concept": None, "enabled": True}
            for s in (tpl or {}).get("sections", [])
        ]
    doc = {
        "id": new_id(),
        "title": body.title,
        "template_id": body.template_id,
        "symbol_concept": body.symbol_concept,
        "pupil_ids": body.pupil_ids,
        "event_date": body.event_date,
        "sections": sections,
        "is_sample": False,
        "created_by": user["id"],
        "created_at": utcnow_iso(),
    }
    await db[C.prepare_stories].insert_one(dict(doc))
    return serialize_doc(doc)


@router.get("/stories/{story_id}")
async def get_story(story_id: str, user: dict = Depends(require("prepare_me.view"))):
    db = get_db()
    doc = await db[C.prepare_stories].find_one({"id": story_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Story not found")
    pupils = await db[C.pupils].find({"id": {"$in": doc.get("pupil_ids", [])}}, {"_id": 0}).to_list(50)
    doc["pupils"] = serialize_docs(pupils)
    return serialize_doc(doc)


@router.patch("/stories/{story_id}")
async def update_story(story_id: str, body: dict, user: dict = Depends(require("prepare_me.edit"))):
    return await patch_doc(
        C.prepare_stories,
        story_id,
        body,
        {"title", "sections", "pupil_ids", "event_date", "symbol_concept"},
    )


@router.delete("/stories/{story_id}")
async def delete_story(story_id: str, user: dict = Depends(require("prepare_me.edit"))):
    return await delete_doc(C.prepare_stories, story_id)
