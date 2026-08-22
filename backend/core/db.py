"""MongoDB access."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[os.environ.get("DB_NAME", "western_park")]


def close_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


# --- collection names (single source of truth) ------------------------------ #
class C:
    users = "users"
    roles = "roles"
    pupils = "pupils"
    pupil_media = "pupil_media"
    pupil_profiles = "pupil_profiles"
    profile_sections = "profile_sections"
    groups = "groups"
    symbols = "symbols"
    activities = "timetable_activities"
    templates = "timetable_templates"
    daily = "daily_timetables"
    adaptations = "pupil_timetable_adaptations"
    pupil_view = "pupil_view_settings"
    mm_templates = "morning_meeting_templates"
    mm_runs = "morning_meeting_runs"
    comm_categories = "comm_categories"
    comm_options = "comm_options"
    comm_log = "comm_log"
    zones = "regulation_zones"
    strategies = "regulation_strategies"
    pupil_supports = "pupil_regulation_supports"
    regulation_log = "regulation_log"
    prepare_templates = "prepare_me_templates"
    prepare_stories = "prepare_me_stories"
    jobs = "jobs"
    job_assignments = "job_assignments"
    pickers = "pickers"
    picker_history = "picker_history"
    spark_rules = "spark_rules"
    spark_events = "spark_events"
    badges = "badges"
    class_goals = "class_goals"
    observations = "observations"
    targets = "targets"
    projects = "projects"
    blanks_prompts = "blanks_prompts"
    interaction_areas = "interaction_areas"
    settings = "settings"
    audit = "audit_events"
    seed_meta = "seed_meta"
