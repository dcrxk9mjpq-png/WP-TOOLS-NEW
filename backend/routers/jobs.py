"""Classroom Jobs and Random Pickers - fully configurable, nothing hard-coded."""
from __future__ import annotations

import random

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.crud import create_doc, delete_doc, list_docs, patch_doc, reorder_docs
from core.db import C, get_db
from core.security import require
from core.util import new_id, serialize_doc, serialize_docs, today_iso, utcnow_iso

jobs_router = APIRouter(prefix="/jobs", tags=["jobs"])
pickers_router = APIRouter(prefix="/pickers", tags=["pickers"])

JOB_FIELDS = {
    "title",
    "symbol_concept",
    "description",
    "frequency",
    "enabled",
    "order",
    "excluded_pupil_ids",
}


@jobs_router.get("")
async def list_jobs(date: str | None = None, user: dict = Depends(require("jobs.view"))):
    db = get_db()
    d = date or today_iso()
    jobs = await db[C.jobs].find({}, {"_id": 0}).sort("order", 1).to_list(200)
    assignments = await db[C.job_assignments].find({"date": d}, {"_id": 0}).to_list(300)
    pupils = {p["id"]: p for p in await db[C.pupils].find({}, {"_id": 0}).to_list(500)}
    by_job = {a["job_id"]: a for a in assignments}
    for job in jobs:
        a = by_job.get(job["id"])
        job["assignment"] = a
        job["pupil"] = pupils.get(a["pupil_id"]) if a else None
    return {"date": d, "jobs": serialize_docs(jobs)}


@jobs_router.post("")
async def create_job(body: dict, user: dict = Depends(require("jobs.edit"))):
    data = {k: v for k, v in body.items() if k in JOB_FIELDS}
    return await create_doc(
        C.jobs,
        data,
        {"symbol_concept": "job.job", "description": "", "frequency": "daily", "excluded_pupil_ids": []},
    )


@jobs_router.patch("/{job_id}")
async def update_job(job_id: str, body: dict, user: dict = Depends(require("jobs.edit"))):
    return await patch_doc(C.jobs, job_id, body, JOB_FIELDS)


