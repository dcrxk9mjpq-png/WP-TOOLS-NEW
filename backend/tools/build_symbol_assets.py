"""
Build the canonical symbol asset bundle for the Western Park Classroom Platform.

Sources
-------
1. WIDGIT (primary / house style): the school's own Morning Meeting ("Crew Time")
   PowerPoint. Individual symbol cards are cropped out of the deck's media.
2. ARASAAC (gap fill, CC BY-NC-SA): downloaded once for concepts the deck does
   not cover. Attribution is recorded on every symbol record.

Output
------
/app/backend/assets/symbols/<concept_key>.png
/app/backend/assets/symbols/manifest.json

Run:  python /app/backend/tools/build_symbol_assets.py [--verify]
"""
from __future__ import annotations

import io
import json
import os
import re
import shutil
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "symbols"
WORK = Path("/tmp/wp_symbol_build")
PPTX_URL = (
    "https://customer-assets-wrfwihn1.emergentagent.net/job_spark-classroom-1/"
    "artifacts/umeoh4md_Morning%20Meeting%20AG.pptx"
)
PPTX_LOCAL = ROOT / "assets" / "source" / "morning_meeting.pptx"

ARASAAC_SEARCH = "https://api.arasaac.org/v1/pictograms/en/search/{term}"
ARASAAC_IMG = "https://static.arasaac.org/pictograms/{pid}/{pid}_500.png"


# --------------------------------------------------------------------------- #
# image helpers
# --------------------------------------------------------------------------- #
def flatten(path_or_im):
    im = Image.open(path_or_im) if not isinstance(path_or_im, Image.Image) else path_or_im
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(bg, im)
    return im.convert("RGB")


def _blank(im, axis, thresh=246, tol=2):
    g = im.convert("L")
    w, h = g.size
    px = g.load()
    n = h if axis == "y" else w
    out = []
    for i in range(n):
        ink = 0
        rng = range(0, w, 2) if axis == "y" else range(0, h, 2)
        for j in rng:
            v = px[j, i] if axis == "y" else px[i, j]
            if v < thresh:
                ink += 1
                if ink > tol:
                    break
        out.append(ink <= tol)
    return out


def _spans(blank, min_gap=6):
    n = len(blank)
    res, start, i = [], None, 0
    while i < n:
        if not blank[i]:
            if start is None:
                start = i
            i += 1
        else:
            j = i
            while j < n and blank[j]:
                j += 1
            if start is not None and (j - i >= min_gap or j == n):
                res.append((start, i))
                start = None
            i = j
    if start is not None:
        res.append((start, n))
    return res


def grid_split(im, min_gap=6):
    out = []
    for (y0, y1) in _spans(_blank(im, "y"), min_gap):
        row = im.crop((0, y0, im.width, y1))
        for (x0, x1) in _spans(_blank(row, "x"), min_gap):
            out.append(row.crop((x0, 0, x1, row.height)))
    return out


def table_split(im, min_ratio=0.9):
    g = im.convert("L")
    w, h = g.size
    px = g.load()
    rows = [
        y
        for y in range(h)
        if sum(1 for x in range(0, w, 2) if px[x, y] < 128) / max(1, w / 2) > min_ratio
    ]
    groups = []
    for y in rows:
        if groups and y - groups[-1][-1] <= 2:
            groups[-1].append(y)
        else:
            groups.append([y])
    b = [gp[len(gp) // 2] for gp in groups]
    return [im.crop((0, a + 2, w, c - 2)) for a, c in zip(b, b[1:]) if c - a > 20]


def trim(im, thresh=248):
    g = im.convert("L")
    diff = ImageChops.difference(g, Image.new("L", g.size, 255))
    bbox = diff.point(lambda p: 255 if p > (255 - thresh) else 0).getbbox()
    return im.crop(bbox) if bbox else im


def pad_square(im, size=400, margin=14, bg=(255, 255, 255)):
    """Normalise every symbol to an identical square canvas (visual consistency).

    Small crops (e.g. the icon column of a Widgit strip) are scaled UP so they
    fill the canvas properly - otherwise they render as a tiny mark in a big box.
    Upscaling is capped at 4x to keep line art crisp enough at display sizes.
    """
    im = trim(im)
    inner = size - margin * 2
    longest = max(im.width, im.height)
    target = min(inner, max(longest, 1) * 4)
    scale = target / max(longest, 1)
    new_size = (max(1, int(im.width * scale)), max(1, int(im.height * scale)))
    im = im.resize(new_size, Image.LANCZOS)
    canvas = Image.new("RGB", (size, size), bg)
    canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2))
    return canvas


