"""
PHASE 1 CORE POC - Western Park Classroom Platform
==================================================

Proves the hardest part of this build BEFORE the app is built around it:

  A. Canonical Symbol System
     - the school's own Widgit symbols are extracted from their Morning Meeting
       ("Crew Time") PowerPoint into individual, named, normalised symbols
     - ARASAAC (open licence) fills concepts the deck does not cover
     - one concept -> exactly one symbol, served from one place
     - replacing a symbol once changes it everywhere, and can be reset
  B. Authentication + configurable role permissions
  C. The four separated data layers
     - CLASSROOM CONFIGURATION (templates) is not changed by editing a day
     - DAILY CLASSROOM CONTENT can be changed freely, per date
     - INDIVIDUAL PUPIL CONFIGURATION does not change the class day
  D. Timetable mechanics: now / next / later, advance, duplicate, reorder

Run:  python /app/test_core.py
"""
from __future__ import annotations

import io
import json
import sys
import urllib.request
from datetime import date, timedelta

import requests

BASE = "http://localhost:8001/api"
RESULTS: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    RESULTS.append((name, bool(ok), detail))
    print(("  PASS  " if ok else "  FAIL  ") + name + (f"   [{detail}]" if detail else ""))
    return bool(ok)


def hdr(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def section(title: str) -> None:
    print("\n" + "=" * 78)
    print(title)
    print("=" * 78)


# --------------------------------------------------------------------------- #
def test_health() -> int:
    section("0. Service health")
    r = requests.get(f"{BASE}/health", timeout=20)
    check("API responds", r.status_code == 200, r.text[:120])
    return r.json().get("symbols", 0)


# --------------------------------------------------------------------------- #
def test_symbol_library() -> None:
    section("A1. Canonical symbol library extracted from the school's own deck")
    r = requests.get(f"{BASE}/symbols", timeout=30)
    check("symbol library listable", r.status_code == 200)
    symbols = r.json()
    check("library has 150+ canonical symbols", len(symbols) >= 150, f"{len(symbols)} symbols")

    by_key = {s["concept_key"]: s for s in symbols}
    widgit = [s for s in symbols if s.get("source") == "widgit-deck"]
    arasaac = [s for s in symbols if s.get("source") == "arasaac"]
    check("Widgit symbols extracted from the Morning Meeting deck", len(widgit) >= 60, f"{len(widgit)}")
    check("ARASAAC gap-fill symbols present", len(arasaac) >= 60, f"{len(arasaac)}")

    # the classroom routine from the supplied deck must be fully represented
    routine = [
        "routine.greeting_check_in",
        "routine.expectations",
        "routine.calendar",
        "routine.weather",
        "routine.timetable",
        "routine.movement",
        "routine.calming",
    ]
    missing = [k for k in routine if k not in by_key]
    check("Crew Time routine concepts all have a symbol", not missing, str(missing))

    for k in routine:
        if k in by_key:
            check(f"  '{k}' comes from the school's Widgit deck",
                  by_key[k]["source"] == "widgit-deck", by_key[k].get("source", ""))

    core_concepts = [
        "sequence.now", "sequence.next", "sequence.finished", "system.later",
        "comm.help", "comm.communication", "routine.movement", "routine.calming",
        "comm.i_feel", "comm.home", "learning.learning", "regulation.zones",
        "expectations.be_kind", "expectations.work_hard", "expectations.be_responsible",
        "day.monday", "month.january", "weather.sunny", "calendar.date",
    ]
    absent = [k for k in core_concepts if k not in by_key]
    check("every spec-named recurring concept has a canonical symbol", not absent, str(absent))

    # attributions recorded (licensing)
    r = requests.get(f"{BASE}/symbols/attributions", timeout=20)
    atts = r.json()
    check("licence attribution recorded per source", len(atts) >= 2, json.dumps(atts)[:160])

    groups = requests.get(f"{BASE}/symbols/groups", timeout=20).json()
    check("symbols organised into groups for the library UI", len(groups) >= 8, str(groups))


def test_symbol_serving_and_consistency() -> None:
    section("A2. One concept -> one symbol, everywhere (the Consistency Rule)")
    key = "routine.timetable"
    a = requests.get(f"{BASE}/symbols/{key}/image", timeout=20)
    check("symbol image served", a.status_code == 200 and a.headers.get("content-type", "").startswith("image/"),
          f"{a.status_code} {a.headers.get('content-type')} {len(a.content)}b")

    # simulate three different screens asking for the same concept
    calls = [requests.get(f"{BASE}/symbols/{key}/image", timeout=20) for _ in range(3)]
    etags = {c.headers.get("ETag") for c in calls}
    check("three different screens receive byte-identical artwork", len(etags) == 1, str(etags))

    r = requests.get(f"{BASE}/symbols/does.not.exist/image", timeout=20)
    check("unknown concept fails loudly instead of substituting artwork", r.status_code == 404)


def test_global_replace(admin: str) -> None:
    section("A3. Replacing a symbol once changes it everywhere")
    key = "comm.help"
    before = requests.get(f"{BASE}/symbols/{key}/image", timeout=20)
    before_etag = before.headers.get("ETag")

    # build a small distinct PNG in-memory
    from PIL import Image, ImageDraw

    im = Image.new("RGB", (400, 400), (255, 244, 214))
    d = ImageDraw.Draw(im)
    d.ellipse([60, 60, 340, 340], fill=(13, 115, 119))
    buf = io.BytesIO()
    im.save(buf, format="PNG")

    r = requests.post(
        f"{BASE}/symbols/{key}/replace",
        headers=hdr(admin),
        files={"file": ("replacement.png", buf.getvalue(), "image/png")},
        timeout=30,
    )
    check("administrator can replace a symbol", r.status_code == 200, r.text[:160])

    after = requests.get(f"{BASE}/symbols/{key}/image", timeout=20)
    check("the replacement is served to every screen", after.headers.get("ETag") != before_etag,
          f"{before_etag} -> {after.headers.get('ETag')}")

    r = requests.post(f"{BASE}/symbols/{key}/reset", headers=hdr(admin), timeout=20)
    check("symbol can be reset to the bundled default", r.status_code == 200, r.text[:120])
    restored = requests.get(f"{BASE}/symbols/{key}/image", timeout=20)
    check("default artwork restored byte-identically", restored.headers.get("ETag") == before_etag,
          f"{restored.headers.get('ETag')}")

    # assign one concept's artwork from another approved symbol
    r = requests.post(
        f"{BASE}/symbols/comm.snack/assign",
        headers=hdr(admin),
        json={"from_concept": "comm.drink"},
        timeout=20,
    )
    check("a concept can be pointed at another approved symbol", r.status_code == 200, r.text[:120])
    s1 = requests.get(f"{BASE}/symbols/comm.snack/image", timeout=20).headers.get("ETag")
    s2 = requests.get(f"{BASE}/symbols/comm.drink/image", timeout=20).headers.get("ETag")
    check("re-assignment takes effect immediately", s1 == s2, f"{s1} / {s2}")
    requests.post(f"{BASE}/symbols/comm.snack/reset", headers=hdr(admin), timeout=20)


def test_arasaac_live() -> None:
    section("A4. ARASAAC gap-fill source availability (graceful when offline)")
    try:
        with urllib.request.urlopen(
            "https://api.arasaac.org/v1/pictograms/en/search/help", timeout=20
        ) as resp:
            data = json.loads(resp.read())
        check("ARASAAC search API reachable for future gap-fill", isinstance(data, list) and len(data) > 0,
              f"{len(data)} results")
    except Exception as exc:  # noqa: BLE001
        check("ARASAAC offline is survivable (bundled assets already local)", True, f"offline: {exc}")
    r = requests.get(f"{BASE}/symbols/comm.help/image", timeout=20)
    check("gap-filled symbols work with no network at request time", r.status_code == 200)


# --------------------------------------------------------------------------- #
def login(email: str, password: str = "westernpark") -> str | None:
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=20)
    if r.status_code != 200:
        return None
    return r.json()["token"]