@jobs_router.delete("/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(require("jobs.edit"))):
    db = get_db()
    await db[C.job_assignments].delete_many({"job_id": job_id})
    return await delete_doc(C.jobs, job_id)


@jobs_router.post("/reorder")
async def reorder_jobs(body: dict, user: dict = Depends(require("jobs.edit"))):
    return await reorder_docs(C.jobs, body.get("ids", []))


class AssignIn(BaseModel):
    pupil_id: str | None = None
    date: str | None = None


@jobs_router.post("/{job_id}/assign")
async def assign_job(job_id: str, body: AssignIn, user: dict = Depends(require("jobs.edit"))):
    db = get_db()
    d = body.date or today_iso()
    await db[C.job_assignments].delete_many({"job_id": job_id, "date": d})
    if body.pupil_id:
        await db[C.job_assignments].insert_one(
            {
                "id": new_id(),
                "job_id": job_id,
                "pupil_id": body.pupil_id,
                "date": d,
                "source": "manual",
                "assigned_by": user["id"],
                "at": utcnow_iso(),
            }
        )
    return await list_jobs(d, user)


@jobs_router.post("/{job_id}/random")
async def random_assign(job_id: str, date: str | None = None, user: dict = Depends(require("jobs.edit"))):
    db = get_db()
    d = date or today_iso()
    job = await db[C.jobs].find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    pupils = await db[C.pupils].find({"active": True}, {"_id": 0}).to_list(500)
    excluded = set(job.get("excluded_pupil_ids", []))
    taken = {
        a["pupil_id"]
        for a in await db[C.job_assignments].find({"date": d}, {"_id": 0}).to_list(300)
        if a["job_id"] != job_id
    }
    recent = {
        a["pupil_id"]
        for a in await db[C.job_assignments]
        .find({"job_id": job_id}, {"_id": 0})
        .sort("at", -1)
        .to_list(2)
    }
    pool = [p for p in pupils if p["id"] not in excluded and p["id"] not in taken]
    fresh = [p for p in pool if p["id"] not in recent] or pool
    if not fresh:
        raise HTTPException(400, "No eligible pupils available for this job")
    chosen = random.choice(fresh)
    await db[C.job_assignments].delete_many({"job_id": job_id, "date": d})
    await db[C.job_assignments].insert_one(
        {
            "id": new_id(),
            "job_id": job_id,
            "pupil_id": chosen["id"],
            "date": d,
            "source": "random",
            "assigned_by": user["id"],
            "at": utcnow_iso(),
        }
    )
    result = await list_jobs(d, user)
    result["chosen"] = serialize_doc(chosen)
    return result


@jobs_router.post("/rotate")
async def rotate_jobs(date: str | None = None, user: dict = Depends(require("jobs.edit"))):
    """Move every job on to the next eligible pupil."""
    db = get_db()
    d = date or today_iso()
    jobs = await db[C.jobs].find({"enabled": True}, {"_id": 0}).sort("order", 1).to_list(200)
    pupils = await db[C.pupils].find({"active": True}, {"_id": 0}).sort("first_name", 1).to_list(500)
    if not pupils:
        raise HTTPException(400, "Add pupils before rotating jobs")
    current = {
        a["job_id"]: a["pupil_id"]
        for a in await db[C.job_assignments].find({"date": d}, {"_id": 0}).to_list(300)
    }
    used: set[str] = set()
    await db[C.job_assignments].delete_many({"date": d})
    ids = [p["id"] for p in pupils]
    for job in jobs:
        excluded = set(job.get("excluded_pupil_ids", []))
        start = ids.index(current[job["id"]]) + 1 if current.get(job["id"]) in ids else 0
        pick = None
        for offset in range(len(ids)):
            candidate = ids[(start + offset) % len(ids)]
            if candidate not in excluded and candidate not in used:
                pick = candidate
                break
        if pick:
            used.add(pick)
            await db[C.job_assignments].insert_one(
                {
                    "id": new_id(),
                    "job_id": job["id"],
                    "pupil_id": pick,
                    "date": d,
                    "source": "rotate",
                    "assigned_by": user["id"],
                    "at": utcnow_iso(),
                }
            )
    return await list_jobs(d, user)


@jobs_router.post("/reset")
async def reset_jobs(date: str | None = None, user: dict = Depends(require("jobs.edit"))):
    db = get_db()
    d = date or today_iso()
    await db[C.job_assignments].delete_many({"date": d})
    return await list_jobs(d, user)


# --------------------------------------------------------------------------- #
# Random pickers
# --------------------------------------------------------------------------- #
PICKER_FIELDS = {"name", "kind", "symbol_concept", "options", "rules", "enabled", "order"}


@pickers_router.get("")
async def list_pickers(user: dict = Depends(require("pickers.use"))):
    return await list_docs(C.pickers, sort=[("order", 1)])


@pickers_router.post("")
async def create_picker(body: dict, user: dict = Depends(require("pickers.edit"))):
    data = {k: v for k, v in body.items() if k in PICKER_FIELDS}
    return await create_doc(
        C.pickers,
        data,
        {
            "kind": "option",
            "symbol_concept": "system.picker",
            "options": [],
            "rules": {
                "no_immediate_repeat": True,
                "avoid_recent": 2,
                "excluded_ids": [],
                "show_photos": False,
            },
        },
    )


@pickers_router.patch("/{picker_id}")
async def update_picker(picker_id: str, body: dict, user: dict = Depends(require("pickers.edit"))):
    return await patch_doc(C.pickers, picker_id, body, PICKER_FIELDS)


@pickers_router.delete("/{picker_id}")
async def delete_picker(picker_id: str, user: dict = Depends(require("pickers.edit"))):
    db = get_db()
    await db[C.picker_history].delete_many({"picker_id": picker_id})
    return await delete_doc(C.pickers, picker_id)


@pickers_router.post("/reorder")
async def reorder_pickers(body: dict, user: dict = Depends(require("pickers.edit"))):
    return await reorder_docs(C.pickers, body.get("ids", []))


@pickers_router.get("/{picker_id}/history")
async def history(picker_id: str, limit: int = 20, user: dict = Depends(require("pickers.use"))):
    db = get_db()
    docs = (
        await db[C.picker_history]
        .find({"picker_id": picker_id}, {"_id": 0})
        .sort("at", -1)
        .to_list(limit)
    )
    return serialize_docs(docs)


@pickers_router.post("/{picker_id}/reset")
async def reset_history(picker_id: str, user: dict = Depends(require("pickers.use"))):
    db = get_db()
    await db[C.picker_history].delete_many({"picker_id": picker_id})
    return {"ok": True}


@pickers_router.post("/{picker_id}/spin")
async def spin(picker_id: str, user: dict = Depends(require("pickers.use"))):
    db = get_db()
    picker = await db[C.pickers].find_one({"id": picker_id}, {"_id": 0})
    if not picker:
        raise HTTPException(404, "Picker not found")
    rules = picker.get("rules") or {}
    excluded = set(rules.get("excluded_ids", []))

    if picker.get("kind") == "pupil":
        pool = [
            {"id": p["id"], "label": p.get("display_name", p.get("first_name")), "pupil": p}
            for p in await db[C.pupils].find({"active": True}, {"_id": 0}).to_list(500)
            if p["id"] not in excluded
        ]
    else:
        pool = [
            {"id": o["id"], "label": o["label"], "symbol_concept": o.get("symbol_concept")}
            for o in picker.get("options", [])
            if o["id"] not in excluded
        ]
    if not pool:
        raise HTTPException(400, "This picker has nothing to choose from yet")

    recent_n = int(rules.get("avoid_recent", 0) or 0)
    if rules.get("no_immediate_repeat") and recent_n < 1:
        recent_n = 1
    recent = [
        h["result_id"]
        for h in await db[C.picker_history]
        .find({"picker_id": picker_id}, {"_id": 0})
        .sort("at", -1)
        .to_list(max(recent_n, 1))
    ][:recent_n]
    fresh = [p for p in pool if p["id"] not in set(recent)] or pool
    chosen = random.choice(fresh)

    await db[C.picker_history].insert_one(
        {
            "id": new_id(),
            "picker_id": picker_id,
            "result_id": chosen["id"],
            "result_label": chosen["label"],
            "at": utcnow_iso(),
            "by": user["id"],
        }
    )
    return {"chosen": serialize_doc(chosen), "pool_size": len(pool), "avoided": recent}
