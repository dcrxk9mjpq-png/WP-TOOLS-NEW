"""Communication Centre and Interaction Centre (incl. Blank's Levels)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.crud import create_doc, delete_doc, list_docs, patch_doc, reorder_docs
from core.db import C, get_db
from core.security import require
from core.util import new_id, serialize_docs, utcnow_iso

router = APIRouter(prefix="/communication", tags=["communication"])
interaction_router = APIRouter(prefix="/interaction", tags=["interaction"])

CATEGORY_FIELDS = {"title", "symbol_concept", "colour", "enabled", "order"}
OPTION_FIELDS = {"text", "speech_text", "symbol_concept", "category_id", "enabled", "order", "favourite"}


@router.get("/board")
async def board(user: dict = Depends(require("comm.view"))):
    """Everything the Communication Centre needs in one call."""
    db = get_db()
    cats = await db[C.comm_categories].find({}, {"_id": 0}).sort("order", 1).to_list(100)
    opts = await db[C.comm_options].find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    for c in cats:
        c["options"] = [o for o in opts if o.get("category_id") == c["id"]]
    return serialize_docs(cats)


@router.get("/categories")
async def categories(user: dict = Depends(require("comm.view"))):
    return await list_docs(C.comm_categories, sort=[("order", 1)])


@router.post("/categories")
async def create_category(body: dict, user: dict = Depends(require("comm.edit"))):
    data = {k: v for k, v in body.items() if k in CATEGORY_FIELDS}
    return await create_doc(C.comm_categories, data, {"colour": "teal", "symbol_concept": "comm.communication"})


@router.patch("/categories/{category_id}")
async def update_category(category_id: str, body: dict, user: dict = Depends(require("comm.edit"))):
    return await patch_doc(C.comm_categories, category_id, body, CATEGORY_FIELDS)


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(require("comm.edit"))):
    db = get_db()
    await db[C.comm_options].delete_many({"category_id": category_id})
    return await delete_doc(C.comm_categories, category_id)


@router.post("/categories/reorder")
async def reorder_categories(body: dict, user: dict = Depends(require("comm.edit"))):
    return await reorder_docs(C.comm_categories, body.get("ids", []))


@router.get("/options")
async def options(category_id: str | None = None, user: dict = Depends(require("comm.view"))):
    q = {"category_id": category_id} if category_id else {}
    return await list_docs(C.comm_options, q, sort=[("order", 1)])


@router.post("/options")
async def create_option(body: dict, user: dict = Depends(require("comm.edit"))):
    data = {k: v for k, v in body.items() if k in OPTION_FIELDS}
    data.setdefault("speech_text", data.get("text", ""))
    return await create_doc(C.comm_options, data, {"symbol_concept": "comm.communication"})


@router.patch("/options/{option_id}")
async def update_option(option_id: str, body: dict, user: dict = Depends(require("comm.edit"))):
    return await patch_doc(C.comm_options, option_id, body, OPTION_FIELDS)


@router.delete("/options/{option_id}")
async def delete_option(option_id: str, user: dict = Depends(require("comm.edit"))):
    return await delete_doc(C.comm_options, option_id)


@router.post("/options/reorder")
async def reorder_options(body: dict, user: dict = Depends(require("comm.edit"))):
    return await reorder_docs(C.comm_options, body.get("ids", []))


class UseIn(BaseModel):
    option_id: str
    pupil_id: str | None = None
    independent: bool = True


@router.post("/used")
async def record_use(body: UseIn, user: dict = Depends(require("comm.view"))):
    """Light-touch log so the Communication Centre feeds progress patterns."""
    db = get_db()
    doc = {"id": new_id(), **body.model_dump(), "at": utcnow_iso(), "staff_id": user["id"]}
    await db[C.comm_log].insert_one(dict(doc))
    return {"ok": True}


@router.get("/recent")
async def recent(limit: int = 30, user: dict = Depends(require("comm.view"))):
    db = get_db()
    logs = await db[C.comm_log].find({}, {"_id": 0}).sort("at", -1).to_list(limit)
    opts = {o["id"]: o for o in await db[C.comm_options].find({}, {"_id": 0}).to_list(1000)}
    pupils = {p["id"]: p for p in await db[C.pupils].find({}, {"_id": 0}).to_list(500)}
    for entry in logs:
        entry["option"] = opts.get(entry.get("option_id"))
        entry["pupil"] = pupils.get(entry.get("pupil_id"))
    return serialize_docs(logs)


# --------------------------------------------------------------------------- #
# Interaction Centre + Blank's Levels
# --------------------------------------------------------------------------- #
AREA_FIELDS = {"title", "symbol_concept", "prompts", "enabled", "order"}


@interaction_router.get("/areas")
async def areas(user: dict = Depends(require("interaction.view"))):
    return await list_docs(C.interaction_areas, sort=[("order", 1)])


@interaction_router.post("/areas")
async def create_area(body: dict, user: dict = Depends(require("interaction.edit"))):
    data = {k: v for k, v in body.items() if k in AREA_FIELDS}
    return await create_doc(
        C.interaction_areas, data, {"prompts": [], "symbol_concept": "interaction.interaction"}
    )


@interaction_router.patch("/areas/{area_id}")
async def update_area(area_id: str, body: dict, user: dict = Depends(require("interaction.edit"))):
    return await patch_doc(C.interaction_areas, area_id, body, AREA_FIELDS)


@interaction_router.delete("/areas/{area_id}")
async def delete_area(area_id: str, user: dict = Depends(require("interaction.edit"))):
    return await delete_doc(C.interaction_areas, area_id)


@interaction_router.post("/areas/reorder")
async def reorder_areas(body: dict, user: dict = Depends(require("interaction.edit"))):
    return await reorder_docs(C.interaction_areas, body.get("ids", []))


@interaction_router.get("/blanks")
async def blanks(level: int | None = None, user: dict = Depends(require("interaction.view"))):
    q = {"level": level} if level else {}
    return await list_docs(C.blanks_prompts, q, sort=[("level", 1), ("order", 1)])


@interaction_router.post("/blanks")
async def create_blank(body: dict, user: dict = Depends(require("interaction.edit"))):
    data = {k: v for k, v in body.items() if k in {"level", "text", "enabled"}}
    return await create_doc(C.blanks_prompts, data, {"level": 1})


@interaction_router.patch("/blanks/{prompt_id}")
async def update_blank(prompt_id: str, body: dict, user: dict = Depends(require("interaction.edit"))):
    return await patch_doc(C.blanks_prompts, prompt_id, body, {"level", "text", "enabled", "order"})


@interaction_router.delete("/blanks/{prompt_id}")
async def delete_blank(prompt_id: str, user: dict = Depends(require("interaction.edit"))):
    return await delete_doc(C.blanks_prompts, prompt_id)


BLANKS_RESPONSES = [
    "independent response",
    "verbal prompt",
    "visual prompt",
    "modelled response",
    "repeated question",
    "unable to respond",
]


@interaction_router.get("/blanks/responses")
async def blanks_response_options(user: dict = Depends(require("interaction.view"))):
    return BLANKS_RESPONSES
