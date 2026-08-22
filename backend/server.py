"""Western Park Classroom Platform - API.

A configurable digital classroom environment for the Western Park Designated
Specialist Provision. Architecture follows four separate layers:

  SYSTEM STRUCTURE            permanent application functionality (this code)
  CLASSROOM CONFIGURATION     settings the classroom administrator controls
  DAILY CLASSROOM CONTENT     what is happening today
  INDIVIDUAL PUPIL CONFIG     what an individual pupil requires
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from core.db import close_client, get_db  # noqa: E402
from routers import auth as auth_router  # noqa: E402
from routers import communication as communication_router  # noqa: E402
from routers import jobs as jobs_module  # noqa: E402
from routers import morning_meeting as mm_router  # noqa: E402
from routers import observations as observations_module  # noqa: E402
from routers import platform as platform_module  # noqa: E402
from routers import prepare_me as prepare_router  # noqa: E402
from routers import pupils as pupils_router  # noqa: E402
from routers import regulation as regulation_router  # noqa: E402
from routers import symbols as symbols_router  # noqa: E402
from routers import timetable as timetable_router  # noqa: E402
from seed import seed_all  # noqa: E402

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("western_park")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        result = await seed_all()
        logger.info("seed: %s", result)
    except Exception as exc:  # noqa: BLE001
        logger.exception("seed failed: %s", exc)
    yield
    close_client()


app = FastAPI(title="Western Park Classroom Platform", lifespan=lifespan)

api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"service": "Western Park Classroom Platform", "status": "ok"}


@api.get("/health")
async def health():
    db = get_db()
    symbols = await db["symbols"].count_documents({})
    return {"status": "ok", "symbols": symbols}


api.include_router(auth_router.router)
api.include_router(symbols_router.router)
api.include_router(timetable_router.router)
api.include_router(pupils_router.router)
api.include_router(mm_router.router)
api.include_router(communication_router.router)
api.include_router(communication_router.interaction_router)
api.include_router(regulation_router.router)
api.include_router(prepare_router.router)
api.include_router(jobs_module.jobs_router)
api.include_router(jobs_module.pickers_router)
api.include_router(observations_module.obs_router)
api.include_router(observations_module.sparks_router)
api.include_router(platform_module.projects_router)
api.include_router(platform_module.mainstream_router)
api.include_router(platform_module.today_router)
api.include_router(platform_module.settings_router)

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