def test_auth_and_roles() -> dict:
    section("B. Authentication and configurable role permissions")
    r = requests.get(f"{BASE}/timetable/day", timeout=20)
    check("unauthenticated access is refused", r.status_code == 401, str(r.status_code))

    r = requests.post(f"{BASE}/auth/login", json={"email": "admin@westernpark.school", "password": "wrong"}, timeout=20)
    check("wrong password refused", r.status_code == 401)

    tokens: dict[str, str] = {}
    for label, email in [
        ("admin", "admin@westernpark.school"),
        ("teacher", "teacher@westernpark.school"),
        ("ta", "ta@westernpark.school"),
        ("leader", "leader@westernpark.school"),
        ("mainstream", "mainstream@westernpark.school"),
        ("display", "display@westernpark.school"),
    ]:
        t = login(email)
        check(f"{label} can sign in", bool(t), email)
        if t:
            tokens[label] = t

    me = requests.get(f"{BASE}/auth/me", headers=hdr(tokens["admin"]), timeout=20).json()
    check("signed-in user carries its role + permissions", me.get("role", {}).get("name") == "Classroom Administrator",
          str(me.get("role", {}).get("name")))

    roles = requests.get(f"{BASE}/auth/roles", headers=hdr(tokens["admin"]), timeout=20).json()
    check("roles are data, not code (editable in Settings)", len(roles) >= 6, f"{len(roles)} roles")

    r = requests.get(f"{BASE}/auth/users", headers=hdr(tokens["ta"]), timeout=20)
    check("teaching assistant cannot manage staff accounts", r.status_code == 403, str(r.status_code))

    r = requests.post(
        f"{BASE}/timetable/activities",
        headers=hdr(tokens["leader"]),
        json={"title": "Should not be created"},
        timeout=20,
    )
    check("read-only senior leader cannot edit classroom configuration", r.status_code == 403, str(r.status_code))

    r = requests.get(f"{BASE}/timetable/day", headers=hdr(tokens["display"]), timeout=20)
    check("pupil-facing mode can see the day", r.status_code == 200, str(r.status_code))
    r = requests.post(
        f"{BASE}/timetable/day/items", headers=hdr(tokens["display"]),
        json={"title": "Pupil should not add this"}, timeout=20,
    )
    check("pupil-facing mode cannot edit the classroom day", r.status_code == 403, str(r.status_code))

    r = requests.get(f"{BASE}/symbols", headers=hdr(tokens["mainstream"]), timeout=20)
    check("mainstream staff can still see symbols (no pupil data)", r.status_code == 200)

    # a new role can be composed from permissions with no code change
    r = requests.post(
        f"{BASE}/auth/roles",
        headers=hdr(tokens["admin"]),
        json={
            "name": "POC Lunchtime Supervisor",
            "description": "created by the POC",
            "permissions": ["timetable.view", "comm.view"],
            "visibility_scope": "none",
        },
        timeout=20,
    )
    check("administrator can create a brand new role", r.status_code == 200, r.text[:140])
    if r.status_code == 200:
        rid = r.json()["id"]
        requests.delete(f"{BASE}/auth/roles/{rid}", headers=hdr(tokens["admin"]), timeout=20)
    return tokens