# --------------------------------------------------------------------------- #
# deck extraction
# --------------------------------------------------------------------------- #
def ensure_pptx() -> Path:
    PPTX_LOCAL.parent.mkdir(parents=True, exist_ok=True)
    if PPTX_LOCAL.exists() and PPTX_LOCAL.stat().st_size > 100_000:
        return PPTX_LOCAL
    print("downloading Morning Meeting deck ...")
    with urllib.request.urlopen(PPTX_URL, timeout=90) as r:
        PPTX_LOCAL.write_bytes(r.read())
    return PPTX_LOCAL


def extract_media(pptx: Path) -> dict[str, Image.Image]:
    WORK.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(pptx) as z:
        names = [n for n in z.namelist() if n.startswith("ppt/media/")]
        out = {}
        for n in names:
            base = os.path.splitext(os.path.basename(n))[0]
            out[base] = flatten(io.BytesIO(z.read(n)))
    return out


TABLE_SOURCES = {"image8"}


def split_source(base: str, im: Image.Image) -> list[Image.Image]:
    if base in TABLE_SOURCES:
        pieces = [trim(p) for p in table_split(im)]
    else:
        g = grid_split(im)
        pieces = [trim(p) for p in g] if len(g) > 1 else [trim(im)]
    pieces = [p for p in pieces if p.width > 24 and p.height > 24]
    return pieces or [im]


def icon_only(strip: Image.Image) -> Image.Image:
    """image8 rows are 'border | icon | label | border' strips - keep just the icon."""
    cols = _spans(_blank(strip, "x"), min_gap=8)
    # discard thin table-border columns
    real = [(a, b) for (a, b) in cols if (b - a) > max(12, strip.height * 0.18)]
    if real:
        x0, x1 = real[0]
        return trim(strip.crop((max(0, x0 - 2), 0, min(strip.width, x1 + 2), strip.height)))
    return trim(strip)


