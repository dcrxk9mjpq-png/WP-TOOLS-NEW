"""Project Spark, Mainstream Bridge, Today summary and Settings."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core import dayclock, videolink
from core.crud import create_doc, delete_doc, list_docs, patch_doc
from core.db import C, get_db
from core.permissions import has_permission
from core.security import current_user, require
from core.util import new_id, serialize_doc, serialize_docs, today_iso, utcnow_iso

projects_router = APIRouter(prefix="/projects", tags=["projects"])
mainstream_router = APIRouter(prefix="/mainstream", tags=["mainstream"])
today_router = APIRouter(prefix="/today", tags=["today"])
settings_router = APIRouter(prefix="/settings", tags=["settings"])

PROJECT_FIELDS = {
    "title",
    "description",
    "symbol_concept",
    "pupil_ids",
    "skills",
    "steps",
    "status",
    "enabled",
}


# --------------------------------------------------------------------------- #
# Project Spark
# --------------------------------------------------------------------------- #
@projects_router.get("")
async def list_projects(user: dict = Depends(require("projects.view"))):
    db = get_db()
    docs = await db[C.projects].find({}, {"_id": 0}).sort("created_at", -1).to_list(300)
    pupils = {p["id"]: p for p in await db[C.pupils].find({}, {"_id": 0}).to_list(500)}
    for d in docs:
        d["pupils"] = [pupils[p] for p in d.get("pupil_ids", []) if p in pupils]
        steps = d.get("steps", [])
        d["progress"] = {
            "done": len([s for s in steps if s.get("done")]),
            "total": len(steps),
        }
    return serialize_docs(docs)


@projects_router.post("")
async def create_project(body: dict, user: dict = Depends(require("projects.edit"))):
    data = {k: v for k, v in body.items() if k in PROJECT_FIELDS}
    data.setdefault("steps", [])
    data["steps"] = [
        {"id": s.get("id") or new_id(), "title": s["title"], "done": bool(s.get("done"))}
        for s in data.get("steps", [])
        if s.get("title")
    ]
    return await create_doc(
        C.projects,
        data,
        {
            "symbol_concept": "system.project",
            "description": "",
            "pupil_ids": [],
            "skills": [],
            "evidence": [],
            "status": "active",
        },
    )


@projects_router.patch("/{project_id}")
async def update_project(project_id: str, body: dict, user: dict = Depends(require("projects.edit"))):
    return await patch_doc(C.projects, project_id, body, PROJECT_FIELDS)


@projects_router.delete("/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(require("projects.edit"))):
    return await delete_doc(C.projects, project_id)


class EvidenceIn(BaseModel):
    text: str
    pupil_id: str | None = None
    skill: str | None = None


@projects_router.post("/{project_id}/evidence")
async def add_evidence(
    project_id: str, body: EvidenceIn, user: dict = Depends(require("projects.edit"))
):
    db = get_db()
    project = await db[C.projects].find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    evidence = project.get("evidence", [])
    evidence.insert(
        0,
        {
            "id": new_id(),
            **body.model_dump(),
            "at": utcnow_iso(),
            "by": user.get("name"),
        },
    )
    await db[C.projects].update_one({"id": project_id}, {"$set": {"evidence": evidence}})
    return serialize_doc({**project, "evidence": evidence})


@projects_router.delete("/{project_id}/evidence/{evidence_id}")
async def delete_evidence(
    project_id: str, evidence_id: str, user: dict = Depends(require("projects.edit"))
):
    db = get_db()
    project = await db[C.projects].find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    evidence = [e for e in project.get("evidence", []) if e["id"] != evidence_id]
    await db[C.projects].update_one({"id": project_id}, {"$set": {"evidence": evidence}})
    return {"ok": True}


# --------------------------------------------------------------------------- #
# Mainstream Bridge - deliberately concise, permission limited
# --------------------------------------------------------------------------- #
@mainstream_router.get("/{pupil_id}")
async def bridge(pupil_id: str, user: dict = Depends(require("mainstream.view"))):
    db = get_db()
    pupil = await db[C.pupils].find_one({"id": pupil_id}, {"_id": 0})
    if not pupil:
        raise HTTPException(404, "Pupil not found")
    role = user.get("role") or {}
    if role.get("visibility_scope") == "assigned_pupils" and not has_permission(role, "*"):
        if pupil_id not in (user.get("pupil_ids") or []):
            raise HTTPException(403, "You do not have access to this pupil")

    profile = await db[C.pupil_profiles].find_one({"pupil_id": pupil_id}, {"_id": 0}) or {}
    sections = (
        await db[C.profile_sections]
        .find({"enabled": True, "mainstream_visible": True}, {"_id": 0})
        .sort("order", 1)
        .to_list(50)
    )
    targets = await db[C.targets].find({"pupil_id": pupil_id, "status": "active"}, {"_id": 0}).to_list(20)
    supports = await db[C.pupil_supports].find_one({"pupil_id": pupil_id}, {"_id": 0}) or {}
    strategies = await db[C.strategies].find(
        {"id": {"$in": supports.get("strategy_ids", [])}}, {"_id": 0}
    ).to_list(50)
    view = await db[C.pupil_view].find_one({"pupil_id": pupil_id}, {"_id": 0}) or {}

    content = profile.get("sections", {})
    return {
        "pupil": {
            "id": pupil["id"],
            "display_name": pupil.get("display_name"),
            "avatar": pupil.get("avatar"),
        },
        "sections": [
            {
                "key": s["key"],
                "title": s["title"],
                "symbol_concept": s.get("symbol_concept"),
                "items": content.get(s["key"], []),
            }
            for s in sections
        ],
        "targets": serialize_docs(targets),
        "strategies": serialize_docs(strategies),
        "adaptations": {
            "timetable_visibility": view.get("timetable_visibility", "now_next"),
            "show_times": view.get("show_times", False),
        },
        "note": "This is a concise support summary only. The full DSP record is not shared.",
    }


@mainstream_router.get("")
async def bridge_list(user: dict = Depends(require("mainstream.view"))):
    db = get_db()
    role = user.get("role") or {}
    q: dict = {"active": True}
    if role.get("visibility_scope") == "assigned_pupils" and not has_permission(role, "*"):
        q["id"] = {"$in": user.get("pupil_ids") or []}
    pupils = await db[C.pupils].find(q, {"_id": 0}).sort("first_name", 1).to_list(500)
    return serialize_docs(
        [
            {"id": p["id"], "display_name": p.get("display_name"), "avatar": p.get("avatar")}
            for p in pupils
        ]
    )


# --------------------------------------------------------------------------- #
# Today - one uncluttered payload
# --------------------------------------------------------------------------- #
@today_router.get("")
async def today(date: str | None = None, user: dict = Depends(current_user)):
    db = get_db()
    d = date or today_iso()
    role = user.get("role") or {}
    settings = await db[C.settings].find_one({"id": "global"}, {"_id": 0}) or {}

    day = await db[C.daily].find_one({"date": d}, {"_id": 0}) or {"date": d, "items": []}
    state = dayclock.derive(day.get("items", []), d)
    items = state["items"]
    current, nxt, later = state["now"], state["next"], state["later"]

    jobs = await db[C.jobs].find({"enabled": True}, {"_id": 0}).sort("order", 1).to_list(50)
    assignments = await db[C.job_assignments].find({"date": d}, {"_id": 0}).to_list(100)
    pupils_map = {p["id"]: p for p in await db[C.pupils].find({"active": True}, {"_id": 0}).to_list(500)}
    by_job = {a["job_id"]: a for a in assignments}
    job_cards = []
    for job in jobs[:6]:
        a = by_job.get(job["id"])
        job_cards.append(
            {
                "id": job["id"],
                "title": job["title"],
                "symbol_concept": job.get("symbol_concept"),
                "pupil": serialize_doc(pupils_map.get(a["pupil_id"])) if a else None,
            }
        )

    mm_run = await db[C.mm_runs].find_one({"date": d}, {"_id": 0})
    mm_template = await db[C.mm_templates].find_one({"is_default": True}, {"_id": 0})
    mm_components = len([c for c in (mm_template or {}).get("components", []) if c.get("enabled", True)])

    comm_cats = await db[C.comm_categories].find({"enabled": True}, {"_id": 0}).sort("order", 1).to_list(20)
    zones = await db[C.zones].find({"enabled": True}, {"_id": 0}).sort("order", 1).to_list(20)
    breaks = (
        await db[C.brain_breaks]
        .find({"enabled": True}, {"_id": 0})
        .sort("order", 1)
        .to_list(50)
    )
    watch = (
        await db[C.watch]
        .find({"enabled": True, "featured": True}, {"_id": 0})
        .sort("order", 1)
        .to_list(30)
    )

    spark_events = await db[C.spark_events].find({}, {"_id": 0}).to_list(5000)
    class_total = sum(int(e.get("points", 1)) for e in spark_events)
    goal = await db[C.class_goals].find_one({"enabled": True}, {"_id": 0})
    today_events = [e for e in spark_events if str(e.get("at", "")).startswith(d)]

    recent_obs = []
    if has_permission(role, "observation.view"):
        recent_obs = await db[C.observations].find({}, {"_id": 0}).sort("at", -1).to_list(5)
        for o in recent_obs:
            o["pupil"] = pupils_map.get(o.get("pupil_id"))

    return {
        "date": d,
        "classroom_name": settings.get("classroom_name", "Western Park DSP"),
        "school_name": settings.get("school_name", ""),
        "sample_data": settings.get("sample_data", True),
        "appearance": settings.get("appearance", {}),
        "features": settings.get("features", {}),
        "tts": settings.get("tts", {}),
        "gamification": settings.get("gamification", {}),
        "pupil_facing": settings.get("pupil_facing", {}),
        "now": serialize_doc(current),
        "next": serialize_doc(nxt),
        "later": serialize_docs(later),
        "now_source": state["now_source"],
        "items": serialize_docs(items),
        "progress": state["progress"],
        "jobs": job_cards,
        "morning_meeting": {
            "components": mm_components,
            "current_index": (mm_run or {}).get("current_index", 0),
            "completed": bool((mm_run or {}).get("completed_at")),
            "checked_in": len((mm_run or {}).get("checkins", [])),
        },
        "communication_categories": serialize_docs(comm_cats),
        "zones": serialize_docs(zones),
        "brain_breaks": serialize_docs(breaks),
        "watch": serialize_docs(
            [{**w, "video": videolink.describe(w.get("url") or "")} for w in watch]
        ),
        "sparks": {
            "class_total": class_total,
            "today": sum(int(e.get("points", 1)) for e in today_events),
            "goal": serialize_doc(goal),
        },
        "pupil_count": len(pupils_map),
        "recent_observations": serialize_docs(recent_obs),
    }


# --------------------------------------------------------------------------- #
# Settings
# --------------------------------------------------------------------------- #
@settings_router.get("")
async def get_settings(user: dict = Depends(current_user)):
    db = get_db()
    doc = await db[C.settings].find_one({"id": "global"}, {"_id": 0})
    return serialize_doc(doc) or {}


@settings_router.patch("")
async def patch_settings(body: dict, user: dict = Depends(require("settings.edit"))):
    db = get_db()
    allowed = {
        "classroom_name",
        "school_name",
        "sample_data",
        "appearance",
        "gamification",
        "features",
        "pupil_facing",
        "tts",
    }
    current = await db[C.settings].find_one({"id": "global"}, {"_id": 0}) or {}
    patch: dict = {}
    for key, value in body.items():
        if key not in allowed:
            continue
        if isinstance(value, dict) and isinstance(current.get(key), dict):
            patch[key] = {**current[key], **value}
        else:
            patch[key] = value
    patch["updated_at"] = utcnow_iso()
    await db[C.settings].update_one({"id": "global"}, {"$set": patch}, upsert=True)
    return serialize_doc(await db[C.settings].find_one({"id": "global"}, {"_id": 0}))


@settings_router.get("/audit")
async def audit(limit: int = 100, user: dict = Depends(require("settings.edit"))):
    db = get_db()
    docs = await db[C.audit].find({}, {"_id": 0}).sort("at", -1).to_list(limit)
    users = {u["id"]: u.get("name") for u in await db[C.users].find({}, {"_id": 0}).to_list(200)}
    for d in docs:
        d["actor_name"] = users.get(d.get("actor_id"), "Unknown")
    return serialize_docs(docs)


@settings_router.get("/integrations")
async def integrations(user: dict = Depends(require("settings.edit"))):
    """Separated integration layer. Nothing is connected and nothing is required."""
    db = get_db()
    settings = await db[C.settings].find_one({"id": "global"}, {"_id": 0}) or {}
    return {
        "available": [
            {
                "key": "classdojo",
                "name": "ClassDojo",
                "status": "not_connected",
                "enabled": bool(settings.get("features", {}).get("classdojo_integration")),
                "note": "Optional and external. This platform works fully without ClassDojo. No official API is assumed and no unofficial integration or scraping is used. If an approved API becomes available it would be added here as a separate layer, sharing only necessary approved information.",
            }
        ]
    }


@settings_router.post("/reset-sample-data")
async def reset_sample_data(user: dict = Depends(require("settings.edit"))):
    """Remove every record that was seeded as sample content."""
    db = get_db()
    removed = {}
    collections = [
        C.pupils,
        C.pupil_profiles,
        C.groups,
        C.activities,
        C.templates,
        C.jobs,
        C.pickers,
        C.comm_categories,
        C.comm_options,
        C.zones,
        C.strategies,
        C.prepare_templates,
        C.spark_rules,
        C.badges,
        C.class_goals,
        C.blanks_prompts,
        C.interaction_areas,
        C.projects,
        C.targets,
        C.profile_sections,
        "expectations",
    ]
    for coll in collections:
        res = await db[coll].delete_many({"is_sample": True})
        if res.deleted_count:
            removed[coll] = res.deleted_count
    await db[C.settings].update_one({"id": "global"}, {"$set": {"sample_data": False}})
    return {"ok": True, "removed": removed}
