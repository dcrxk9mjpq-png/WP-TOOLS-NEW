"""Morning Meeting (\"CREW Time\").

The component sequence is configuration, not code: components can be added,
removed, reordered, reworded, given a different symbol, restricted to particular
pupils, or skipped for the day.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.crud import create_doc, delete_doc, list_docs, patch_doc
from core.db import C, get_db
from core.security import require
from core.util import new_id, serialize_doc, serialize_docs, today_iso, utcnow_iso

router = APIRouter(prefix="/morning-meeting", tags=["morning-meeting"])


@router.get("/templates")
async def templates(user: dict = Depends(require("morning_meeting.run"))):
    return await list_docs(C.mm_templates, sort=[("name", 1)])


@router.post("/templates")
async def create_template(body: dict, user: dict = Depends(require("morning_meeting.edit"))):
    data = {k: v for k, v in body.items() if k in {"name", "description", "components"}}
    return await create_doc(C.mm_templates, data, {"components": [], "is_default": False})


class ComponentIn(BaseModel):
    title: str
    symbol_concept: str = "activity.crew_time"
    kind: str = "custom"
    script: str = ""
    enabled: bool = True
    participants: str | list[str] = "all"
    config: dict = {}


@router.get("/template/default")
async def default_template(user: dict = Depends(require("morning_meeting.run"))):
    db = get_db()
    tpl = await db[C.mm_templates].find_one({"is_default": True}, {"_id": 0})
    if not tpl:
        tpl = await db[C.mm_templates].find_one({}, {"_id": 0})
    if not tpl:
        raise HTTPException(404, "No Morning Meeting sequence configured yet")
    tpl["components"] = sorted(tpl.get("components", []), key=lambda c: c.get("order", 0))
    return serialize_doc(tpl)


@router.patch("/templates/{template_id}")
async def update_template(
    template_id: str, body: dict, user: dict = Depends(require("morning_meeting.edit"))
):
    return await patch_doc(
        C.mm_templates, template_id, body, {"name", "description", "components", "is_default"}
    )


@router.delete("/templates/{template_id}")
async def remove_template(template_id: str, user: dict = Depends(require("morning_meeting.edit"))):
    return await delete_doc(C.mm_templates, template_id)


@router.post("/templates/{template_id}/components")
async def add_component(
    template_id: str, body: ComponentIn, user: dict = Depends(require("morning_meeting.edit"))
):
    db = get_db()
    tpl = await db[C.mm_templates].find_one({"id": template_id}, {"_id": 0})
    if not tpl:
        raise HTTPException(404, "Sequence not found")
    comps = tpl.get("components", [])
    comp = body.model_dump()
    comp.update({"id": new_id(), "key": f"custom_{len(comps)}", "order": len(comps)})
    comps.append(comp)
    await db[C.mm_templates].update_one({"id": template_id}, {"$set": {"components": comps}})
    return serialize_doc({**tpl, "components": comps})


@router.patch("/templates/{template_id}/components/{component_id}")
async def update_component(
    template_id: str,
    component_id: str,
    body: dict,
    user: dict = Depends(require("morning_meeting.edit")),
):
    db = get_db()
    tpl = await db[C.mm_templates].find_one({"id": template_id}, {"_id": 0})
    if not tpl:
        raise HTTPException(404, "Sequence not found")
    allowed = {"title", "symbol_concept", "script", "enabled", "participants", "config", "kind"}
    for comp in tpl.get("components", []):
        if comp["id"] == component_id:
            comp.update({k: v for k, v in body.items() if k in allowed})
    await db[C.mm_templates].update_one(
        {"id": template_id}, {"$set": {"components": tpl["components"]}}
    )
    return serialize_doc(tpl)


@router.delete("/templates/{template_id}/components/{component_id}")
async def delete_component(
    template_id: str, component_id: str, user: dict = Depends(require("morning_meeting.edit"))
):
    db = get_db()
    tpl = await db[C.mm_templates].find_one({"id": template_id}, {"_id": 0})
    if not tpl:
        raise HTTPException(404, "Sequence not found")
    comps = [c for c in tpl.get("components", []) if c["id"] != component_id]
    for n, c in enumerate(comps):
        c["order"] = n
    await db[C.mm_templates].update_one({"id": template_id}, {"$set": {"components": comps}})
    return serialize_doc({**tpl, "components": comps})


class ComponentOrderIn(BaseModel):
    component_ids: list[str]


@router.post("/templates/{template_id}/reorder")
async def reorder_components(
    template_id: str, body: ComponentOrderIn, user: dict = Depends(require("morning_meeting.edit"))
):
    db = get_db()
    tpl = await db[C.mm_templates].find_one({"id": template_id}, {"_id": 0})
    if not tpl:
        raise HTTPException(404, "Sequence not found")
    by_id = {c["id"]: c for c in tpl.get("components", [])}
    ordered = [by_id[i] for i in body.component_ids if i in by_id]
    ordered += [c for c in tpl.get("components", []) if c["id"] not in set(body.component_ids)]
    for n, c in enumerate(ordered):
        c["order"] = n
    await db[C.mm_templates].update_one({"id": template_id}, {"$set": {"components": ordered}})
    return serialize_doc({**tpl, "components": ordered})


# ---------------- daily run ---------------- #
async def _get_run(date: str) -> dict:
    db = get_db()
    run = await db[C.mm_runs].find_one({"date": date}, {"_id": 0})
    if run:
        return run
    tpl = await db[C.mm_templates].find_one({"is_default": True}, {"_id": 0}) or await db[
        C.mm_templates
    ].find_one({}, {"_id": 0})
    run = {
        "id": new_id(),
        "date": date,
        "template_id": (tpl or {}).get("id"),
        "current_index": 0,
        "skipped": [],
        "completed": [],
        "checkins": [],
        "weather": None,
        "temperature": None,
        "completed_at": None,
        "created_at": utcnow_iso(),
    }
    await db[C.mm_runs].insert_one(dict(run))
    return run


@router.get("/run")
async def get_run(date: str | None = None, user: dict = Depends(require("morning_meeting.run"))):
    db = get_db()
    d = date or today_iso()
    run = await _get_run(d)
    tpl = await db[C.mm_templates].find_one({"id": run.get("template_id")}, {"_id": 0})
    if tpl:
        tpl["components"] = sorted(
            [c for c in tpl.get("components", []) if c.get("enabled", True)],
            key=lambda c: c.get("order", 0),
        )
    expectations = await db["expectations"].find({"enabled": True}, {"_id": 0}).sort("order", 1).to_list(50)
    return {
        "run": serialize_doc(run),
        "template": serialize_doc(tpl),
        "expectations": serialize_docs(expectations),
    }


class RunPatch(BaseModel):
    current_index: int | None = None
    weather: str | None = None
    temperature: str | None = None
    skip_component_id: str | None = None
    unskip_component_id: str | None = None
    complete_component_id: str | None = None
    finish: bool | None = None
    reset: bool | None = None


@router.patch("/run")
async def patch_run(
    body: RunPatch, date: str | None = None, user: dict = Depends(require("morning_meeting.run"))
):
    db = get_db()
    d = date or today_iso()
    run = await _get_run(d)
    if body.reset:
        run.update({"current_index": 0, "skipped": [], "completed": [], "completed_at": None})
    if body.current_index is not None:
        run["current_index"] = max(0, body.current_index)
    if body.weather is not None:
        run["weather"] = body.weather
    if body.temperature is not None:
        run["temperature"] = body.temperature
    if body.skip_component_id:
        run["skipped"] = sorted(set(run.get("skipped", []) + [body.skip_component_id]))
    if body.unskip_component_id:
        run["skipped"] = [s for s in run.get("skipped", []) if s != body.unskip_component_id]
    if body.complete_component_id:
        run["completed"] = sorted(set(run.get("completed", []) + [body.complete_component_id]))
    if body.finish:
        run["completed_at"] = utcnow_iso()
    await db[C.mm_runs].update_one({"date": d}, {"$set": run})
    return serialize_doc(run)


class CheckinIn(BaseModel):
    pupil_id: str
    present: bool = True
    feeling: str | None = None
    zone_id: str | None = None


@router.post("/run/checkin")
async def checkin(
    body: CheckinIn, date: str | None = None, user: dict = Depends(require("morning_meeting.run"))
):
    db = get_db()
    d = date or today_iso()
    run = await _get_run(d)
    checkins = [c for c in run.get("checkins", []) if c["pupil_id"] != body.pupil_id]
    checkins.append({**body.model_dump(), "at": utcnow_iso()})
    await db[C.mm_runs].update_one({"date": d}, {"$set": {"checkins": checkins}})
    return serialize_docs(checkins)


# ---------------- expectations (configurable) ---------------- #
@router.get("/expectations")
async def list_expectations(user: dict = Depends(require("morning_meeting.run"))):
    return await list_docs("expectations", sort=[("order", 1)])


@router.post("/expectations")
async def create_expectation(body: dict, user: dict = Depends(require("morning_meeting.edit"))):
    data = {k: v for k, v in body.items() if k in {"title", "symbol_concept", "children"}}
    return await create_doc("expectations", data, {"children": [], "symbol_concept": "routine.expectations"})


@router.patch("/expectations/{expectation_id}")
async def update_expectation(
    expectation_id: str, body: dict, user: dict = Depends(require("morning_meeting.edit"))
):
    return await patch_doc(
        "expectations", expectation_id, body, {"title", "symbol_concept", "children", "enabled", "order"}
    )


@router.delete("/expectations/{expectation_id}")
async def delete_expectation(
    expectation_id: str, user: dict = Depends(require("morning_meeting.edit"))
):
    return await delete_doc("expectations", expectation_id)