# --------------------------------------------------------------------------- #
# canonical concept registry — WIDGIT (from the school's own deck)
# --------------------------------------------------------------------------- #
# (concept_key, label, group, source_id, icon_only)
WIDGIT_MAP: list[tuple[str, str, str, str, bool]] = [
    # routine / structure
    ("routine.greeting_check_in", "Greeting and Check In", "Routine", "image8#0", True),
    ("routine.expectations", "Expectations", "Routine", "image8#1", True),
    ("routine.calendar", "Calendar", "Routine", "image8#2", True),
    ("routine.weather", "Weather", "Routine", "image8#3", True),
    ("routine.timetable", "Timetable", "Routine", "image8#4", True),
    ("routine.movement", "Movement", "Routine", "image8#5", True),
    ("routine.calming", "Calming", "Routine", "image8#6", True),
    # sequencing
    ("sequence.now", "Now", "Sequence", "image3#0", False),
    ("sequence.next", "Next", "Sequence", "image3#1", False),
    ("sequence.finished", "Finished", "Sequence", "image1#0", False),
    # activities present in the deck
    ("activity.crew_time", "CREW Time", "Activity", "image3#2", False),
    ("activity.phonics", "Phonics", "Activity", "image3#3", False),
    # regulation
    ("regulation.zones", "Zones of Regulation", "Regulation", "image4#4", False),
    ("regulation.people_annoy_me", "Sometimes people in the class annoy me", "Regulation", "image5#3", False),
    ("regulation.cannot_control_others", "I cannot control what other people do", "Regulation", "image5#4", False),
    ("regulation.can_control_myself", "I can control what I do", "Regulation", "image5#5", False),
    ("regulation.need_space", "I can say \u201cI need space please\u201d", "Regulation", "image5#6", False),
    ("regulation.focus_on_myself", "I can focus on myself and let the teachers handle it", "Regulation", "image5#7", False),
    ("regulation.move_away_breathe", "I can move away and take deep breaths", "Regulation", "image5#8", False),
    # expectations
    ("expectations.be_kind", "Be Kind", "Expectations", "image13#1", False),
    ("expectations.work_hard", "Work Hard", "Expectations", "image13#2", False),
    ("expectations.be_responsible", "Be Responsible", "Expectations", "image13#3", False),
    ("expectations.say_kind_words", "Say kind words", "Expectations", "image7#1", False),
    ("expectations.focus_on_yourself", "Focus on yourself", "Expectations", "image7#2", False),
    ("expectations.inside_voice", "Use an inside voice", "Expectations", "image7#3", False),
    ("expectations.complete_tasks", "Complete the tasks", "Expectations", "image6#1", False),
    ("expectations.listen_to_teachers", "Listen to the teachers", "Expectations", "image6#2", False),
    ("expectations.try_your_best", "Try your best", "Expectations", "image6#3", False),
    ("expectations.stay_in_seat", "Stay in your seat", "Expectations", "image11#1", False),
    ("expectations.walk_inside", "Walk inside", "Expectations", "image11#2", False),
    ("expectations.raise_your_hand", "Raise your hand", "Expectations", "image11#3", False),
    # days
    ("day.monday", "Monday", "Calendar", "image19#0", False),
    ("day.tuesday", "Tuesday", "Calendar", "image22#0", False),
    ("day.wednesday", "Wednesday", "Calendar", "image12#0", False),
    ("day.thursday", "Thursday", "Calendar", "image16#0", False),
    ("day.friday", "Friday", "Calendar", "image14#0", False),
    ("day.saturday", "Saturday", "Calendar", "image20#3", False),
    ("day.sunday", "Sunday", "Calendar", "image20#4", False),
    # months
    ("month.january", "January", "Calendar", "image23#0", False),
    ("month.february", "February", "Calendar", "image28#0", False),
    ("month.march", "March", "Calendar", "image21#0", False),
    ("month.april", "April", "Calendar", "image35#0", False),
    ("month.may", "May", "Calendar", "image33#0", False),
    ("month.june", "June", "Calendar", "image27#0", False),
    ("month.july", "July", "Calendar", "image30#0", False),
    ("month.august", "August", "Calendar", "image31#0", False),
    ("month.september", "September", "Calendar", "image26#0", False),
    ("month.october", "October", "Calendar", "image34#0", False),
    ("month.november", "November", "Calendar", "image24#0", False),
    ("month.december", "December", "Calendar", "image25#0", False),
    # calendar parts
    ("calendar.day", "Day", "Calendar", "image29#0", False),
    ("calendar.date", "Date", "Calendar", "image29#1", False),
    ("calendar.month", "Month", "Calendar", "image29#2", False),
    ("calendar.year", "Year", "Calendar", "image29#3", False),
    ("calendar.today", "Today", "Calendar", "image18#0", False),
    # weather
    ("weather.prompt", "How\u2019s the weather today?", "Weather", "image40#5", False),
    ("weather.sunny", "Sunny", "Weather", "image40#0", False),
    ("weather.cloudy", "Cloudy", "Weather", "image40#1", False),
    ("weather.rainy", "Rainy", "Weather", "image40#2", False),
    ("weather.snowy", "Snowy", "Weather", "image40#3", False),
    ("weather.clear", "Clear", "Weather", "image40#4", False),
    ("weather.hot", "Hot", "Weather", "image40#6", False),
    ("weather.warm", "Warm", "Weather", "image40#7", False),
    ("weather.chilly", "Chilly", "Weather", "image40#8", False),
    ("weather.cold", "Cold", "Weather", "image40#9", False),
    ("weather.freezing", "Freezing", "Weather", "image40#10", False),
    # signing / resources used in the routine
    ("sign.good_morning", "Good morning (sign)", "Greeting", "image44#0", False),
    ("resource.good_morning_song", "Good Morning song", "Resource", "image2#0", False),
    ("resource.brain_break", "Brain break video", "Resource", "image43#0", False),
    ("resource.calming_breaks", "Calming breaks", "Resource", "image45#0", False),
]

