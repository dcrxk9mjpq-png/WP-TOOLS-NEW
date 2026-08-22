"""Authentication + staff account endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from core.db import C, get_db
from core.permissions import PERMISSIONS, has_permission
from core.security import (
    create_token,
    current_user,
    hash_password,
    require,
    verify_password,
)
from core.util import new_id, serialize_doc, serialize_docs, utcnow_iso

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role_id: str
    pupil_ids: list[str] = []


class UserPatch(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    role_id: str | None = None
    pupil_ids: list[str] | None = None
    active: bool | None = None


def _public(user: dict) -> dict:
    out = {k: v for k, v in user.items() if k not in {"password_hash", "_id"}}
    return serialize_doc(out)


@router.post("/login")
async def login(body: LoginIn):
    db = get_db()
    user = await db[C.users].find_one({"email": body.email.lower().strip()})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(401, "Email or password is not correct")
    if not user.get("active", True):
        raise HTTPException(403, "This account has been deactivated")
    role = await db[C.roles].find_one({"id": user.get("role_id")}, {"_id": 0})
    await db[C.users].update_one({"id": user["id"]}, {"$set": {"last_signed_in": utcnow_iso()}})
    user["role"] = role
    return {"token": create_token(user["id"]), "user": _public(user)}


@router.get("/me")
async def me(user: dict = Depends(current_user)):
    return _public(user)


@router.get("/permissions")
async def permission_catalogue(user: dict = Depends(current_user)):
    return PERMISSIONS


@router.get("/roles")
async def list_roles(user: dict = Depends(current_user)):
    db = get_db()
    roles = await db[C.roles].find({}, {"_id": 0}).sort("name", 1).to_list(200)
    return serialize_docs(roles)


class RoleIn(BaseModel):
    name: str
    description: str = ""
    permissions: list[str] = []
    visibility_scope: str = "assigned_pupils"
    read_only: bool = False


@router.post("/roles")
async def create_role(body: RoleIn, user: dict = Depends(require("roles.edit"))):
    db = get_db()
    doc = body.model_dump()
    doc.update({"id": new_id(), "is_system": False, "created_at": utcnow_iso()})
    await db[C.roles].insert_one(doc)
    return serialize_doc(doc)


@router.patch("/roles/{role_id}")
async def update_role(role_id: str, body: dict, user: dict = Depends(require("roles.edit"))):
    db = get_db()
    role = await db[C.roles].find_one({"id": role_id})
    if not role:
        raise HTTPException(404, "Role not found")
    patch = {k: v for k, v in body.items() if k in {"name", "description", "permissions", "visibility_scope", "read_only"}}
    await db[C.roles].update_one({"id": role_id}, {"$set": patch})
    return serialize_doc(await db[C.roles].find_one({"id": role_id}, {"_id": 0}))


@router.delete("/roles/{role_id}")
async def delete_role(role_id: str, user: dict = Depends(require("roles.edit"))):
    db = get_db()
    role = await db[C.roles].find_one({"id": role_id})
    if not role:
        raise HTTPException(404, "Role not found")
    if role.get("is_system"):
        raise HTTPException(400, "System roles cannot be deleted")
    in_use = await db[C.users].count_documents({"role_id": role_id})
    if in_use:
        raise HTTPException(400, f"{in_use} staff account(s) still use this role")
    await db[C.roles].delete_one({"id": role_id})
    return {"ok": True}


@router.get("/users")
async def list_users(user: dict = Depends(require("users.edit"))):
    db = get_db()
    users = await db[C.users].find({}, {"_id": 0, "password_hash": 0}).sort("name", 1).to_list(500)
    roles = {r["id"]: r for r in await db[C.roles].find({}, {"_id": 0}).to_list(200)}
    for u in users:
        u["role"] = roles.get(u.get("role_id"))
    return serialize_docs(users)


@router.post("/users")
async def create_user(body: UserIn, user: dict = Depends(require("users.edit"))):
    db = get_db()
    email = body.email.lower().strip()
    if await db[C.users].find_one({"email": email}):
        raise HTTPException(400, "A staff account already uses that email")
    doc = {
        "id": new_id(),
        "name": body.name,
        "email": email,
        "password_hash": hash_password(body.password),
        "role_id": body.role_id,
        "pupil_ids": body.pupil_ids,
        "active": True,
        "created_at": utcnow_iso(),
    }
    await db[C.users].insert_one(doc)
    return _public(doc)


@router.patch("/users/{user_id}")
async def update_user(user_id: str, body: UserPatch, user: dict = Depends(require("users.edit"))):
    db = get_db()
    target = await db[C.users].find_one({"id": user_id})
    if not target:
        raise HTTPException(404, "Staff account not found")
    patch: dict = {}
    data = body.model_dump(exclude_none=True)
    if "password" in data:
        patch["password_hash"] = hash_password(data.pop("password"))
    if "email" in data:
        data["email"] = data["email"].lower().strip()
    patch.update(data)
    await db[C.users].update_one({"id": user_id}, {"$set": patch})
    updated = await db[C.users].find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return serialize_doc(updated)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require("users.edit"))):
    db = get_db()
    if user_id == user["id"]:
        raise HTTPException(400, "You cannot delete your own account")
    await db[C.users].delete_one({"id": user_id})
    return {"ok": True}


@router.get("/can/{permission}")
async def can(permission: str, user: dict = Depends(current_user)):
    return {"allowed": has_permission(user.get("role"), permission)}
