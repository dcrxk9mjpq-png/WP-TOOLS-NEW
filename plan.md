# Western Park Classroom Platform — build plan (living document)

## Status
- **Phase 1 — Core POC: COMPLETE ✅** (`/app/test_core.py`, 67/67 checks passing)
- **Phase 2 — First Build Deliverable (spec §34): IN PROGRESS**
- Phase 3+ — expansion: not started

---

## What Phase 1 proved (do not regress these)
1. **Canonical Symbol System** — 178 symbols. 70 are the school's OWN Widgit symbols,
   individually cropped out of the supplied *Morning Meeting / Crew Time* PowerPoint
   (`/app/backend/tools/build_symbol_assets.py` → `/app/backend/assets/symbols/`).
   108 are ARASAAC (CC BY-NC-SA) gap-fill for concepts the deck does not cover.
2. One concept → exactly one symbol. Screens ask for a `conceptKey`; they never pick artwork.
   Replacing a symbol once changes it everywhere; it can be reset or re-assigned.
3. Email+password auth with **configurable roles** (7 seeded, all editable, new roles creatable).
   Read-only roles, pupil-scoped visibility, and a separate **Pupil-facing mode**.
4. **Four separated layers** verified by test:
   - CLASSROOM CONFIGURATION (activity library, templates) is untouched by day edits
   - DAILY CLASSROOM CONTENT is per-date and independent (Mon ≠ Tue ≠ special event)
   - INDIVIDUAL PUPIL CONFIGURATION (support sequences, visibility) never alters the class day
5. Timetable mechanics: NOW / NEXT / LATER derived automatically, advance, insert, duplicate,
   reorder, delete, reset, save-day-as-new-template.

### Deck facts to preserve
- The routine is called **CREW Time**: Greeting and Check In → Expectations → Calendar →
  Weather → Timetable → Movement → Calming.
- Expectations: **Be Kind** (say kind words / focus on yourself / use an inside voice),
  **Work Hard** (complete the tasks / listen to the teachers / try your best),
  **Be Responsible** (stay in your seat / walk inside / raise your hand).
- Zones of Regulation (Blue / Green / Yellow / Red) + "When I feel annoyed" strategy cards.
- Calendar: Day / Date / Month / Year, weekday + month cards. Weather: "How's the weather today?"

---

## Phase 2 — First Build Deliverable (spec §34)

### Backend (FastAPI + MongoDB, `/api` prefix)
Done: `core/` (db, util, security, permissions), `routers/auth.py`, `routers/symbols.py`,
`routers/timetable.py`, `seed.py` (full sample data for every module).

Still to add as routers:
- `pupils.py` — pupils, avatars, access-controlled photo upload/serve, groups, profiles, targets
- `morning_meeting.py` — configurable component sequence + run state + check-ins + weather
- `communication.py` — categories/options CRUD, reorder, usage log
- `regulation.py` — zones, strategies, per-pupil supports, regulation log
- `prepare_me.py` — templates (sections/wording) + individual stories
- `jobs.py` — jobs CRUD/reorder, assignment, rotate, random, reset
- `pickers.py` — picker CRUD, spin with no-immediate-repeat, history, reset
- `observations.py` — quick observation create/list + progress patterns
- `sparks.py` — rules, events, badges, class goal, leaderboard-free totals
- `projects.py` — Project Spark
- `interaction.py` — interaction areas + Blank's Levels prompts/records
- `settings.py` — global settings, appearance, features, expectations, profile sections
- `today.py` — single uncluttered payload for the Today screen
- `mainstream.py` — permission-limited concise support summary

### Frontend (React + Tailwind + shadcn/ui, Project Spark identity)
- Global `Symbol` component that renders ONLY from a `conceptKey` (enforces the Consistency Rule)
- Staff shell (sidebar + header) and Pupil-facing shell (large tab bar, low distraction)
- Screens: Today, Timetable, Morning Meeting, Communication, Interaction, Regulation,
  Prepare Me, Jobs, Pickers, Pupils + Profile, Quick Observation, Progress, Sparks,
  Project Spark, Mainstream Bridge, Settings (incl. Symbol Library), Sign in
- Sample-data banner + `Sample` badges; reduce-motion + density + font-scale settings

### User stories to satisfy (test these)
1. As a teacher at 08:30 I can load a template, rename an activity and add a movement break — without changing the template.
2. As a teacher I can run Morning Meeting through the CREW Time sequence, skip a component and reorder it live.
3. As a pupil-facing display I see only NOW / NEXT with the same symbols and nothing sensitive.
4. As staff I can tap a communication card and hear it spoken aloud.
5. As staff I can record a quick observation in under 15 seconds.
6. As an administrator I can rename/delete any job, picker, communication choice or Spark rule.
7. As an administrator I can replace one symbol and see it change on every screen.
8. As a teacher I can prepare a pupil for an assembly with a Prepare Me story.
9. As a teacher I can pick a random child with no immediate repeat, using avatars not photos.
10. As a leader I can see progress patterns without any behaviour score.

**Phase 2 ends with `testing_agent_v3` end-to-end testing.**

---

## Phase 3 — Expansion (after V1 sign-off)
1. Blank's Levels recording inside observations + planning
2. Evidence & Progress pattern views (reduced prompting, increased independence)
3. Project Spark portfolio/evidence media
4. Mainstream Bridge print/share view
5. Roles editor UI + audit log viewer
6. Separated (inert) integration layer placeholder for a future official ClassDojo API

## Non-negotiables
- No hard-coded classroom content. Everything seeded is `is_sample: true` and editable.
- One concept, one symbol, everywhere. Never substitute artwork on a screen.
- Reuse established components; do not redesign the same function twice.
- Data minimisation; pupil photos are access-controlled and off by default per context.
- Prototype only — sample data must stay clearly labelled.