# --------------------------------------------------------------------------- #
# canonical concept registry — ARASAAC gap fill
# --------------------------------------------------------------------------- #
# (concept_key, label, group, arasaac search term)
ARASAAC_MAP: list[tuple[str, str, str, str]] = [
    # communication core
    ("comm.communication", "Communication", "Communication", "communicate"),
    ("comm.help", "Help", "Communication", "help"),
    ("comm.i_want", "I want", "Communication", "want"),
    ("comm.i_need", "I need", "Communication", "need"),
    ("comm.i_feel", "I feel", "Communication", "feel"),
    ("comm.i_think", "I think", "Communication", "think"),
    ("comm.i_can_say", "I can say", "Communication", "talk"),
    ("comm.yes", "Yes", "Communication", "yes"),
    ("comm.no", "No", "Communication", "no"),
    ("comm.more", "More", "Communication", "more"),
    ("comm.stop", "Stop", "Communication", "stop"),
    ("comm.wait", "Wait", "Communication", "wait"),
    ("comm.listen", "Listen", "Communication", "listen"),
    ("comm.question", "Question", "Communication", "question"),
    ("comm.choice", "Choice", "Communication", "choose"),
    ("comm.toilet", "Toilet", "Communication", "toilet"),
    ("comm.drink", "Drink", "Communication", "drink"),
    ("comm.snack", "Snack", "Communication", "snack"),
    ("comm.break", "Break", "Communication", "rest"),
    ("comm.home", "Home", "Communication", "home"),
    ("comm.hello", "Hello", "Greeting", "hello"),
    ("comm.goodbye", "Goodbye", "Greeting", "goodbye"),
    ("comm.my_name", "My name is", "Greeting", "name"),
    # feelings
    ("feeling.happy", "Happy", "Feelings", "happy"),
    ("feeling.sad", "Sad", "Feelings", "sad"),
    ("feeling.angry", "Angry", "Feelings", "angry"),
    ("feeling.worried", "Worried", "Feelings", "worried"),
    ("feeling.tired", "Tired", "Feelings", "tired"),
    ("feeling.excited", "Excited", "Feelings", "excited"),
    ("feeling.calm", "Calm", "Feelings", "calm"),
    ("feeling.scared", "Scared", "Feelings", "frightened"),
    ("feeling.poorly", "Poorly", "Feelings", "sick"),
    # regulation supports
    ("regulation.deep_breaths", "Deep breaths", "Regulation", "breathe"),
    ("regulation.quiet_space", "Quiet space", "Regulation", "silence"),
    ("regulation.headphones", "Ear defenders", "Regulation", "headphones"),
    ("regulation.fidget", "Fidget toy", "Regulation", "toy"),
    ("regulation.sensory", "Sensory", "Regulation", "touch"),
    ("regulation.water", "Water", "Regulation", "water"),
    ("regulation.walk", "Walk", "Regulation", "walk"),
    ("regulation.adult_help", "Ask an adult", "Regulation", "teacher"),
    ("regulation.count", "Count to ten", "Regulation", "count"),
    ("regulation.squeeze", "Squeeze", "Regulation", "press"),
    # learning / curriculum
    ("learning.learning", "Learning", "Learning", "learn"),
    ("learning.reading", "Reading", "Learning", "read"),
    ("learning.writing", "Writing", "Learning", "write"),
    ("learning.maths", "Maths", "Learning", "mathematics"),
    ("learning.science", "Science", "Learning", "science"),
    ("learning.art", "Art", "Learning", "paint"),
    ("learning.music", "Music", "Learning", "music"),
    ("learning.computing", "Computing", "Learning", "computer"),
    ("learning.pe", "PE", "Learning", "gymnastics"),
    ("learning.swimming", "Swimming", "Learning", "swim"),
    ("learning.library", "Library", "Learning", "library"),
    ("learning.cooking", "Cooking", "Learning", "cook"),
    ("learning.gardening", "Gardening", "Learning", "garden"),
    # school day
    ("school.lunch", "Lunch", "School day", "lunch"),
    ("school.playtime", "Playtime", "School day", "playground"),
    ("school.assembly", "Assembly", "School day", "auditorium"),
    ("school.register", "Register", "School day", "list"),
    ("school.tidy_up", "Tidy up", "School day", "tidy"),
    ("school.line_up", "Line up", "School day", "line"),
    ("school.school", "School", "School day", "school"),
    ("school.bus", "Bus", "School day", "bus"),
    ("school.trip", "Trip", "School day", "excursion"),
    ("school.visitor", "Visitor", "School day", "visit"),
    ("school.new_adult", "New adult", "School day", "adult"),
    ("school.classroom", "Classroom", "School day", "classroom"),
    # interaction
    ("interaction.interaction", "Interaction", "Interaction", "friends"),
    ("interaction.turn_taking", "Turn taking", "Interaction", "turn"),
    ("interaction.sharing", "Sharing", "Interaction", "share"),
    ("interaction.joint_attention", "Joint attention", "Interaction", "look"),
    ("interaction.conversation", "Conversation", "Interaction", "conversation"),
    ("interaction.asking", "Asking questions", "Interaction", "ask"),
    ("interaction.answering", "Answering", "Interaction", "answer"),
    ("interaction.commenting", "Commenting", "Interaction", "say"),
    ("interaction.peer", "Playing with a friend", "Interaction", "play"),
    ("interaction.problem_solving", "Problem solving", "Interaction", "solve"),
    ("interaction.perspective", "How others feel", "Interaction", "empathy"),
    # jobs / classroom roles
    ("job.job", "Classroom job", "Jobs", "work"),
    ("job.helper", "Helper", "Jobs", "helper"),
    ("job.tidy", "Tidy helper", "Jobs", "clean"),
    ("job.door", "Door helper", "Jobs", "door"),
    ("job.plants", "Plant helper", "Jobs", "plant"),
    ("job.register_helper", "Register helper", "Jobs", "notebook"),
    ("job.snack_helper", "Snack helper", "Jobs", "fruit"),
    ("job.line_leader", "Line leader", "Jobs", "leader"),
    ("job.messenger", "Messenger", "Jobs", "letter"),
    ("job.librarian", "Book helper", "Jobs", "book"),
    # platform / system concepts
    ("system.today", "Today", "System", "today"),
    ("system.pupil", "Pupil", "System", "child"),
    ("system.staff", "Staff", "System", "teacher"),
    ("system.group", "Group", "System", "group"),
    ("system.settings", "Settings", "System", "tool"),
    ("system.observation", "Observation", "System", "observe"),
    ("system.progress", "Progress", "System", "graphic"),
    ("system.target", "Target", "System", "target"),
    ("system.independence", "Independence", "System", "autonomy"),
    ("system.engagement", "Engagement", "System", "attention"),
    ("system.spark", "Spark", "System", "star"),
    ("system.badge", "Badge", "System", "medal"),
    ("system.project", "Project", "System", "project"),
    ("system.picker", "Random picker", "System", "dice"),
    ("system.prepare_me", "Prepare me", "System", "explain"),
    ("system.timer", "Timer", "System", "clock"),
    ("system.photo", "Photograph", "System", "photograph"),
    ("system.symbol", "Symbol", "System", "picture"),
    ("system.later", "Later", "Sequence", "after"),
    ("system.first_then", "First / then", "Sequence", "before"),
]


