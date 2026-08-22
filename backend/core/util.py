"""Shared helpers: ids, time, Mongo document serialisation."""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timezone
from typing import Any


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def utcnow_iso() -> str:
    return utcnow().isoformat()


def today_iso() -> str:
    return date.today().isoformat()


def jsonable(value: Any) -> Any:
    """Recursively convert Mongo/py values into JSON-safe values.

    Prevents the classic "datetime is not JSON serializable" failure and strips
    Mongo's internal ``_id``.
    """
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, dict):
        return {k: jsonable(v) for k, v in value.items() if k != "_id"}
    if isinstance(value, (list, tuple, set)):
        return [jsonable(v) for v in value]
    # ObjectId / anything else
    return str(value)


def serialize_doc(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    return jsonable(doc)


def serialize_docs(docs: list[dict]) -> list[dict]:
    return [jsonable(d) for d in docs]