# --------------------------------------------------------------------------- #
def test_four_layers(tokens: dict) -> None:
    section("C. Four separated layers - configuration vs today vs pupil")
    admin = tokens["admin"]

    templates = requests.get(f"{BASE}/timetable/templates", headers=hdr(admin), timeout=20).json()
    check("CLASSROOM CONFIGURATION: timetable templates exist", len(templates) >= 3, f"{len(templates)}")
    standard = next((t for t in templates if t["name"] == "Standard day"), templates[0])
    tpl_titles_before = [i["title"] for i in standard["items"]]

    today = date.today().isoformat()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    # load the template into TODAY
    r = requests.post(
        f"{BASE}/timetable/day/load-template",
        headers=hdr(admin),
        json={"template_id": standard["id"], "date": today, "replace": True},
        timeout=20,
    )
    check("DAILY CONTENT: a template can be loaded into today", r.status_code == 200, r.text[:140])
    day = r.json()
    check("today's timetable now mirrors the template",
          [i["title"] for i in day["items"]] == tpl_titles_before)

    # edit TODAY only
    first_item = day["items"][0]
    r = requests.patch(
        f"{BASE}/timetable/day/items/{first_item['id']}?date={today}",
        headers=hdr(admin),
        json={"title": "CREW Time (changed today only)", "note": "Visitor joining us"},
        timeout=20,
    )
    check("today's activity can be renamed at 08:30", r.status_code == 200, r.text[:140])

    tpl_after = requests.get(f"{BASE}/timetable/templates", headers=hdr(admin), timeout=20).json()
    standard_after = next(t for t in tpl_after if t["id"] == standard["id"])
    check("editing today did NOT change the template",
          [i["title"] for i in standard_after["items"]] == tpl_titles_before)

    # a different date is completely independent
    r = requests.post(
        f"{BASE}/timetable/day/load-template",
        headers=hdr(admin),
        json={"template_id": next(t["id"] for t in tpl_after if t["name"] == "PE day"), "date": tomorrow},
        timeout=20,
    )
    check("tomorrow can have a completely different timetable", r.status_code == 200)
    tmr = requests.get(f"{BASE}/timetable/day?date={tomorrow}", headers=hdr(admin), timeout=20).json()
    tdy = requests.get(f"{BASE}/timetable/day?date={today}", headers=hdr(admin), timeout=20).json()
    check("today and tomorrow are independent documents",
          [i["title"] for i in tmr["items"]] != [i["title"] for i in tdy["items"]])

    # save today's edited shape back as a NEW template (never overwrites)
    r = requests.post(
        f"{BASE}/timetable/day/save-as-template",
        headers=hdr(admin),
        json={"name": "POC special event day", "description": "saved from today", "date": today},
        timeout=20,
    )
    check("today's shape can be saved as a new template", r.status_code == 200, r.text[:140])
    if r.status_code == 200:
        requests.delete(f"{BASE}/timetable/templates/{r.json()['id']}", headers=hdr(admin), timeout=20)

    # ------- individual pupil configuration ------- #
    pupils = requests.get(f"{BASE}/symbols", timeout=20)  # placeholder call keeps ordering readable
    from pymongo import MongoClient
    import os
    from dotenv import load_dotenv

    load_dotenv("/app/backend/.env")
    mc = MongoClient(os.environ["MONGO_URL"])
    pupil = mc[os.environ["DB_NAME"]]["pupils"].find_one({"is_sample": True})
    check("sample pupils exist for the prototype", bool(pupil), str(pupil and pupil.get("display_name")))
    pupil_id = pupil["id"]

    maths_item = next((i for i in tdy["items"] if i["title"] == "Maths"), tdy["items"][2])
    r = requests.post(
        f"{BASE}/timetable/adaptations",
        headers=hdr(admin),
        json={
            "pupil_id": pupil_id,
            "date": today,
            "parent_item_id": maths_item["id"],
            "parent_title": maths_item["title"],
            "steps": [
                {"title": "Visual instruction", "symbol_concept": "system.symbol"},
                {"title": "Reduced task", "symbol_concept": "learning.maths"},
                {"title": "Movement break", "symbol_concept": "routine.movement"},
                {"title": "Return to task", "symbol_concept": "learning.maths"},
            ],
        },
        timeout=20,
    )
    check("INDIVIDUAL PUPIL CONFIG: a support sequence can be added inside Maths",
          r.status_code == 200, r.text[:160])

    tdy2 = requests.get(f"{BASE}/timetable/day?date={today}", headers=hdr(admin), timeout=20).json()
    check("the whole-class timetable was NOT changed by the pupil adaptation",
          [i["title"] for i in tdy2["items"]] == [i["title"] for i in tdy["items"]])

    # per-pupil visibility
    requests.put(
        f"{BASE}/timetable/pupil-view/{pupil_id}",
        headers=hdr(admin),
        json={"pupil_id": pupil_id, "timetable_visibility": "now_next", "show_times": False},
        timeout=20,
    )
    pv = requests.get(f"{BASE}/timetable/pupil-day/{pupil_id}?date={today}", headers=hdr(admin), timeout=20).json()
    check("teacher controls how much timetable a pupil sees (now + next only)",
          len(pv["items"]) <= 2, f"{len(pv['items'])} items")

    requests.put(
        f"{BASE}/timetable/pupil-view/{pupil_id}",
        headers=hdr(admin),
        json={"pupil_id": pupil_id, "timetable_visibility": "full", "show_times": True},
        timeout=20,
    )
    pv_full = requests.get(f"{BASE}/timetable/pupil-day/{pupil_id}?date={today}", headers=hdr(admin), timeout=20).json()
    check("the same pupil can be switched to the full day", len(pv_full["items"]) > 2, f"{len(pv_full['items'])}")
    adapted = [i for i in pv_full["items"] if i.get("adaptation")]
    check("the pupil's own support steps appear inside their day", len(adapted) == 1,
          str([i["title"] for i in adapted]))
    mc.close()


