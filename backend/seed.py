"""Seed the platform.

IMPORTANT
---------
Everything created here is EXAMPLE / SAMPLE content for the prototype. Every
record carries ``is_sample: True`` so the interface can label it, and every
record is editable, renameable or deletable from Settings. No classroom content
is hard-coded into application logic.
"""
from __future__ import annotations

import json
from pathlib import Path

from core.db import C, get_db
from core.permissions import DEFAULT_ROLES
from core.security import hash_password
from core.util import new_id, today_iso, utcnow_iso

SEED_VERSION = 7
ASSETS = Path(__file__).resolve().parent / "assets" / "symbols"


# --------------------------------------------------------------------------- #
# symbols
# --------------------------------------------------------------------------- #
async def sync_symbols() -> int:
    """Load the canonical library. Never clobbers a school upload."""
    db = get_db()
    manifest_path = ASSETS / "manifest.json"
    if not manifest_path.exists():
        return 0
    manifest = json.loads(manifest_path.read_text())
    count = 0
    for entry in manifest:
        key = entry["conceptKey"]
        existing = await db[C.symbols].find_one({"concept_key": key})
        base = {
            "concept_key": key,
            "group": entry["group"],
            "source_ref": entry.get("sourceRef"),
        }
        if existing:
            patch = dict(base)
            if not existing.get("custom_data"):
                patch.update(
                    {
                        "file": entry["file"],
                        "source": entry["source"],
                        "attribution": entry["attribution"],
                    }
                )
            await db[C.symbols].update_one({"concept_key": key}, {"$set": patch})
        else:
            await db[C.symbols].insert_one(
                {
                    "id": new_id(),
                    **base,
                    "label": entry["label"],
                    "file": entry["file"],
                    "source": entry["source"],
                    "attribution": entry["attribution"],
                    "created_at": utcnow_iso(),
                }
            )
        count += 1
    return count


# --------------------------------------------------------------------------- #
# sample classroom content
# --------------------------------------------------------------------------- #
SAMPLE_PUPILS = [
    ("Amara", "B", "sage", "system.pupil"),
    ("Reuben", "C", "teal", "system.pupil"),
    ("Isla", "D", "coral", "system.pupil"),
    ("Kofi", "M", "lilac", "system.pupil"),
    ("Freya", "N", "amber", "system.pupil"),
    ("Jonah", "P", "sky", "system.pupil"),
    ("Nadia", "S", "rose", "system.pupil"),
    ("Toby", "W", "mint", "system.pupil"),
]

SAMPLE_GROUPS = [
    ("Sunflower group", "amber"),
    ("Oak group", "sage"),
]

SAMPLE_ACTIVITIES = [
    ("CREW Time", "activity.crew_time", "teal", 20, "lesson"),
    ("Phonics", "activity.phonics", "coral", 25, "lesson"),
    ("Maths", "learning.maths", "sky", 40, "lesson"),
    ("Reading", "learning.reading", "lilac", 25, "lesson"),
    ("Writing", "learning.writing", "amber", 30, "lesson"),
    ("Movement break", "routine.movement", "mint", 10, "break"),
    ("Calming time", "routine.calming", "sage", 10, "break"),
    ("Snack", "comm.snack", "amber", 15, "routine"),
    ("Playtime", "school.playtime", "mint", 20, "routine"),
    ("Lunch", "school.lunch", "coral", 45, "routine"),
    ("PE", "learning.pe", "sky", 45, "lesson"),
    ("Art", "learning.art", "rose", 40, "lesson"),
    ("Music", "learning.music", "lilac", 30, "lesson"),
    ("Assembly", "school.assembly", "teal", 20, "event"),
    ("Project Spark", "system.project", "amber", 45, "lesson"),
    ("Home time", "comm.home", "sage", 10, "routine"),
]

