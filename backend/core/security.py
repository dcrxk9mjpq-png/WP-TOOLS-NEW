"""Authentication: password hashing, JWT issue/verify, FastAPI dependencies."""
from __future__ import annotations

import os
from datetime import timedelta
from typing import Callable

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException, status

from core.db import C, get_db
from core.permissions import has_permission
from core.util import utcnow

JWT_ALG = "HS256"
TOKEN_TTL_HOURS = 12


def _secret() -> str:
    return os.environ.get("JWT_SECRET", "western-park-dev-secret-change-me")


def hash_password(raw: str) -> str:
    return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(raw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(raw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:  # noqa: BLE001
        return False


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": int(utcnow().timestamp()),
        "exp": int((utcnow() + timedelta(hours=TOKEN_TTL_HOURS)).timestamp()),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALG)


def decode_token(token: str) -> dict:
    return jwt.decode(token, _secret(), algorithms=[JWT_ALG])


async def current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired") from None
    except Exception:  # noqa: BLE001
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session") from None

    db = get_db()
    user = await db[C.users].find_one({"id": payload.get("sub"), "active": True}, {"_id": 0})
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not available")
    role = await db[C.roles].find_one({"id": user.get("role_id")}, {"_id": 0})
    user["role"] = role or {"name": "Unknown", "permissions": []}
    return user


def require(permission: str) -> Callable:
    async def _dep(user: dict = Depends(current_user)) -> dict:
        if not has_permission(user.get("role"), permission):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Your role ({user['role'].get('name')}) does not allow: {permission}",
            )
        return user

    return _dep


async def optional_user(authorization: str | None = Header(default=None)) -> dict | None:
    if not authorization:
        return None
    try:
        return await current_user(authorization)
    except HTTPException:
        return None


def pupil_scope_filter(user: dict) -> dict:
    """Restrict pupil queries to the pupils a user is allowed to see."""
    role = user.get("role") or {}
    scope = role.get("visibility_scope", "assigned_pupils")
    if has_permission(role, "*") or scope == "all_pupils":
        return {}
    if scope == "none":
        return {"id": {"$in": []}}
    return {"id": {"$in": user.get("pupil_ids") or []}}
