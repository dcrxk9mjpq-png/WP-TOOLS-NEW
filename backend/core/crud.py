"""Reusable CRUD building blocks.

Every configurable classroom concept (jobs, pickers, categories, strategies,
Spark rules, interaction areas...) is stored as data and edited through the same
generic endpoints, so the classroom administrator can rename, reorder, add or
delete anything without a code change.
"""
from __future__ import annotations

from typing import Any, Iterable

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.db import get_db
from core.security import require
from core.util import new_id, serialize_doc, serialize_docs, utcnow_iso


class ReorderIn(BaseModel):
    ids: list[str]


async def list_docs(
    collection: str,
    query: dict | None = None,
    sort: list[tuple[str, int]] | None = None,
    limit: int = 2000,
) -> list[dict]:
    db = get_db()
    cursor = db[collection].find(query or {}, {"_id": 0})
    if sort:
        cursor = cursor.sort(sort)
    return serialize_docs(await cursor.to_list(limit))


async def get_doc(collection: str, doc_id: str) -> dict:
    db = get_db()
    doc = await db[collection].find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return serialize_doc(doc)


async def create_doc(collection: str, data: dict, defaults: dict | None = None) -> dict:
    db = get_db()
    doc = {**(defaults or {}), **data}
    doc.setdefault("id", new_id())
    doc.setdefault("enabled", True)
    doc["is_sample"] = False
    doc["created_at"] = utcnow_iso()
    if "order" not in doc:
        doc["order"] = await db[collection].count_documents({})
    await db[collection].insert_one(dict(doc))
    return serialize_doc(doc)


async def patch_doc(collection: str, doc_id: str, data: dict, allowed: Iterable[str]) -> dict:
    db = get_db()
    allowed = set(allowed)
    patch = {k: v for k, v in data.items() if k in allowed}
    if not patch:
        raise HTTPException(400, "Nothing to update")
    patch["updated_at"] = utcnow_iso()
    res = await db[collection].update_one({"id": doc_id}, {"$set": patch})
    if not res.matched_count:
        raise HTTPException(404, "Not found")
    return serialize_doc(await db[collection].find_one({"id": doc_id}, {"_id": 0}))


async def delete_doc(collection: str, doc_id: str) -> dict:
    db = get_db()
    res = await db[collection].delete_one({"id": doc_id})
    if not res.deleted_count:
        raise HTTPException(404, "Not found")
    return {"ok": True}


async def reorder_docs(collection: str, ids: list[str]) -> list[dict]:
    db = get_db()
    for index, doc_id in enumerate(ids):
        await db[collection].update_one({"id": doc_id}, {"$set": {"order": index}})
    return await list_docs(collection, sort=[("order", 1)])


def crud_router(
    *,
    prefix: str,
    tag: str,
    collection: str,
    allowed_fields: Iterable[str],
    view_permission: str,
    edit_permission: str,
    defaults: dict[str, Any] | None = None,
    sort: list[tuple[str, int]] | None = None,
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[tag])
    fields = list(allowed_fields)
    order = sort or [("order", 1)]

    @router.get("")
    async def _list(user: dict = Depends(require(view_permission))):
        return await list_docs(collection, sort=order)

    @router.post("")
    async def _create(body: dict, user: dict = Depends(require(edit_permission))):
        data = {k: v for k, v in body.items() if k in fields}
        return await create_doc(collection, data, defaults)

    @router.patch("/{doc_id}")
    async def _patch(doc_id: str, body: dict, user: dict = Depends(require(edit_permission))):
        return await patch_doc(collection, doc_id, body, fields)

    @router.delete("/{doc_id}")
    async def _delete(doc_id: str, user: dict = Depends(require(edit_permission))):
        return await delete_doc(collection, doc_id)

    @router.post("/reorder")
    async def _reorder(body: ReorderIn, user: dict = Depends(require(edit_permission))):
        return await reorder_docs(collection, body.ids)

    return router
