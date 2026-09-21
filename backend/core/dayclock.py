"""Working out what is happening now.

The Now / Next / Later board is the single most important thing on the screen:
a pupil looks at it to know what is happening to them. So it has to be right
without anybody having to remember to press a button.

Two sources of truth, in this order of authority:

1. **A member of staff.** If someone has tapped an activity to start it, or
   marked one finished or skipped, that decision always wins. Real classrooms
   over-run and change plans; the software must never argue with the adult in
   the room.
2. **The clock on the classroom wall** (Europe/London, via
   :data:`core.util.SCHOOL_TZ`). If nobody has started anything yet today, the
   activity whose time window contains the current time is what is happening
   now, and the next activity due to start is Next.

If the day being looked at is not today, the clock is ignored entirely and only
staff decisions are shown - a teacher planning Thursday on Tuesday afternoon
should not see Thursday's mid-morning activity lit up as "happening now".
"""
from __future__ import annotations

from core.util import minutes_of_day, school_now, today_iso

CLOSED = {"done", "skipped"}


def _windows(items: list[dict]) -> list[dict]:
    """Attach parsed start/end minutes, inferring a missing end from the next start."""
    parsed = []
    for index, item in enumerate(items):
        parsed.append(
            {
                "index": index,
                "item": item,
                "start": minutes_of_day(item.get("start")),
                "end": minutes_of_day(item.get("end")),
            }
        )
    # An activity with a start but no end runs until the next timed activity
    # begins, which is how staff actually fill the timetable in.
    for index, row in enumerate(parsed):
        if row["start"] is not None and row["end"] is None:
            following = next(
                (r["start"] for r in parsed[index + 1 :] if r["start"] is not None), None
            )
            row["end"] = following if following is not None else row["start"] + 60
        if row["start"] is not None and row["end"] is not None and row["end"] <= row["start"]:
            # crosses midnight or was typed the wrong way round; treat as 30 min
            row["end"] = row["start"] + 30
    return parsed


def derive(items: list[dict], date_iso: str, now_minutes: int | None = None) -> dict:
    """Return ``{now, next, later, now_source, items}``.

    ``items`` are returned as copies carrying a ``clock_status`` of
    ``past`` / ``now`` / ``upcoming`` / ``untimed`` so staff screens can show
    quietly that an activity's slot has already gone by.
    """
    items = list(items or [])
    is_today = date_iso == today_iso()
    if now_minutes is None:
        stamp = school_now()
        now_minutes = stamp.hour * 60 + stamp.minute

    rows = _windows(items)

    # 1. what a member of staff has decided
    manual_index = next(
        (i for i, r in enumerate(rows) if r["item"].get("status") == "current"), None
    )

    # 2. what the clock says, used only for today and only when nobody has
    #    started an activity themselves
    clock_index = None
    if is_today:
        for i, row in enumerate(rows):
            if row["item"].get("status") in CLOSED:
                continue
            if row["start"] is None or row["end"] is None:
                continue
            if row["start"] <= now_minutes < row["end"]:
                clock_index = i
                break

    if manual_index is not None:
        now_index, source = manual_index, "staff"
    elif clock_index is not None:
        now_index, source = clock_index, "clock"
    else:
        now_index, source = None, "none"

    def open_row(row: dict) -> bool:
        return row["item"].get("status") not in CLOSED

    if now_index is not None:
        upcoming = [r for r in rows[now_index + 1 :] if open_row(r)]
    elif is_today:
        # Nothing is running. Next is the next thing due to start; untimed
        # activities queue up behind whatever is timed.
        upcoming = [
            r
            for r in rows
            if open_row(r) and (r["start"] is None or r["start"] >= now_minutes)
        ]
    else:
        upcoming = [r for r in rows if open_row(r)]

    decorated = []
    for i, row in enumerate(rows):
        item = dict(row["item"])
        if row["start"] is None or row["end"] is None:
            item["clock_status"] = "untimed"
        elif not is_today:
            item["clock_status"] = "untimed"
        elif i == now_index or (row["start"] <= now_minutes < row["end"]):
            item["clock_status"] = "now"
        elif row["end"] <= now_minutes:
            item["clock_status"] = "past"
        else:
            item["clock_status"] = "upcoming"
        decorated.append(item)

    now_item = decorated[now_index] if now_index is not None else None
    upcoming_items = [decorated[r["index"]] for r in upcoming]

    return {
        "items": decorated,
        "now": now_item,
        "next": upcoming_items[0] if upcoming_items else None,
        "later": upcoming_items[1:],
        "now_source": source,
        "progress": {
            "done": len([i for i in decorated if i.get("status") == "done"]),
            "total": len(decorated),
        },
    }