SAMPLE_TEMPLATES = [
    (
        "Standard day",
        "Our usual classroom shape",
        [
            ("CREW Time", "activity.crew_time", "09:00", "09:20", "teal"),
            ("Phonics", "activity.phonics", "09:20", "09:45", "coral"),
            ("Movement break", "routine.movement", "09:45", "09:55", "mint"),
            ("Maths", "learning.maths", "09:55", "10:35", "sky"),
            ("Snack", "comm.snack", "10:35", "10:50", "amber"),
            ("Playtime", "school.playtime", "10:50", "11:10", "mint"),
            ("Reading", "learning.reading", "11:10", "11:35", "lilac"),
            ("Lunch", "school.lunch", "11:35", "12:20", "coral"),
            ("Calming time", "routine.calming", "12:20", "12:35", "sage"),
            ("Project Spark", "system.project", "12:35", "13:20", "amber"),
            ("Home time", "comm.home", "13:20", "13:30", "sage"),
        ],
    ),
    (
        "PE day",
        "Longer movement block, shorter table work",
        [
            ("CREW Time", "activity.crew_time", "09:00", "09:20", "teal"),
            ("PE", "learning.pe", "09:20", "10:05", "sky"),
            ("Calming time", "routine.calming", "10:05", "10:20", "sage"),
            ("Snack", "comm.snack", "10:20", "10:35", "amber"),
            ("Maths", "learning.maths", "10:35", "11:10", "sky"),
            ("Lunch", "school.lunch", "11:35", "12:20", "coral"),
            ("Art", "learning.art", "12:35", "13:20", "rose"),
            ("Home time", "comm.home", "13:20", "13:30", "sage"),
        ],
    ),
    (
        "Assembly day",
        "Includes whole-school assembly",
        [
            ("CREW Time", "activity.crew_time", "09:00", "09:20", "teal"),
            ("Assembly", "school.assembly", "09:20", "09:40", "teal"),
            ("Movement break", "routine.movement", "09:40", "09:50", "mint"),
            ("Phonics", "activity.phonics", "09:50", "10:15", "coral"),
            ("Snack", "comm.snack", "10:15", "10:30", "amber"),
            ("Writing", "learning.writing", "10:30", "11:00", "amber"),
            ("Lunch", "school.lunch", "11:35", "12:20", "coral"),
            ("Reading", "learning.reading", "12:35", "13:00", "lilac"),
            ("Home time", "comm.home", "13:20", "13:30", "sage"),
        ],
    ),
    (
        "Trip day",
        "Off-site visit shape",
        [
            ("CREW Time", "activity.crew_time", "09:00", "09:15", "teal"),
            ("Bus to the trip", "school.bus", "09:15", "09:45", "sky"),
            ("Trip", "school.trip", "09:45", "12:00", "mint"),
            ("Lunch", "school.lunch", "12:00", "12:40", "coral"),
            ("Bus back to school", "school.bus", "12:40", "13:10", "sky"),
            ("Calming time", "routine.calming", "13:10", "13:25", "sage"),
            ("Home time", "comm.home", "13:25", "13:30", "sage"),
        ],
    ),
]

MORNING_MEETING_COMPONENTS = [
    ("greeting", "Greeting and Check In", "routine.greeting_check_in", "greeting",
     "Good morning! Let's say hello to everyone.", {"show_sign": True, "sign_concept": "sign.good_morning"}),
    ("expectations", "Expectations", "routine.expectations", "expectations",
     "These are our three expectations.", {}),
    ("calendar", "Calendar", "routine.calendar", "calendar", "The day is\u2026 The month is\u2026", {}),
    ("weather", "Weather", "routine.weather", "weather", "How\u2019s the weather today?", {}),
    ("timetable", "Timetable", "routine.timetable", "timetable", "This is what is happening today.", {}),
    ("movement", "Movement", "routine.movement", "movement", "Let's move our bodies.", {}),
    ("calming", "Calming", "routine.calming", "calming", "Now let's be calm and ready.", {}),
]

EXPECTATIONS = [
    ("expectations.be_kind", "Be Kind", [
        ("Say kind words", "expectations.say_kind_words"),
        ("Focus on yourself", "expectations.focus_on_yourself"),
        ("Use an inside voice", "expectations.inside_voice"),
    ]),
    ("expectations.work_hard", "Work Hard", [
        ("Complete the tasks", "expectations.complete_tasks"),
        ("Listen to the teachers", "expectations.listen_to_teachers"),
        ("Try your best", "expectations.try_your_best"),
    ]),
    ("expectations.be_responsible", "Be Responsible", [
        ("Stay in your seat", "expectations.stay_in_seat"),
        ("Walk inside", "expectations.walk_inside"),
        ("Raise your hand", "expectations.raise_your_hand"),
    ]),
]