def arasaac_pick(term: str) -> tuple[int, str] | None:
    url = ARASAAC_SEARCH.format(term=urllib.parse.quote(term))
    try:
        with urllib.request.urlopen(url, timeout=25) as r:
            data = json.loads(r.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        print(f"   ! search failed for {term}: {exc}")
        return None
    if not isinstance(data, list) or not data:
        return None
    # prefer full-colour pictograms (closest to the school's Widgit house style),
    # then an exact keyword match, then the simplest entry
    def score(item):
        kws = [k.get("keyword", "").lower() for k in item.get("keywords", [])]
        exact = 0 if term.lower() in kws else 1
        return (exact, 1 if item.get("schematic") else 0, len(kws))

    best = sorted(data, key=score)[0]
    return best["_id"], term


def arasaac_download(pid: int) -> Image.Image | None:
    try:
        with urllib.request.urlopen(ARASAAC_IMG.format(pid=pid), timeout=30) as r:
            return flatten(io.BytesIO(r.read()))
    except Exception as exc:  # noqa: BLE001
        print(f"   ! image download failed for {pid}: {exc}")
        return None


import urllib.parse  # noqa: E402  (used above)


def build(verify: bool = False) -> dict:
    ASSETS.mkdir(parents=True, exist_ok=True)
    pptx = ensure_pptx()
    media = extract_media(pptx)
    print(f"deck media: {len(media)} images")

    # index every candidate piece
    pieces: dict[str, Image.Image] = {}
    for base, im in media.items():
        for i, p in enumerate(split_source(base, im)):
            pieces[f"{base}#{i}"] = p
    print(f"candidate crops: {len(pieces)}")

    manifest: list[dict] = []
    missing: list[str] = []

    for key, label, group, src, only_icon in WIDGIT_MAP:
        piece = pieces.get(src)
        if piece is None:
            missing.append(f"{key} <- {src}")
            continue
        img = icon_only(piece) if only_icon else piece
        out = pad_square(img)
        fn = key.replace(".", "__") + ".png"
        out.save(ASSETS / fn, optimize=True)
        manifest.append(
            {
                "conceptKey": key,
                "label": label,
                "group": group,
                "file": fn,
                "source": "widgit-deck",
                "attribution": "Widgit Symbols \u00a9 Widgit Software \u2014 extracted from the school\u2019s own Morning Meeting resource",
                "sourceRef": src,
            }
        )

    # ARASAAC
    cache_path = ROOT / "assets" / "source" / "arasaac_ids.json"
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    for key, label, group, term in ARASAAC_MAP:
        fn = key.replace(".", "__") + ".png"
        target = ASSETS / fn
        pid = cache.get(key)
        if target.exists() and pid:
            manifest.append(
                {
                    "conceptKey": key,
                    "label": label,
                    "group": group,
                    "file": fn,
                    "source": "arasaac",
                    "attribution": "ARASAAC pictograms \u2014 author Sergio Palao, origin ARASAAC (https://arasaac.org), licence CC BY-NC-SA",
                    "sourceRef": f"arasaac:{pid}",
                }
            )
            continue
        if not pid:
            found = arasaac_pick(term)
            if not found:
                missing.append(f"{key} <- arasaac:{term}")
                continue
            pid = found[0]
            cache[key] = pid
        im = arasaac_download(pid)
        if im is None:
            missing.append(f"{key} <- arasaac:{pid}")
            continue
        pad_square(im).save(target, optimize=True)
        manifest.append(
            {
                "conceptKey": key,
                "label": label,
                "group": group,
                "file": fn,
                "source": "arasaac",
                "attribution": "ARASAAC pictograms \u2014 author Sergio Palao, origin ARASAAC (https://arasaac.org), licence CC BY-NC-SA",
                "sourceRef": f"arasaac:{pid}",
            }
        )
        time.sleep(0.05)

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache, indent=1, sort_keys=True))

    (ASSETS / "manifest.json").write_text(json.dumps(manifest, indent=1))
    print(f"symbols written: {len(manifest)}  missing: {len(missing)}")
    for m in missing:
        print("   MISSING", m)

    if verify:
        make_verify_sheets(manifest)
    return {"count": len(manifest), "missing": missing}


