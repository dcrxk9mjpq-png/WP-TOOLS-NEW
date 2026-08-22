"""Quick Observations, Sparks (positive recognition) and progress patterns."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.crud import create_doc, delete_doc, list_docs, patch_doc, reorder_docs
from core.db import C, get_db
from core.security import require
from core.util import new_id, serialize_doc, serialize_docs, utcnow, utcnow_iso

obs_router = APIRouter(prefix="/observations", tags=["observations"])
sparks_router = APIRouter(prefix="/sparks", tags=["sparks"])

AREAS = ["Communication", "Interaction", "Regulation", "Independence", "Engagement"]
SUPPORT_LEVELS = ["Independent", "Prompted", "Modelled"]


@obs_router.get("/options")
async def options(user: dict = Depends(require("observation.create"))):
    db = get_db()
    blanks = await db[C.blanks_prompts].find({"enabled": True}, {"_id": 0}).sort("level", 1).to_list(200)
    return {
        "areas": AREAS,
        "support_levels": SUPPORT_LEVELS,
        "blanks_levels": [1, 2, 3, 4],
        "blanks_responses": [
            "Independent response",
            "Verbal prompt",
            "Visual prompt",
            "Modelled response",
            "Repeated question",
            "Unable to respond",
        ],
        "blanks_prompts": serialize_docs(blanks),
    }


class ObservationIn(BaseModel):
    pupil_id: str
    area: str
    support_level: str
    note: str = ""
    activity_id: str | None = None
    activity_title: str | None = None
    blanks_level: int | None = None
    blanks_response: str | None = None
    interaction_area_id: str | None = None


@obs_router.post("")
async def create_observation(body: ObservationIn, user: dict = Depends(require("observation.create"))):
    if body.area not in AREAS:
        raise HTTPException(400, f"Area must be one of {AREAS}")
    if body.support_level not in SUPPORT_LEVELS:
        raise HTTPException(400, f"Support level must be one of {SUPPORT_LEVELS}")
    db = get_db()
    doc = {
        "id": new_id(),
        **body.model_dump(),
        "staff_id": user["id"],
        "staff_name": user.get("name"),
        "at": utcnow_iso(),
        "is_sample": False,
    }
    await db[C.observations].insert_one(dict(doc))
    return serialize_doc(doc)


@obs_router.get("")
async def list_observations(
    pupil_id: str | None = None,
    area: str | None = None,
    limit: int = 100,
    user: dict = Depends(require("observation.view")),
):
    db = get_db()
    q: dict = {}
    if pupil_id:
        q["pupil_id"] = pupil_id
    if area:
        q["area"] = area
    docs = await db[C.observations].find(q, {"_id": 0}).sort("at", -1).to_list(limit)
    pupils = {p["id"]: p for p in await db[C.pupils].find({}, {"_id": 0}).to_list(500)}
    for d in docs:
        d["pupil"] = pupils.get(d.get("pupil_id"))
    return serialize_docs(docs)


@obs_router.delete("/{observation_id}")
async def delete_observation(observation_id: str, user: dict = Depends(require("observation.create"))):
    return await delete_doc(C.observations, observation_id)


@obs_router.get("/patterns")
async def patterns(
    pupil_id: str | None = None, days: int = 42, user: dict = Depends(require("observation.view"))
):
    """Educational patterns only - never a behaviour score, never a diagnosis."""
    db = get_db()
    since = (utcnow() - timedelta(days=days)).isoformat()
    q: dict = {"at": {"$gte": since}}
    if pupil_id:
        q["pupil_id"] = pupil_id
    docs = await db[C.observations].find(q, {"_id": 0}).sort("at", 1).to_list(3000)

    by_area: dict[str, dict[str, int]] = {a: {s: 0 for s in SUPPORT_LEVELS} for a in AREAS}
    weekly: dict[str, dict[str, int]] = defaultdict(lambda: {s: 0 for s in SUPPORT_LEVELS})
    for d in docs:
        area = d.get("area")
        level = d.get("support_level")
        if area in by_area and level in SUPPORT_LEVELS:
            by_area[area][level] += 1
        try:
            dt = datetime.fromisoformat(d["at"])
        except Exception:  # noqa: BLE001
            continue
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        week = dt.isocalendar()
        key = f"{week[0]}-W{week[1]:02d}"
        if level in SUPPORT_LEVELS:
            weekly[key][level] += 1

    series = [{"period": k, **v, "total": sum(v.values())} for k, v in sorted(weekly.items())]
    for point in series:
        point["independent_pct"] = (
            round(point["Independent"] / point["total"] * 100) if point["total"] else 0
        )

    highlights: list[dict] = []
    if len(series) >= 2:
        first, last = series[0], series[-1]
        if last["independent_pct"] > first["independent_pct"]:
            highlights.append(
                {
                    "kind": "positive",
                    "text": f"Independent responses have risen from {first['independent_pct']}% to {last['independent_pct']}% of recorded observations.",
                }
            )
        if last["Prompted"] + last["Modelled"] < first["Prompted"] + first["Modelled"]:
            highlights.append(
                {"kind": "positive", "text": "Recorded prompting has reduced over this period."}
            )
    comm = by_area["Communication"]
    if comm["Independent"] >= max(1, comm["Prompted"]):
        highlights.append(
            {"kind": "positive", "text": "Most communication observations are being recorded as independent."}
        )
    if not docs:
        highlights.append(
            {"kind": "neutral", "text": "No observations recorded yet for this period."}
        )

    return {
        "days": days,
        "total": len(docs),
        "by_area": by_area,
        "series": series,
        "highlights": highlights,
        "disclaimer": "These are educational observations recorded by classroom staff. They are not a behaviour score and do not diagnose.",
    }


# --------------------------------------------------------------------------- #
# Sparks
# --------------------------------------------------------------------------- #
RULE_FIELDS = {"title", "area", "points", "symbol_concept", "enabled", "order"}
BADGE_FIELDS = {"title", "symbol_concept", "threshold", "area", "enabled", "order"}


@sparks_router.get("/board")
async def board(user: dict = Depends(require("pupil.view"))):
    db = get_db()
    settings = await db[C.settings].find_one({"id": "global"}, {"_id": 0}) or {}
    gam = settings.get("gamification", {})
    rules = await db[C.spark_rules].find({"enabled": True}, {"_id": 0}).sort("order", 1).to_list(200)
    badges = await db[C.badges].find({"enabled": True}, {"_id": 0}).sort("threshold", 1).to_list(100)
    goal = await db[C.class_goals].find_one({"enabled": True}, {"_id": 0})
    events = await db[C.spark_events].find({}, {"_id": 0}).to_list(5000)
    pupils = await db[C.pupils].find({"active": True}, {"_id": 0}).sort("first_name", 1).to_list(500)

    totals: dict[str, int] = defaultdict(int)
    areas: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for e in events:
        totals[e["pupil_id"]] += int(e.get("points", 1))
        areas[e["pupil_id"]][e.get("area", "Other")] += int(e.get("points", 1))

    for p in pupils:
        p["sparks"] = totals.get(p["id"], 0)
        p["areas"] = dict(areas.get(p["id"], {}))
        p["badges"] = [b["id"] for b in badges if p["sparks"] >= int(b.get("threshold", 0))]

    class_total = sum(totals.values())
    if goal:
        goal = {**goal, "current": class_total}

    return {
        "enabled": bool(gam.get("enabled", True)),
        "currency_name": gam.get("currency_name", "Sparks"),
        "rules": serialize_docs(rules),
        "badges": serialize_docs(badges),
        "goal": serialize_doc(goal),
        "pupils": serialize_docs(pupils),
        "class_total": class_total,
    }


class AwardIn(BaseModel):
    pupil_ids: list[str]
    rule_id: str
    note: str = ""


@sparks_router.post("/award")
async def award(body: AwardIn, user: dict = Depends(require("sparks.award"))):
    db = get_db()
    rule = await db[C.spark_rules].find_one({"id": body.rule_id}, {"_id": 0})
    if not rule:
        raise HTTPException(404, "Spark reason not found")
    created = []
    for pupil_id in body.pupil_ids:
        doc = {
            "id": new_id(),
            "pupil_id": pupil_id,
            "rule_id": rule["id"],
            "rule_title": rule["title"],
            "area": rule.get("area", "Other"),
            "points": int(rule.get("points", 1)),
            "symbol_concept": rule.get("symbol_concept"),
            "note": body.note,
            "awarded_by": user["id"],
            "at": utcnow_iso(),
        }
        await db[C.spark_events].insert_one(dict(doc))
        created.append(serialize_doc(doc))
    return {"awarded": created}


@sparks_router.get("/events")
async def events(
    pupil_id: str | None = None, limit: int = 50, user: dict = Depends(require("pupil.view"))
):
    db = get_db()
    q = {"pupil_id": pupil_id} if pupil_id else {}
    docs = await db[C.spark_events].find(q, {"_id": 0}).sort("at", -1).to_list(limit)
    pupils = {p["id"]: p for p in await db[C.pupils].find({}, {"_id": 0}).to_list(500)}
    for d in docs:
        d["pupil"] = pupils.get(d.get("pupil_id"))
    return serialize_docs(docs)


@sparks_router.delete("/events/{event_id}")
async def remove_event(event_id: str, user: dict = Depends(require("sparks.award"))):
    return await delete_doc(C.spark_events, event_id)


@sparks_router.get("/rules")
async def rules(user: dict = Depends(require("pupil.view"))):
    return await list_docs(C.spark_rules, sort=[("order", 1)])


@sparks_router.post("/rules")
async def create_rule(body: dict, user: dict = Depends(require("sparks.edit"))):
    data = {k: v for k, v in body.items() if k in RULE_FIELDS}
    return await create_doc(
        C.spark_rules, data, {"points": 1, "area": "Participation", "symbol_concept": "system.spark"}
    )


@sparks_router.patch("/rules/{rule_id}")
async def update_rule(rule_id: str, body: dict, user: dict = Depends(require("sparks.edit"))):
    return await patch_doc(C.spark_rules, rule_id, body, RULE_FIELDS)


@sparks_router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, user: dict = Depends(require("sparks.edit"))):
    return await delete_doc(C.spark_rules, rule_id)


@sparks_router.post("/rules/reorder")
async def reorder_rules(body: dict, user: dict = Depends(require("sparks.edit"))):
    return await reorder_docs(C.spark_rules, body.get("ids", []))


@sparks_router.get("/badges")
async def list_badges(user: dict = Depends(require("pupil.view"))):
    return await list_docs(C.badges, sort=[("threshold", 1)])


@sparks_router.post("/badges")
async def create_badge(body: dict, user: dict = Depends(require("sparks.edit"))):
    data = {k: v for k, v in body.items() if k in BADGE_FIELDS}
    return await create_doc(
        C.badges, data, {"threshold": 10, "area": "Participation", "symbol_concept": "system.badge"}
    )


@sparks_router.patch("/badges/{badge_id}")
async def update_badge(badge_id: str, body: dict, user: dict = Depends(require("sparks.edit"))):
    return await patch_doc(C.badges, badge_id, body, BADGE_FIELDS)


@sparks_router.delete("/badges/{badge_id}")
async def delete_badge(badge_id: str, user: dict = Depends(require("sparks.edit"))):
    return await delete_doc(C.badges, badge_id)


@sparks_router.get("/goal")
async def get_goal(user: dict = Depends(require("pupil.view"))):
    return await list_docs(C.class_goals)


@sparks_router.post("/goal")
async def create_goal(body: dict, user: dict = Depends(require("sparks.edit"))):
    data = {k: v for k, v in body.items() if k in {"title", "target", "reward", "period", "enabled"}}
    return await create_doc(C.class_goals, data, {"target": 50, "period": "half_term", "symbol_concept": "system.spark"})


@sparks_router.patch("/goal/{goal_id}")
async def update_goal(goal_id: str, body: dict, user: dict = Depends(require("sparks.edit"))):
    return await patch_doc(C.class_goals, goal_id, body, {"title", "target", "reward", "period", "enabled"})


@sparks_router.delete("/goal/{goal_id}")
async def delete_goal(goal_id: str, user: dict = Depends(require("sparks.edit"))):
    return await delete_doc(C.class_goals, goal_id)


@sparks_router.post("/reset")
async def reset_sparks(user: dict = Depends(require("sparks.edit"))):
    db = get_db()
    await db[C.spark_events].delete_many({})
    return {"ok": True}