COMM_CATEGORIES = [
    ("I want", "comm.i_want", "coral", [
        ("a turn", "interaction.turn_taking"),
        ("a drink", "comm.drink"),
        ("a snack", "comm.snack"),
        ("to play", "interaction.peer"),
        ("more", "comm.more"),
        ("my fidget", "regulation.fidget"),
    ]),
    ("I need", "comm.i_need", "amber", [
        ("the toilet", "comm.toilet"),
        ("a break", "comm.break"),
        ("space", "regulation.quiet_space"),
        ("my ear defenders", "regulation.headphones"),
        ("water", "regulation.water"),
        ("an adult", "regulation.adult_help"),
    ]),
    ("I feel", "comm.i_feel", "lilac", [
        ("happy", "feeling.happy"),
        ("sad", "feeling.sad"),
        ("angry", "feeling.angry"),
        ("worried", "feeling.worried"),
        ("tired", "feeling.tired"),
        ("excited", "feeling.excited"),
        ("poorly", "feeling.poorly"),
        ("calm", "feeling.calm"),
    ]),
    ("I think", "comm.i_think", "sky", [
        ("I can do it", "expectations.try_your_best"),
        ("this is hard", "system.target"),
        ("I have finished", "sequence.finished"),
        ("I don't understand", "comm.question"),
    ]),
    ("I can say", "comm.i_can_say", "sage", [
        ("hello", "comm.hello"),
        ("goodbye", "comm.goodbye"),
        ("my name is\u2026", "comm.my_name"),
        ("yes", "comm.yes"),
        ("no", "comm.no"),
        ("stop please", "comm.stop"),
    ]),
    ("Help", "comm.help", "rose", [
        ("Help please", "comm.help"),
        ("I need space please", "regulation.need_space"),
        ("Show me", "interaction.joint_attention"),
        ("Wait please", "comm.wait"),
    ]),
]

ZONES = [
    ("Blue Zone", "blue", ["Sad", "Sick", "Tired", "Bored", "Moving slowly"],
     ["Low energy", "Quiet", "Head down", "Slow movements"]),
    ("Green Zone", "green", ["Happy", "Calm", "Feeling okay", "Focused", "Relaxed"],
     ["Ready to learn", "Joining in", "Settled body"]),
    ("Yellow Zone", "yellow", ["Frustrated", "Worried", "Silly", "Wiggly", "Excited"],
     ["Loss of some control", "Fidgeting", "Louder voice", "Fast movements"]),
    ("Red Zone", "red", ["Mad / angry", "Terrified", "Elated", "Devastated"],
     ["Out of control", "Shouting", "Needs space now"]),
]

STRATEGIES = [
    ("I can say \u201cI need space please\u201d", "regulation.need_space", "adult", ["Yellow Zone", "Red Zone"]),
    ("I can focus on myself", "regulation.focus_on_myself", "calming", ["Yellow Zone"]),
    ("I can move away and take deep breaths", "regulation.move_away_breathe", "calming", ["Yellow Zone", "Red Zone"]),
    ("I can control what I do", "regulation.can_control_myself", "calming", ["Yellow Zone"]),
    ("Deep breaths", "regulation.deep_breaths", "calming", ["Yellow Zone", "Red Zone", "Blue Zone"]),
    ("Quiet space", "regulation.quiet_space", "sensory", ["Yellow Zone", "Red Zone"]),
    ("Ear defenders", "regulation.headphones", "sensory", ["Yellow Zone", "Red Zone"]),
    ("Fidget toy", "regulation.fidget", "sensory", ["Blue Zone", "Yellow Zone"]),
    ("A drink of water", "regulation.water", "sensory", ["Blue Zone", "Yellow Zone"]),
    ("Walk to the door and back", "regulation.walk", "movement", ["Blue Zone", "Yellow Zone"]),
    ("Brain break video", "resource.brain_break", "movement", ["Blue Zone", "Green Zone"]),
    ("Calming breaks", "resource.calming_breaks", "calming", ["Yellow Zone", "Red Zone"]),
    ("Count to ten", "regulation.count", "calming", ["Yellow Zone"]),
    ("Squeeze and release", "regulation.squeeze", "sensory", ["Yellow Zone", "Red Zone"]),
    ("Ask an adult for help", "regulation.adult_help", "adult", ["Blue Zone", "Yellow Zone", "Red Zone"]),
]

PREPARE_SECTIONS = [
    ("doing_now", "We are doing this now"),
    ("because", "We do this because\u2026"),
    ("what_happens", "What will happen?"),
    ("see_hear", "What might I see, hear or experience?"),
    ("what_can_i_do", "What can I do?"),
    ("what_helps", "What can help me?"),
    ("afterwards", "What happens afterwards?"),
]

PREPARE_TEMPLATES = [
    ("Assembly", "school.assembly"),
    ("Trip", "school.trip"),
    ("A visitor is coming", "school.visitor"),
    ("A new adult", "school.new_adult"),
    ("Change to the timetable", "routine.timetable"),
    ("Swimming", "learning.swimming"),
    ("A mainstream lesson", "school.school"),
]

