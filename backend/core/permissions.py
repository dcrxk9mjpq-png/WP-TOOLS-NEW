"""Role / permission model.

Permissions are plain strings so an administrator can compose new roles from
Settings without any code change. ``*`` grants everything.
"""
from __future__ import annotations

PERMISSIONS: list[dict] = [
    {"key": "pupil.view", "label": "View pupils", "group": "Pupils"},
    {"key": "pupil.edit", "label": "Add / edit pupils", "group": "Pupils"},
    {"key": "pupil.photo.view", "label": "View pupil photographs", "group": "Pupils"},
    {"key": "pupil.profile.view", "label": "View pupil profiles", "group": "Pupils"},
    {"key": "pupil.profile.edit", "label": "Edit pupil profiles", "group": "Pupils"},
    {"key": "timetable.view", "label": "View timetable", "group": "Classroom day"},
    {"key": "timetable.edit", "label": "Edit today's timetable", "group": "Classroom day"},
    {"key": "template.edit", "label": "Edit timetable templates", "group": "Classroom day"},
    {"key": "morning_meeting.run", "label": "Run Morning Meeting", "group": "Classroom day"},
    {"key": "morning_meeting.edit", "label": "Configure Morning Meeting", "group": "Classroom day"},
    {"key": "comm.view", "label": "Use Communication Centre", "group": "Communication"},
    {"key": "comm.edit", "label": "Configure communication choices", "group": "Communication"},
    {"key": "interaction.view", "label": "Use Interaction Centre", "group": "Communication"},
    {"key": "interaction.edit", "label": "Configure interaction areas", "group": "Communication"},
    {"key": "regulation.view", "label": "Use Regulation Centre", "group": "Regulation"},
    {"key": "regulation.edit", "label": "Configure regulation supports", "group": "Regulation"},
    {"key": "brain_breaks.view", "label": "Run Brain Breaks", "group": "Regulation"},
    {"key": "brain_breaks.edit", "label": "Configure Brain Breaks", "group": "Regulation"},
    {"key": "watch.view", "label": "Play classroom videos", "group": "Regulation"},
    {"key": "watch.edit", "label": "Manage the video library", "group": "Regulation"},
    {"key": "jobs.view", "label": "View classroom jobs", "group": "Classroom"},
    {"key": "jobs.edit", "label": "Configure / assign jobs", "group": "Classroom"},
    {"key": "pickers.use", "label": "Use random pickers", "group": "Classroom"},
    {"key": "pickers.edit", "label": "Configure random pickers", "group": "Classroom"},
    {"key": "observation.create", "label": "Record observations", "group": "Evidence"},
    {"key": "observation.view", "label": "View observations & progress", "group": "Evidence"},
    {"key": "sparks.award", "label": "Award Sparks", "group": "Recognition"},
    {"key": "sparks.edit", "label": "Configure Sparks", "group": "Recognition"},
    {"key": "prepare_me.view", "label": "View Prepare Me stories", "group": "Preparation"},
    {"key": "prepare_me.edit", "label": "Create / edit Prepare Me", "group": "Preparation"},
    {"key": "projects.view", "label": "View Project Spark", "group": "Project Spark"},
    {"key": "projects.edit", "label": "Edit Project Spark", "group": "Project Spark"},
    {"key": "mainstream.view", "label": "View Mainstream Bridge summary", "group": "Sharing"},
    {"key": "symbols.edit", "label": "Manage the Symbol Library", "group": "Administration"},
    {"key": "settings.edit", "label": "Change classroom settings", "group": "Administration"},
    {"key": "roles.edit", "label": "Manage roles & permissions", "group": "Administration"},
    {"key": "users.edit", "label": "Manage staff accounts", "group": "Administration"},
    {"key": "pupil_facing.mode", "label": "Use pupil-facing mode", "group": "Access modes"},
]

PERMISSION_KEYS = [p["key"] for p in PERMISSIONS]

VIEW_ONLY = [
    "pupil.view",
    "pupil.profile.view",
    "timetable.view",
    "comm.view",
    "interaction.view",
    "regulation.view",
    "brain_breaks.view",
    "watch.view",
    "jobs.view",
    "observation.view",
    "prepare_me.view",
    "projects.view",
    "mainstream.view",
]

# Seed roles. Every one of these is editable by an administrator.
DEFAULT_ROLES: list[dict] = [
    {
        "name": "Classroom Administrator",
        "description": "Full control of classroom configuration, staff and pupil records.",
        "permissions": ["*"],
        "visibility_scope": "all_pupils",
        "is_system": True,
    },
    {
        "name": "Teacher",
        "description": "Runs the classroom day and edits classroom content.",
        "permissions": [
            k
            for k in PERMISSION_KEYS
            if k not in {"roles.edit", "users.edit"}
        ],
        "visibility_scope": "all_pupils",
        "is_system": False,
    },
    {
        "name": "Teaching Assistant",
        "description": "Supports pupils, records observations, uses classroom tools.",
        "permissions": [
            "pupil.view",
            "pupil.photo.view",
            "pupil.profile.view",
            "timetable.view",
            "timetable.edit",
            "morning_meeting.run",
            "comm.view",
            "interaction.view",
            "regulation.view",
            "brain_breaks.view",
            "watch.view",
            "jobs.view",
            "jobs.edit",
            "pickers.use",
            "observation.create",
            "observation.view",
            "sparks.award",
            "prepare_me.view",
            "projects.view",
            "pupil_facing.mode",
        ],
        "visibility_scope": "assigned_pupils",
        "is_system": False,
    },
    {
        "name": "Specialist Staff",
        "description": "Speech, language and specialist support staff.",
        "permissions": [
            "pupil.view",
            "pupil.profile.view",
            "pupil.profile.edit",
            "timetable.view",
            "comm.view",
            "comm.edit",
            "interaction.view",
            "interaction.edit",
            "regulation.view",
            "regulation.edit",
            "brain_breaks.view",
            "brain_breaks.edit",
            "watch.view",
            "watch.edit",
            "observation.create",
            "observation.view",
            "prepare_me.view",
            "prepare_me.edit",
        ],
        "visibility_scope": "assigned_pupils",
        "is_system": False,
    },
    {
        "name": "Senior Leader",
        "description": "Read-only oversight of provision and progress.",
        "permissions": VIEW_ONLY,
        "visibility_scope": "all_pupils",
        "is_system": False,
        "read_only": True,
    },
    {
        "name": "Mainstream Staff",
        "description": "Sees only the concise Mainstream Bridge support summary.",
        "permissions": ["mainstream.view", "pupil.view"],
        "visibility_scope": "assigned_pupils",
        "is_system": False,
        "read_only": True,
    },
    {
        "name": "Pupil-facing mode",
        "description": "Low-distraction classroom display. No access to pupil records.",
        "permissions": ["pupil_facing.mode", "timetable.view", "comm.view", "regulation.view", "brain_breaks.view", "watch.view"],
        "visibility_scope": "none",
        "is_system": True,
    },
]


def has_permission(role: dict | None, permission: str) -> bool:
    if not role:
        return False
    perms = role.get("permissions") or []
    return "*" in perms or permission in perms
