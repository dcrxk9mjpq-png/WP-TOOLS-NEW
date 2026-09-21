"""Timetable: activity library, templates, today's timetable, pupil adaptations.

Four clearly separated layers:
  * SYSTEM STRUCTURE            - this module's endpoints (fixed functionality)
  * CLASSROOM CONFIGURATION     - activity library + timetable templates
  * DAILY CLASSROOM CONTENT     - daily_timetables (one document per date)
  * INDIVIDUAL PUPIL CONFIG     - pupil adaptations + per-pupil visibility
Editing a day never changes a template. Editing a pupil adaptation never
changes the class day.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import dayclock
from core.db import C, get_db
from core.security import current_user, require
from core.util import new_id, serialize_doc, serialize_docs, today_iso, utcnow_iso

router = APIRouter(prefix="/timetable", tags=["timetable"])

STATUSES = {"later", "current", "done", "skipped"}


# --------------------------------------------------------------------------- #
# CLASSROOM CONFIGURATION - activity library
# --------------------------------------------------------------------------- #
class ActivityIn(BaseModel):
    title: str
    symbol_concept: str = "routine.timetable"
    colour: str = "teal"
    default_minutes: int = 30
    description: str = ""
    kind: str = "lesson"


@router.get("/activities")
async def list_activities(user: dict = Depends(require("timetable.view"))):
    db = get_db()
    docs = await db[C.activities].find({}, {"_id": 0}).sort("title", 1).to_list(500)
    return serialize_docs(docs)


@router.post("/activities")
async def create_activity(body: ActivityIn, user: dict = Depends(require("template.edit"))):
    db = get_db()
    doc = body.model_dump()
    doc.update({"id": new_id(), "is_sample": False, "created_at": utcnow_iso()})
    await db[C.activities].insert_one(doc)
    return serialize_doc(doc)


@router.patch("/activities/{activity_id}")
async def update_activity(activity_id: str, body: dict, user: dict = Depends(require("template.edit"))):
    db = get_db()
    allowed = {"title", "symbol_concept", "colour", "default_minutes", "description", "kind"}
    patch = {k: v for k, v in body.items() if k in allowed}
    res = await db[C.activities].update_one({"id": activity_id}, {"$set": patch})
    if not res.matched_count:
        raise HTTPException(404, "Activity not found")
    return serialize_doc(await db[C.activities].find_one({"id": activity_id}, {"_id": 0}))


@router.delete("/activities/{activity_id}")
async def delete_activity(activity_id: str, user: dict = Depends(require("template.edit"))):
    db = get_db()
    await db[C.activities].delete_one({"id": activity_id})
    return {"ok": True}


# --------------------------------------------------------------------------- #
# CLASSROOM CONFIGURATION - templates
# --------------------------------------------------------------------------- #
class TemplateItem(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    symbol_concept: str = "routine.timetable"
    start: str = "09:00"
    end: str = "09:30"
    colour: str = "teal"
    note: str = ""
    activity_id: str | None = None


class TemplateIn(BaseModel):
    name: str
    description: str = ""
    symbol_concept: str = "routine.timetable"
    items: list[TemplateItem] = []


@router.get("/templates")
async def list_templates(user: dict = Depends(require("timetable.view"))):
    db = get_db()
    docs = await db[C.templates].find({}, {"_id": 0}).sort("name", 1).to_list(200)
    return serialize_docs(docs)


@router.post("/templates")
async def create_template(body: TemplateIn, user: dict = Depends(require("template.edit"))):
    db = get_db()
    doc = body.model_dump()
    doc.update({"id": new_id(), "is_sample": False, "created_at": utcnow_iso()})
    await db[C.templates].insert_one(doc)
    return serialize_doc(doc)


@router.patch("/templates/{template_id}")
async def update_template(template_id: str, body: dict, user: dict = Depends(require("template.edit"))):
    db = get_db()
    allowed = {"name", "description", "symbol_concept", "items"}
    patch = {k: v for k, v in body.items() if k in allowed}
    patch["updated_at"] = utcnow_iso()
    res = await db[C.templates].update_one({"id": template_id}, {"$set": patch})
    if not res.matched_count:
        raise HTTPException(404, "Template not found")
    return serialize_doc(await db[C.templates].find_one({"id": template_id}, {"_id": 0}))


@router.post("/templates/{template_id}/duplicate")
async def duplicate_template(template_id: str, user: dict = Depends(require("template.edit"))):
    db = get_db()
    src = await db[C.templates].find_one({"id": template_id}, {"_id": 0})
    if not src:
        raise HTTPException(404, "Template not found")
    copy = dict(src)
    copy["id"] = new_id()
    copy["name"] = f"{src['name']} (copy)"
    copy["is_sample"] = False
    copy["items"] = [{**i, "id": new_id()} for i in src.get("items", [])]
    await db[C.templates].insert_one(copy)
    return serialize_doc(copy)


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(require("template.edit"))):
    db = get_db()
    await db[C.templates].delete_one({"id": template_id})
    return {"ok": True}


class SaveAsTemplate(BaseModel):
    name: str
    description: str = ""
    date: str | None = None


@router.post("/day/save-as-template")
async def save_day_as_template(body: SaveAsTemplate, user: dict = Depends(require("template.edit"))):
    db = get_db()
    day = await _get_day(body.date or today_iso())
    doc = {
        "id": new_id(),
        "name": body.name,
        "description": body.description,
        "symbol_concept": "routine.timetable",
        "items": [
            {
                "id": new_id(),
                "title": i["title"],
                "symbol_concept": i.get("symbol_concept", "routine.timetable"),
                "start": i.get("start", ""),
                "end": i.get("end", ""),
                "colour": i.get("colour", "teal"),
                "note": i.get("note", ""),
                "activity_id": i.get("activity_id"),
            }
            for i in day.get("items", [])
        ],
        "is_sample": False,
        "created_at": utcnow_iso(),
    }
    await db[C.templates].insert_one(doc)
    return serialize_doc(doc)


# --------------------------------------------------------------------------- #
# DAILY CLASSROOM CONTENT
# --------------------------------------------------------------------------- #
async def _get_day(date: str) -> dict:
    db = get_db()
    doc = await db[C.daily].find_one({"date": date}, {"_id": 0})
    if doc:
        return doc
    doc = {
        "id": new_id(),
        "date": date,
        "items": [],
        "template_id": None,
        "note": "",
        "created_at": utcnow_iso(),
    }
    await db[C.daily].insert_one(dict(doc))
    return doc


def _decorate(day: dict) -> dict:
    """Attach NOW / NEXT / LATER using staff decisions first, then the clock."""
    state = dayclock.derive(day.get("items", []), day.get("date") or today_iso())
    day = dict(day)
    day.update(state)
    return day


@router.get("/day")
async def get_day(date: str | None = None, user: dict = Depends(require("timetable.view"))):
    day = await _get_day(date or today_iso())
    return serialize_doc(_decorate(day))


class DayItemIn(BaseModel):
    title: str
    symbol_concept: str = "routine.timetable"
    start: str = ""
    end: str = ""
    colour: str = "teal"
    note: str = ""
    activity_id: str | None = None
    status: str = "later"
    position: int | None = None


@router.post("/day/items")
async def add_day_item(
    body: DayItemIn, date: str | None = None, user: dict = Depends(require("timetable.edit"))
):
    db = get_db()
    d = date or today_iso()
    day = await _get_day(d)
    item = body.model_dump(exclude={"position"})
    item["id"] = new_id()
    items = day.get("items", [])
    pos = body.position if body.position is not None else len(items)
    items.insert(max(0, min(pos, len(items))), item)
    await db[C.daily].update_one({"date": d}, {"$set": {"items": items, "updated_at": utcnow_iso()}})
    return serialize_doc(_decorate({**day, "items": items}))


@router.patch("/day/items/{item_id}")
async def update_day_item(
    item_id: str, body: dict, date: str | None = None, user: dict = Depends(require("timetable.edit"))
):
    db = get_db()
    d = date or today_iso()
    day = await _get_day(d)
    allowed = {"title", "symbol_concept", "start", "end", "colour", "note", "status", "activity_id"}
    found = False
    for item in day.get("items", []):
        if item["id"] == item_id:
            item.update({k: v for k, v in body.items() if k in allowed})
            found = True
    if not found:
        raise HTTPException(404, "Timetable item not found")
    await db[C.daily].update_one(
        {"date": d}, {"$set": {"items": day["items"], "updated_at": utcnow_iso()}}
    )
    return serialize_doc(_decorate(day))


@router.post("/day/items/{item_id}/duplicate")
async def duplicate_day_item(
    item_id: str, date: str | None = None, user: dict = Depends(require("timetable.edit"))
):
    db = get_db()
    d = date or today_iso()
    day = await _get_day(d)
    items = day.get("items", [])
    idx = next((n for n, i in enumerate(items) if i["id"] == item_id), None)
    if idx is None:
        raise HTTPException(404, "Timetable item not found")
    copy = {**items[idx], "id": new_id(), "status": "later"}
    items.insert(idx + 1, copy)
    await db[C.daily].update_one({"date": d}, {"$set": {"items": items, "updated_at": utcnow_iso()}})
    return serialize_doc(_decorate({**day, "items": items}))


@router.delete("/day/items/{item_id}")
async def delete_day_item(
    item_id: str, date: str | None = None, user: dict = Depends(require("timetable.edit"))
):
    db = get_db()
    d = date or today_iso()
    day = await _get_day(d)
    items = [i for i in day.get("items", []) if i["id"] != item_id]
    await db[C.daily].update_one({"date": d}, {"$set": {"items": items, "updated_at": utcnow_iso()}})
    return serialize_doc(_decorate({**day, "items": items}))


class ReorderIn(BaseModel):
    item_ids: list[str]


@router.post("/day/reorder")
async def reorder_day(
    body: ReorderIn, date: str | None = None, user: dict = Depends(require("timetable.edit"))
):
    db = get_db()
    d = date or today_iso()
    day = await _get_day(d)
    by_id = {i["id"]: i for i in day.get("items", [])}
    ordered = [by_id[i] for i in body.item_ids if i in by_id]
    ordered += [i for i in day.get("items", []) if i["id"] not in set(body.item_ids)]
    await db[C.daily].update_one({"date": d}, {"$set": {"items": ordered, "updated_at": utcnow_iso()}})
    return serialize_doc(_decorate({**day, "items": ordered}))


class LoadTemplateIn(BaseModel):
    template_id: str
    date: str | None = None
    replace: bool = True


@router.post("/day/load-template")
async def load_template(body: LoadTemplateIn, user: dict = Depends(require("timetable.edit"))):
    db = get_db()
    d = body.date or today_iso()
    tpl = await db[C.templates].find_one({"id": body.template_id}, {"_id": 0})
    if not tpl:
        raise HTTPException(404, "Template not found")
    day = await _get_day(d)
    new_items = [
        {
            "id": new_id(),
            "title": i["title"],
            "symbol_concept": i.get("symbol_concept", "routine.timetable"),
            "start": i.get("start", ""),
            "end": i.get("end", ""),
            "colour": i.get("colour", "teal"),
            "note": i.get("note", ""),
            "activity_id": i.get("activity_id"),
            "status": "later",
        }
        for i in tpl.get("items", [])
    ]
    items = new_items if body.replace else day.get("items", []) + new_items
    await db[C.daily].update_one(
        {"date": d},
        {"$set": {"items": items, "template_id": tpl["id"], "updated_at": utcnow_iso()}},
    )
    return serialize_doc(_decorate({**day, "items": items, "template_id": tpl["id"]}))


class StatusIn(BaseModel):
    status: str


@router.post("/day/items/{item_id}/status")
async def set_status(
    item_id: str, body: StatusIn, date: str | None = None, user: dict = Depends(require("timetable.edit"))
):
    if body.status not in STATUSES:
        raise HTTPException(400, f"Status must be one of {sorted(STATUSES)}")
    db = get_db()
    d = date or today_iso()
    day = await _get_day(d)
    for item in day.get("items", []):
        if item["id"] == item_id:
            item["status"] = body.status
        elif body.status == "current" and item.get("status") == "current":
            item["status"] = "done"
    await db[C.daily].update_one(
        {"date": d}, {"$set": {"items": day["items"], "updated_at": utcnow_iso()}}
    )
    return serialize_doc(_decorate(day))


@router.post("/day/advance")
async def advance_day(date: str | None = None, user: dict = Depends(require("timetable.edit"))):
    """Finish whatever is happening now and start whatever is next.

    "Now" is taken from the same derivation the screens use, so pressing this
    does the obvious thing whether the day is being driven by the clock or by a
    member of staff.
    """
    db = get_db()
    d = date or today_iso()
    day = await _get_day(d)
    items = day.get("items", [])
    state = dayclock.derive(items, d)
    now_id = (state.get("now") or {}).get("id")
    next_id = (state.get("next") or {}).get("id")
    for item in items:
        if item["id"] == now_id:
            item["status"] = "done"
        elif item["id"] == next_id:
            item["status"] = "current"
    await db[C.daily].update_one({"date": d}, {"$set": {"items": items, "updated_at": utcnow_iso()}})
    return serialize_doc(_decorate({**day, "items": items}))


@router.post("/day/follow-clock")
async def follow_clock(date: str | None = None, user: dict = Depends(require("timetable.edit"))):
    """Hand the day back to the clock.

    Clears a staff "happening now" override without touching anything already
    marked finished or skipped.
    """
    db = get_db()
    d = date or today_iso()
    day = await _get_day(d)
    for item in day.get("items", []):
        if item.get("status") == "current":
            item["status"] = "later"
    await db[C.daily].update_one(
        {"date": d}, {"$set": {"items": day["items"], "updated_at": utcnow_iso()}}
    )
    return serialize_doc(_decorate(day))


class ResetIn(BaseModel):
    date: str | None = None


@router.post("/day/reset")
async def reset_day(body: ResetIn, user: dict = Depends(require("timetable.edit"))):
    db = get_db()
    d = body.date or today_iso()
    day = await _get_day(d)
    for item in day.get("items", []):
        item["status"] = "later"
    await db[C.daily].update_one(
        {"date": d}, {"$set": {"items": day["items"], "updated_at": utcnow_iso()}}
    )
    return serialize_doc(_decorate(day))


# --------------------------------------------------------------------------- #
# INDIVIDUAL PUPIL CONFIGURATION
# --------------------------------------------------------------------------- #
class AdaptationStep(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    symbol_concept: str = "routine.timetable"
    status: str = "later"


class AdaptationIn(BaseModel):
    pupil_id: str
    date: str | None = None
    parent_item_id: str | None = None
    parent_title: str = ""
    steps: list[AdaptationStep] = []


@router.get("/adaptations")
async def list_adaptations(
    pupil_id: str | None = None, date: str | None = None, user: dict = Depends(require("timetable.view"))
):
    db = get_db()
    q: dict = {}
    if pupil_id:
        q["pupil_id"] = pupil_id
    if date:
        q["date"] = date
    docs = await db[C.adaptations].find(q, {"_id": 0}).to_list(500)
    return serialize_docs(docs)


@router.post("/adaptations")
async def upsert_adaptation(body: AdaptationIn, user: dict = Depends(require("timetable.edit"))):
    db = get_db()
    d = body.date or today_iso()
    doc = body.model_dump()
    doc["date"] = d
    existing = await db[C.adaptations].find_one(
        {"pupil_id": body.pupil_id, "date": d, "parent_item_id": body.parent_item_id}, {"_id": 0}
    )
    if existing:
        doc["id"] = existing["id"]
        await db[C.adaptations].update_one({"id": existing["id"]}, {"$set": doc})
    else:
        doc["id"] = new_id()
        doc["created_at"] = utcnow_iso()
        await db[C.adaptations].insert_one(dict(doc))
    return serialize_doc(doc)


@router.delete("/adaptations/{adaptation_id}")
async def delete_adaptation(adaptation_id: str, user: dict = Depends(require("timetable.edit"))):
    db = get_db()
    await db[C.adaptations].delete_one({"id": adaptation_id})
    return {"ok": True}


class PupilViewIn(BaseModel):
    pupil_id: str
    timetable_visibility: str = "now_next"  # now | now_next | now_next_later | full
    show_times: bool = False
    show_photo: bool = True


@router.get("/pupil-view/{pupil_id}")
async def get_pupil_view(pupil_id: str, user: dict = Depends(require("timetable.view"))):
    db = get_db()
    doc = await db[C.pupil_view].find_one({"pupil_id": pupil_id}, {"_id": 0})
    return serialize_doc(doc) or {
        "pupil_id": pupil_id,
        "timetable_visibility": "now_next",
        "show_times": False,
        "show_photo": True,
    }


@router.put("/pupil-view/{pupil_id}")
async def set_pupil_view(
    pupil_id: str, body: PupilViewIn, user: dict = Depends(require("timetable.edit"))
):
    db = get_db()
    doc = body.model_dump()
    doc["pupil_id"] = pupil_id
    await db[C.pupil_view].update_one({"pupil_id": pupil_id}, {"$set": doc}, upsert=True)
    return serialize_doc(doc)


@router.get("/pupil-day/{pupil_id}")
async def pupil_day(
    pupil_id: str, date: str | None = None, user: dict = Depends(require("timetable.view"))
):
    """The class day filtered/expanded for one pupil (never mutates the class day)."""
    db = get_db()
    d = date or today_iso()
    day = _decorate(await _get_day(d))
    view = await db[C.pupil_view].find_one({"pupil_id": pupil_id}, {"_id": 0}) or {
        "timetable_visibility": "now_next"
    }
    adaptations = await db[C.adaptations].find({"pupil_id": pupil_id, "date": d}, {"_id": 0}).to_list(50)
    by_parent = {a.get("parent_item_id"): a for a in adaptations}
    vis = view.get("timetable_visibility", "now_next")
    if vis == "now":
        visible = [i for i in [day.get("now")] if i]
    elif vis == "now_next":
        visible = [i for i in [day.get("now"), day.get("next")] if i]
    elif vis == "now_next_later":
        visible = [i for i in [day.get("now"), day.get("next")] if i] + day.get("later", [])[:1]
    else:
        visible = day.get("items", [])
    for item in visible:
        item["adaptation"] = serialize_doc(by_parent.get(item["id"]))
    return {
        "date": d,
        "visibility": vis,
        "show_times": view.get("show_times", False),
        "items": serialize_docs(visible),
        "now": serialize_doc(day.get("now")),
        "next": serialize_doc(day.get("next")),
        "progress": day.get("progress"),
    }