JOBS = [
    ("Register helper", "job.register_helper", "Takes the register to the office"),
    ("Snack helper", "job.snack_helper", "Hands out the snack"),
    ("Line leader", "job.line_leader", "Leads the line to the hall"),
    ("Tidy helper", "job.tidy", "Helps tidy the classroom"),
    ("Door helper", "job.door", "Holds the door for the class"),
    ("Plant helper", "job.plants", "Waters the classroom plants"),
    ("Book helper", "job.librarian", "Looks after the reading corner"),
    ("Messenger", "job.messenger", "Takes messages to another class"),
]

PICKERS = [
    ("Pick a child", "pupil", "system.pupil", []),
    ("Pick a partner", "pupil", "interaction.peer", []),
    ("Pick a classroom job", "option", "job.job", []),
    ("Pick a movement activity", "option", "routine.movement", [
        ("Ten jumping jacks", "routine.movement"),
        ("Animal walks", "regulation.walk"),
        ("Brain break video", "resource.brain_break"),
        ("Stretch up tall", "routine.movement"),
        ("March on the spot", "regulation.walk"),
    ]),
    ("Pick a calming activity", "option", "routine.calming", [
        ("Deep breaths", "regulation.deep_breaths"),
        ("Calming breaks video", "resource.calming_breaks"),
        ("Count to ten", "regulation.count"),
        ("Squeeze and release", "regulation.squeeze"),
    ]),
    ("Pick a question", "option", "comm.question", [
        ("What can you see?", "interaction.asking"),
        ("What is happening?", "interaction.asking"),
        ("Why did that happen?", "interaction.asking"),
        ("What might happen next?", "interaction.asking"),
    ]),
]

SPARK_RULES = [
    ("Asked for help", "Communication", 1, "comm.help"),
    ("Used my symbols to communicate", "Communication", 1, "comm.communication"),
    ("Took a turn", "Interaction", 1, "interaction.turn_taking"),
    ("Played with a friend", "Interaction", 1, "interaction.peer"),
    ("Used a calming strategy", "Regulation", 1, "routine.calming"),
    ("Told an adult how I felt", "Regulation", 1, "comm.i_feel"),
    ("Finished my task independently", "Independence", 2, "sequence.finished"),
    ("Got my own equipment ready", "Independence", 1, "system.independence"),
    ("Joined in with Morning Meeting", "Participation", 1, "activity.crew_time"),
    ("Tried something new", "Participation", 2, "expectations.try_your_best"),
]

BADGES = [
    ("First Steps", "system.badge", 5, "Participation"),
    ("Communicator", "comm.communication", 10, "Communication"),
    ("Team Player", "interaction.interaction", 10, "Interaction"),
    ("Calm and Ready", "routine.calming", 10, "Regulation"),
    ("Independent Learner", "system.independence", 15, "Independence"),
]

BLANKS_PROMPTS = [
    (1, "What can you see?"),
    (1, "Find one like this."),
    (1, "What is this called?"),
    (1, "Show me the\u2026"),
    (2, "What is happening?"),
    (2, "Who / what / where is\u2026?"),
    (2, "Find one that is\u2026"),
    (2, "What can you hear?"),
    (3, "What will happen next?"),
    (3, "Tell me how you would\u2026"),
    (3, "What is the same? What is different?"),
    (3, "Find one that is not\u2026"),
    (4, "Why did that happen?"),
    (4, "What would happen if\u2026?"),
    (4, "How do you think they feel? Why?"),
    (4, "What could we do instead?"),
]

INTERACTION_AREAS = [
    ("Greeting", "comm.hello", ["Say hello to one person", "Wave back", "Use a name when greeting"]),
    ("Turn-taking", "interaction.turn_taking", ["Wait for my turn", "Say \u201cyour turn\u201d", "Pass to a friend"]),
    ("Waiting", "comm.wait", ["Wait with a timer", "Hold the wait symbol", "Wait for 10 seconds"]),
    ("Sharing", "interaction.sharing", ["Share one item", "Offer something to a friend"]),
    ("Joint attention", "interaction.joint_attention", ["Look where I point", "Show an adult something"]),
    ("Conversation", "interaction.conversation", ["Two-turn exchange", "Stay on the topic"]),
    ("Asking questions", "interaction.asking", ["Ask one question", "Ask a friend a question"]),
    ("Answering questions", "interaction.answering", ["Answer with a symbol", "Answer with words"]),
    ("Commenting", "interaction.commenting", ["Say what I notice", "Comment on a friend's work"]),
    ("Peer interaction", "interaction.peer", ["Play alongside", "Play a game together"]),
    ("Social problem-solving", "interaction.problem_solving", ["Choose a solution", "Ask for help to solve it"]),
    ("Perspective taking", "interaction.perspective", ["How might they feel?", "What would help them?"]),
]

