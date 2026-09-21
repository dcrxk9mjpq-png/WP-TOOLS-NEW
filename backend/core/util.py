"""Shared helpers: ids, time, Mongo document serialisation."""
from __future__ import annotations

import re
import uuid
from datetime import date, datetime, time, timezone
from typing import Any
from zoneinfo import ZoneInfo

# The provision is in Leicester. Everything a member of staff or a pupil sees -
# which day it is, which activity is happening now - must follow the clock on
# the classroom wall, not the server's UTC clock. Without this the whole
# timetable slips by an hour for seven months of the year.
SCHOOL_TZ = ZoneInfo("Europe/London")


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def utcnow_iso() -> str:
    return utcnow().isoformat()


def school_now() -> datetime:
    """The current date and time in the school's own timezone."""
    return datetime.now(SCHOOL_TZ)


def today_iso() -> str:
    """Today's date as the classroom experiences it (Europe/London)."""
    return school_now().date().isoformat()


_TIME = re.compile(r"^\s*(\d{1,2})\s*[:.]?\s*(\d{2})\s*$")


def minutes_of_day(value: str | None) -> int | None:
    """Parse '09:15', '9:15', '0915' or '9.15' into minutes since midnight.

    Staff type times by hand, so be forgiving. Anything unparseable returns
    ``None`` and the activity is simply treated as untimed.
    """
    if not value:
        return None
    match = _TIME.match(str(value))
    if not match:
        return None
    hours, minutes = int(match.group(1)), int(match.group(2))
    if not (0 <= hours <= 23 and 0 <= minutes <= 59):
        return None
    return hours * 60 + minutes


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