def make_verify_sheets(manifest):
    CELL, COLS, PER = 190, 8, 48
    for si, k in enumerate(range(0, len(manifest), PER)):
        chunk = manifest[k : k + PER]
        rows = (len(chunk) + COLS - 1) // COLS
        sh = Image.new("RGB", (COLS * CELL, rows * CELL), (238, 238, 242))
        d = ImageDraw.Draw(sh)
        for i, r in enumerate(chunk):
            x, y = (i % COLS) * CELL, (i // COLS) * CELL
            d.rectangle([x, y, x + CELL - 1, y + CELL - 1], fill="white", outline=(90, 90, 90))
            im = Image.open(ASSETS / r["file"])
            im.thumbnail((CELL - 12, CELL - 40))
            sh.paste(im, (x + (CELL - im.width) // 2, y + 26 + (CELL - 40 - im.height) // 2))
            d.rectangle([x + 1, y + 1, x + CELL - 2, y + 22], fill=(255, 235, 175))
            d.text((x + 5, y + 6), r["conceptKey"][:26], fill=(10, 10, 10))
        sh.save(f"/tmp/verify_symbols_{si}.png")
    print("verify sheets written to /tmp/verify_symbols_*.png")


if __name__ == "__main__":
    build(verify="--verify" in sys.argv)