PROFILE_SECTIONS = [
    ("communication", "Communication", "comm.communication"),
    ("interaction", "Interaction", "interaction.interaction"),
    ("regulation", "Regulation", "regulation.zones"),
    ("learning", "Learning", "learning.learning"),
    ("independence", "Independence", "system.independence"),
    ("interests", "Interests", "system.spark"),
    ("strengths", "Strengths", "expectations.try_your_best"),
    ("targets", "Current targets", "system.target"),
    ("strategies", "Helpful strategies", "regulation.adult_help"),
    ("adults_know", "Things adults should know", "system.staff"),
    ("visual_supports", "Visual supports", "system.symbol"),
]

SAMPLE_PROFILE_CONTENT = {
    "communication": ["Uses symbols and short phrases", "Responds well to 10 second wait time"],
    "interaction": ["Enjoys parallel play", "Working on two-turn exchanges"],
    "regulation": ["Uses the Green and Yellow zones confidently", "Ear defenders help in the hall"],
    "learning": ["Strong visual memory", "Prefers practical tasks"],
    "independence": ["Gets own equipment with a visual list"],
    "interests": ["Trains", "Space", "Cooking"],
    "strengths": ["Kind to others", "Excellent visual matching"],
    "targets": ["Ask for help using my symbol", "Take a turn in a small group"],
    "strategies": ["Offer a choice of two", "Give a countdown before transitions"],
    "adults_know": ["Prefers not to be rushed", "Likes a quiet greeting"],
    "visual_supports": ["Now / Next board", "Personal communication book"],
}

PROJECTS = [
    ("Classroom cafe", "system.project", ["Communication", "Independence", "Practical skills"],
     ["Plan the menu", "Make a shopping list", "Prepare the snack", "Serve a customer"]),
    ("Growing vegetables", "learning.gardening", ["Independence", "Problem solving"],
     ["Plant the seeds", "Water every day", "Measure the growth", "Harvest"]),
]