def test_timetable_mechanics(tokens: dict) -> None:
    section("D. Timetable mechanics: now / next / later, advance, duplicate, reorder")
    admin = tokens["admin"]
    today = date.today().isoformat()

    requests.post(f"{BASE}/timetable/day/reset", headers=hdr(admin), json={"date": today}, timeout=20)
    day = requests.get(f"{BASE}/timetable/day?date={today}", headers=hdr(admin), timeout=20).json()
    items = day["items"]
    check("day has items to run", len(items) >= 5, f"{len(items)}")

    r = requests.post(
        f"{BASE}/timetable/day/items/{items[0]['id']}/status?date={today}",
        headers=hdr(admin), json={"status": "current"}, timeout=20,
    )
    day = r.json()
    check("an activity can be marked NOW", day["now"] and day["now"]["title"] == items[0]["title"],
          str(day["now"] and day["now"]["title"]))
    check("NEXT is derived automatically", day["next"] and day["next"]["title"] == items[1]["title"],
          str(day["next"] and day["next"]["title"]))
    check("LATER is derived automatically", len(day["later"]) >= 1, f"{len(day['later'])}")

    day = requests.post(f"{BASE}/timetable/day/advance?date={today}", headers=hdr(admin), timeout=20).json()
    check("advancing marks the current activity finished and moves on",
          day["now"] and day["now"]["title"] == items[1]["title"], str(day["now"] and day["now"]["title"]))
    check("progress is tracked", day["progress"]["done"] == 1, json.dumps(day["progress"]))

    r = requests.post(
        f"{BASE}/timetable/day/items?date={today}",
        headers=hdr(admin),
        json={"title": "POC extra movement break", "symbol_concept": "routine.movement", "position": 2},
        timeout=20,
    )
    day = r.json()
    check("an activity can be inserted mid-day", day["items"][2]["title"] == "POC extra movement break",
          day["items"][2]["title"])
    inserted = day["items"][2]["id"]

    day = requests.post(
        f"{BASE}/timetable/day/items/{inserted}/duplicate?date={today}", headers=hdr(admin), timeout=20
    ).json()
    check("an activity can be duplicated", day["items"][3]["title"] == "POC extra movement break")
    dup = day["items"][3]["id"]

    order = [i["id"] for i in day["items"]]
    order[0], order[1] = order[1], order[0]
    day = requests.post(
        f"{BASE}/timetable/day/reorder?date={today}", headers=hdr(admin), json={"item_ids": order}, timeout=20
    ).json()
    check("activities can be reordered", [i["id"] for i in day["items"]][:2] == order[:2])

    for iid in (inserted, dup):
        requests.delete(f"{BASE}/timetable/day/items/{iid}?date={today}", headers=hdr(admin), timeout=20)
    day = requests.get(f"{BASE}/timetable/day?date={today}", headers=hdr(admin), timeout=20).json()
    check("activities can be deleted", all(i["title"] != "POC extra movement break" for i in day["items"]))


# --------------------------------------------------------------------------- #
def main() -> int:
    print("\nWESTERN PARK CLASSROOM PLATFORM - PHASE 1 CORE POC")
    test_health()
    test_symbol_library()
    test_symbol_serving_and_consistency()
    tokens = test_auth_and_roles()
    test_global_replace(tokens["admin"])
    test_arasaac_live()
    test_four_layers(tokens)
    test_timetable_mechanics(tokens)

    section("SUMMARY")
    passed = sum(1 for _, ok, _ in RESULTS if ok)
    failed = [r for r in RESULTS if not r[1]]
    print(f"{passed}/{len(RESULTS)} checks passed")
    if failed:
        print("\nFAILURES:")
        for name, _, detail in failed:
            print(f"  - {name}  [{detail}]")
        return 1
    print("\nCORE PROVEN: canonical symbols, auth/roles and the four data layers all work.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
