"""Regulation Centre - Zones of Regulation and configurable strategies."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.crud import create_doc, delete_doc, list_docs, patch_doc, reorder_docs
from core.db import C, get_db
from core.security import require
from core.util import new_id, serialize_docs, utcnow_iso

router = APIRouter(prefix="/regulation", tags=["regulation"])

ZONE_FIELDS = {"name", "colour", "feelings", "indicators", "enabled", "order", "symbol_concept"}
STRATEGY_FIELDS = {"title", "symbol_concept", "kind", "zone_ids", "enabled", "order", "description"}


@router.get("/board")
async def board(pupil_id: str | None = None, user: dict = Depends(require("regulation.view"))):
    db = get_db()
    zones = await db[C.zones].find({}, {"_id": 0}).sort("order", 1).to_list(50)
    strategies = await db[C.strategies].find({}, {"_id": 0}).sort("order", 1).to_list(300)
    supports = None
    if pupil_id:
        supports = await db[C.pupil_supports].find_one({"pupil_id": pupil_id}, {"_id": 0})
        if supports and supports.get("strategy_ids"):
            chosen = set(supports["strategy_ids"])
            for s in strategies:
                s["for_pupil"] = s["id"] in chosen
    return {
        "zones": serialize_docs(zones),
        "strategies": serialize_docs(strategies),
        "supports": supports and {k: v for k, v in supports.items() if k != "_id"},
    }


@router.get("/zones")
async def zones(user: dict = Depends(require("regulation.view"))):
    return await list_docs(C.zones, sort=[("order", 1)])


@router.post("/zones")
async def create_zone(body: dict, user: dict = Depends(require("regulation.edit"))):
    data = {k: v for k, v in body.items() if k in ZONE_FIELDS}
    return await create_doc(C.zones, data, {"colour": "green", "feelings": [], "indicators": []})


@router.patch("/zones/{zone_id}")
async def update_zone(zone_id: str, body: dict, user: dict = Depends(require("regulation.edit"))):
    return await patch_doc(C.zones, zone_id, body, ZONE_FIELDS)


@router.delete("/zones/{zone_id}")
async def delete_zone(zone_id: str, user: dict = Depends(require("regulation.edit"))):
    return await delete_doc(C.zones, zone_id)


@router.post("/zones/reorder")
async def reorder_zones(body: dict, user: dict = Depends(require("regulation.edit"))):
    return await reorder_docs(C.zones, body.get("ids", []))


@router.get("/strategies")
async def strategies(kind: str | None = None, user: dict = Depends(require("regulation.view"))):
    q = {"kind": kind} if kind else {}
    return await list_docs(C.strategies, q, sort=[("order", 1)])


@router.post("/strategies")
async def create_strategy(body: dict, user: dict = Depends(require("regulation.edit"))):
    data = {k: v for k, v in body.items() if k in STRATEGY_FIELDS}
    return await create_doc(
        C.strategies, data, {"kind": "calming", "zone_ids": [], "symbol_concept": "routine.calming"}
    )


@router.patch("/strategies/{strategy_id}")
async def update_strategy(
    strategy_id: str, body: dict, user: dict = Depends(require("regulation.edit"))
):
    return await patch_doc(C.strategies, strategy_id, body, STRATEGY_FIELDS)


@router.delete("/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str, user: dict = Depends(require("regulation.edit"))):
    return await delete_doc(C.strategies, strategy_id)


@router.post("/strategies/reorder")
async def reorder_strategies(body: dict, user: dict = Depends(require("regulation.edit"))):
    return await reorder_docs(C.strategies, body.get("ids", []))


class CheckIn(BaseModel):
    pupil_id: str
    zone_id: str | None = None
    feeling: str | None = None
    strategy_id: str | None = None
    note: str = ""


@router.post("/log")
async def log(body: CheckIn, user: dict = Depends(require("regulation.view"))):
    db = get_db()
    doc = {"id": new_id(), **body.model_dump(), "at": utcnow_iso(), "staff_id": user["id"]}
    await db[C.regulation_log].insert_one(dict(doc))
    return {"ok": True}


@router.get("/log")
async def get_log(
    pupil_id: str | None = None, limit: int = 50, user: dict = Depends(require("regulation.view"))
):
    db = get_db()
    q = {"pupil_id": pupil_id} if pupil_id else {}
    docs = await db[C.regulation_log].find(q, {"_id": 0}).sort("at", -1).to_list(limit)
    zones = {z["id"]: z for z in await db[C.zones].find({}, {"_id": 0}).to_list(50)}
    pupils = {p["id"]: p for p in await db[C.pupils].find({}, {"_id": 0}).to_list(500)}
    for d in docs:
        d["zone"] = zones.get(d.get("zone_id"))
        d["pupil"] = pupils.get(d.get("pupil_id"))
    return serialize_docs(docs)