async def seed_all(force: bool = False) -> dict:
    db = get_db()
    meta = await db[C.seed_meta].find_one({"id": "seed"})
    symbol_count = await sync_symbols()
    if meta and meta.get("version") == SEED_VERSION and not force:
        return {"seeded": False, "symbols": symbol_count}

    # migration: earlier prototypes used a reserved .test email domain
    await db[C.users].delete_many({"email": {"$regex": r"\\.test$"}})

    # ---------------- roles + staff accounts ---------------- #
    role_ids: dict[str, str] = {}
    for role in DEFAULT_ROLES:
        existing = await db[C.roles].find_one({"name": role["name"]})
        if existing:
            role_ids[role["name"]] = existing["id"]
            continue
        doc = {"id": new_id(), "created_at": utcnow_iso(), **role}
        await db[C.roles].insert_one(doc)
        role_ids[role["name"]] = doc["id"]

    # ---------------- pupils + groups ---------------- #
    pupil_ids: list[str] = []
    for first, last_initial, colour, symbol in SAMPLE_PUPILS:
        existing = await db[C.pupils].find_one({"first_name": first, "is_sample": True})
        if existing:
            pupil_ids.append(existing["id"])
            continue
        pid = new_id()
        pupil_ids.append(pid)
        await db[C.pupils].insert_one(
            {
                "id": pid,
                "first_name": first,
                "last_initial": last_initial,
                "display_name": f"{first} {last_initial}",
                "avatar": {"kind": "avatar", "colour": colour, "symbol_concept": symbol},
                "photo_id": None,
                "photo_contexts": {"today": False, "picker": True, "jobs": True, "profile": True},
                "group_ids": [],
                "active": True,
                "is_sample": True,
                "created_at": utcnow_iso(),
            }
        )

    group_ids = []
    for idx, (name, colour) in enumerate(SAMPLE_GROUPS):
        existing = await db[C.groups].find_one({"name": name})
        if existing:
            group_ids.append(existing["id"])
            continue
        gid = new_id()
        group_ids.append(gid)
        members = pupil_ids[idx::2]
        await db[C.groups].insert_one(
            {"id": gid, "name": name, "colour": colour, "pupil_ids": members, "is_sample": True}
        )
        for pid in members:
            await db[C.pupils].update_one({"id": pid}, {"$addToSet": {"group_ids": gid}})

    staff = [
        ("Alex Grant", "admin@westernpark.school", "Classroom Administrator", "westernpark"),
        ("Sam Teacher", "teacher@westernpark.school", "Teacher", "westernpark"),
        ("Jo Assistant", "ta@westernpark.school", "Teaching Assistant", "westernpark"),
        ("Robin Speech", "specialist@westernpark.school", "Specialist Staff", "westernpark"),
        ("Chris Leader", "leader@westernpark.school", "Senior Leader", "westernpark"),
        ("Dana Mainstream", "mainstream@westernpark.school", "Mainstream Staff", "westernpark"),
        ("Classroom display", "display@westernpark.school", "Pupil-facing mode", "westernpark"),
    ]
    for name, email, role_name, password in staff:
        if await db[C.users].find_one({"email": email}):
            continue
        await db[C.users].insert_one(
            {
                "id": new_id(),
                "name": name,
                "email": email,
                "password_hash": hash_password(password),
                "role_id": role_ids[role_name],
                "pupil_ids": pupil_ids,
                "active": True,
                "is_sample": True,
                "created_at": utcnow_iso(),
            }
        )

    # ---------------- pupil profiles ---------------- #
    for order, (key, title, symbol) in enumerate(PROFILE_SECTIONS):
        if await db[C.profile_sections].find_one({"key": key}):
            continue
        await db[C.profile_sections].insert_one(
            {
                "id": new_id(),
                "key": key,
                "title": title,
                "symbol_concept": symbol,
                "order": order,
                "enabled": True,
                "mainstream_visible": key in {"communication", "interaction", "regulation", "strategies", "targets"},
                "is_sample": True,
            }
        )
    for pid in pupil_ids:
        if await db[C.pupil_profiles].find_one({"pupil_id": pid}):
            continue
        await db[C.pupil_profiles].insert_one(
            {
                "id": new_id(),
                "pupil_id": pid,
                "sections": {k: list(v) for k, v in SAMPLE_PROFILE_CONTENT.items()},
                "is_sample": True,
                "updated_at": utcnow_iso(),
            }
        )

    # ---------------- activity library + templates ---------------- #
    activity_ids: dict[str, str] = {}
    for title, symbol, colour, minutes, kind in SAMPLE_ACTIVITIES:
        existing = await db[C.activities].find_one({"title": title})
        if existing:
            activity_ids[title] = existing["id"]
            continue
        aid = new_id()
        activity_ids[title] = aid
        await db[C.activities].insert_one(
            {
                "id": aid,
                "title": title,
                "symbol_concept": symbol,
                "colour": colour,
                "default_minutes": minutes,
                "kind": kind,
                "description": "",
                "is_sample": True,
                "created_at": utcnow_iso(),
            }
        )

    template_ids: dict[str, str] = {}
    for name, description, items in SAMPLE_TEMPLATES:
        existing = await db[C.templates].find_one({"name": name})
        if existing:
            template_ids[name] = existing["id"]
            continue
        tid = new_id()
        template_ids[name] = tid
        await db[C.templates].insert_one(
            {
                "id": tid,
                "name": name,
                "description": description,
                "symbol_concept": "routine.timetable",
                "items": [
                    {
                        "id": new_id(),
                        "title": t,
                        "symbol_concept": s,
                        "start": st,
                        "end": en,
                        "colour": c,
                        "note": "",
                        "activity_id": activity_ids.get(t),
                    }
                    for t, s, st, en, c in items
                ],
                "is_sample": True,
                "created_at": utcnow_iso(),
            }
        )

    # today's timetable from the standard template
    day = await db[C.daily].find_one({"date": today_iso()})
    if not day:
        tpl = await db[C.templates].find_one({"id": template_ids.get("Standard day")}, {"_id": 0})
        items = []
        for idx, i in enumerate(tpl.get("items", []) if tpl else []):
            items.append(
                {
                    **{k: v for k, v in i.items() if k != "id"},
                    "id": new_id(),
                    "status": "current" if idx == 0 else "later",
                }
            )
        await db[C.daily].insert_one(
            {
                "id": new_id(),
                "date": today_iso(),
                "items": items,
                "template_id": template_ids.get("Standard day"),
                "note": "",
                "is_sample": True,
                "created_at": utcnow_iso(),
            }
        )

    # ---------------- morning meeting ---------------- #
    if not await db[C.mm_templates].find_one({"is_default": True}):
        await db[C.mm_templates].insert_one(
            {
                "id": new_id(),
                "name": "CREW Time",
                "description": "Our Morning Meeting routine",
                "is_default": True,
                "is_sample": True,
                "components": [
                    {
                        "id": new_id(),
                        "key": key,
                        "title": title,
                        "symbol_concept": symbol,
                        "kind": kind,
                        "script": script,
                        "config": config,
                        "enabled": True,
                        "participants": "all",
                        "order": order,
                    }
                    for order, (key, title, symbol, kind, script, config) in enumerate(
                        MORNING_MEETING_COMPONENTS
                    )
                ],
                "created_at": utcnow_iso(),
            }
        )

    for order, (symbol, title, children) in enumerate(EXPECTATIONS):
        if await db["expectations"].find_one({"title": title}):
            continue
        await db["expectations"].insert_one(
            {
                "id": new_id(),
                "title": title,
                "symbol_concept": symbol,
                "order": order,
                "enabled": True,
                "is_sample": True,
                "children": [
                    {"id": new_id(), "title": t, "symbol_concept": s} for t, s in children
                ],
            }
        )

    # ---------------- communication ---------------- #
    for order, (title, symbol, colour, options) in enumerate(COMM_CATEGORIES):
        existing = await db[C.comm_categories].find_one({"title": title})
        if existing:
            cid = existing["id"]
        else:
            cid = new_id()
            await db[C.comm_categories].insert_one(
                {
                    "id": cid,
                    "title": title,
                    "symbol_concept": symbol,
                    "colour": colour,
                    "order": order,
                    "enabled": True,
                    "is_sample": True,
                }
            )
        for oorder, (text, osymbol) in enumerate(options):
            if await db[C.comm_options].find_one({"category_id": cid, "text": text}):
                continue
            await db[C.comm_options].insert_one(
                {
                    "id": new_id(),
                    "category_id": cid,
                    "text": text,
                    "speech_text": text,
                    "symbol_concept": osymbol,
                    "order": oorder,
                    "enabled": True,
                    "is_sample": True,
                }
            )

    # ---------------- regulation ---------------- #
    zone_ids: dict[str, str] = {}
    for order, (name, colour, feelings, indicators) in enumerate(ZONES):
        existing = await db[C.zones].find_one({"name": name})
        if existing:
            zone_ids[name] = existing["id"]
            continue
        zid = new_id()
        zone_ids[name] = zid
        await db[C.zones].insert_one(
            {
                "id": zid,
                "name": name,
                "colour": colour,
                "feelings": feelings,
                "indicators": indicators,
                "order": order,
                "enabled": True,
                "is_sample": True,
            }
        )
    for order, (title, symbol, kind, zones) in enumerate(STRATEGIES):
        if await db[C.strategies].find_one({"title": title}):
            continue
        await db[C.strategies].insert_one(
            {
                "id": new_id(),
                "title": title,
                "symbol_concept": symbol,
                "kind": kind,
                "zone_ids": [zone_ids[z] for z in zones if z in zone_ids],
                "order": order,
                "enabled": True,
                "is_sample": True,
            }
        )

    # ---------------- prepare me ---------------- #
    for name, symbol in PREPARE_TEMPLATES:
        if await db[C.prepare_templates].find_one({"name": name}):
            continue
        await db[C.prepare_templates].insert_one(
            {
                "id": new_id(),
                "name": name,
                "symbol_concept": symbol,
                "sections": [
                    {"id": new_id(), "key": k, "prompt": p, "order": n, "enabled": True}
                    for n, (k, p) in enumerate(PREPARE_SECTIONS)
                ],
                "is_sample": True,
                "created_at": utcnow_iso(),
            }
        )

    # ---------------- jobs ---------------- #
    for order, (title, symbol, description) in enumerate(JOBS):
        if await db[C.jobs].find_one({"title": title}):
            continue
        await db[C.jobs].insert_one(
            {
                "id": new_id(),
                "title": title,
                "symbol_concept": symbol,
                "description": description,
                "order": order,
                "frequency": "daily",
                "enabled": True,
                "excluded_pupil_ids": [],
                "is_sample": True,
            }
        )

    # ---------------- pickers ---------------- #
    for order, (name, kind, symbol, options) in enumerate(PICKERS):
        if await db[C.pickers].find_one({"name": name}):
            continue
        await db[C.pickers].insert_one(
            {
                "id": new_id(),
                "name": name,
                "kind": kind,
                "symbol_concept": symbol,
                "options": [{"id": new_id(), "label": t, "symbol_concept": s} for t, s in options],
                "rules": {
                    "no_immediate_repeat": True,
                    "avoid_recent": 2,
                    "excluded_ids": [],
                    "show_photos": kind == "pupil",
                },
                "order": order,
                "enabled": True,
                "is_sample": True,
            }
        )

    # ---------------- sparks ---------------- #
    for order, (title, area, points, symbol) in enumerate(SPARK_RULES):
        if await db[C.spark_rules].find_one({"title": title}):
            continue
        await db[C.spark_rules].insert_one(
            {
                "id": new_id(),
                "title": title,
                "area": area,
                "points": points,
                "symbol_concept": symbol,
                "order": order,
                "enabled": True,
                "is_sample": True,
            }
        )
    for order, (title, symbol, threshold, area) in enumerate(BADGES):
        if await db[C.badges].find_one({"title": title}):
            continue
        await db[C.badges].insert_one(
            {
                "id": new_id(),
                "title": title,
                "symbol_concept": symbol,
                "threshold": threshold,
                "area": area,
                "order": order,
                "enabled": True,
                "is_sample": True,
            }
        )
    if not await db[C.class_goals].find_one({}):
        await db[C.class_goals].insert_one(
            {
                "id": new_id(),
                "title": "Class goal: 50 Sparks",
                "target": 50,
                "reward": "Choose a class activity",
                "period": "half_term",
                "symbol_concept": "system.spark",
                "enabled": True,
                "is_sample": True,
            }
        )

    # ---------------- blanks + interaction ---------------- #
    for order, (level, text) in enumerate(BLANKS_PROMPTS):
        if await db[C.blanks_prompts].find_one({"text": text, "level": level}):
            continue
        await db[C.blanks_prompts].insert_one(
            {
                "id": new_id(),
                "level": level,
                "text": text,
                "order": order,
                "enabled": True,
                "is_sample": True,
            }
        )
    for order, (title, symbol, prompts) in enumerate(INTERACTION_AREAS):
        if await db[C.interaction_areas].find_one({"title": title}):
            continue
        await db[C.interaction_areas].insert_one(
            {
                "id": new_id(),
                "title": title,
                "symbol_concept": symbol,
                "prompts": prompts,
                "order": order,
                "enabled": True,
                "is_sample": True,
            }
        )

    # ---------------- projects ---------------- #
    for title, symbol, skills, steps in PROJECTS:
        if await db[C.projects].find_one({"title": title}):
            continue
        await db[C.projects].insert_one(
            {
                "id": new_id(),
                "title": title,
                "description": "Sample project - edit or delete freely.",
                "symbol_concept": symbol,
                "pupil_ids": pupil_ids[:3],
                "skills": skills,
                "steps": [{"id": new_id(), "title": s, "done": False} for s in steps],
                "evidence": [],
                "status": "active",
                "is_sample": True,
                "created_at": utcnow_iso(),
            }
        )

    # ---------------- targets ---------------- #
    for pid in pupil_ids[:4]:
        if await db[C.targets].find_one({"pupil_id": pid}):
            continue
        await db[C.targets].insert_one(
            {
                "id": new_id(),
                "pupil_id": pid,
                "area": "Communication",
                "text": "Ask for help using my symbol",
                "status": "active",
                "is_sample": True,
                "created_at": utcnow_iso(),
            }
        )

    # ---------------- settings ---------------- #
    existing_settings = await db[C.settings].find_one({"id": "global"})
    if not existing_settings:
        await db[C.settings].insert_one(
            {
                "id": "global",
                "classroom_name": "Western Park DSP",
                "school_name": "Braunstone Frith Primary Academy",
                "sample_data": True,
                "appearance": {
                    "density": "comfortable",
                    "animation": "subtle",
                    "show_photos": True,
                    "high_contrast": False,
                    "font_scale": 1.0,
                    "show_symbol_labels": True,
                },
                "gamification": {
                    "enabled": True,
                    "currency_name": "Sparks",
                    "show_on_today": True,
                    "reset_period": "half_term",
                },
                "features": {
                    "morning_meeting": True,
                    "communication": True,
                    "interaction": True,
                    "regulation": True,
                    "prepare_me": True,
                    "jobs": True,
                    "pickers": True,
                    "observations": True,
                    "projects": True,
                    "mainstream_bridge": True,
                    "classdojo_integration": False,
                },
                "pupil_facing": {
                    "show_timetable": True,
                    "show_communication": True,
                    "show_regulation": True,
                    "show_sparks": True,
                },
                "updated_at": utcnow_iso(),
            }
        )

    await db[C.seed_meta].update_one(
        {"id": "seed"},
        {"$set": {"id": "seed", "version": SEED_VERSION, "at": utcnow_iso()}},
        upsert=True,
    )
    return {"seeded": True, "symbols": symbol_count, "pupils": len(pupil_ids)}
