# Frith Classroom — build plan (living document)

## Status
- **Phase 1 — Core POC: COMPLETE ✅** (`/app/test_core.py`, 67/67 checks passing)
- **Phase 2 — First Build Deliverable (spec §34): IN PROGRESS**
  - Backend routers: already implemented ✅ (auth, symbols, timetable, pupils, morning_meeting, communication, interaction, regulation, prepare_me, jobs/pickers, observations/sparks, projects, mainstream, today, settings)
  - Canonical symbols: extracted + served ✅ (178 canonical set)
  - **Completed in this continuation session (major)**
    - ElevenLabs TTS: **implemented end-to-end** ✅
      - Backend: `core/tts.py`, `routers/tts.py`, `.env` config, disk cache in `backend/assets/tts` (gitignored)
      - Curated UK voices (key is TTS-only; cannot list voices/quota)
      - Frontend: `lib/speech.js` (server TTS → device fallback), `SpeakButton` components
    - Timetable NOW/NEXT/LATER: **clock-derived logic implemented** ✅
      - Backend: `core/dayclock.py`, London timezone (`Europe/London`) in `core/util.py`
      - Timetable router `_decorate()` and `/api/today` now use derivation; manual override still wins
    - Brain Breaks: **backend + staff UI implemented** ✅
      - Backend: `routers/brain_breaks.py` with guided + video support
      - Seed: 5 guided breaks
      - Frontend: `components/BrainBreakRunner.js`, `pages/BrainBreaks.js`
    - Branding + UI foundations: **implemented** ✅
      - Tokens + typography rewritten in `frontend/src/index.css`
      - Tailwind/shadcn theme rewritten in `frontend/tailwind.config.js`
      - Shared component vocabulary restyled in `frontend/src/components/common.js`
      - StaffShell + PupilShell rewritten
      - Sign-in page rebranded to **Frith Classroom** + school identity
  - **Phase 2 still needs consolidation**
    - Wire SpeakButton consistently across Communication / Morning Meeting / Regulation / Pupil screens (some screens still not updated)
    - Finish “Brain Breaks” pupil-facing entry point + ensure it’s discoverable from Today
    - Ensure Settings UI exposes TTS voice selection and pupil theme selection

---

## What Phase 1 proved (do not regress these)
1. **Canonical Symbol System** — 178 symbols.
   - 70 are the school’s own Widgit symbols cropped from the supplied PowerPoint.
   - 108 are ARASAAC (CC BY‑NC‑SA) gap-fill.
2. One concept → exactly one symbol. Screens request `conceptKey`; they never choose artwork.
3. Email+password auth with **configurable roles** and a separate **Pupil-facing mode**.
4. **Four separated layers** verified by test:
   - SYSTEM STRUCTURE (code)
   - CLASSROOM CONFIGURATION
   - DAILY CLASSROOM CONTENT
   - INDIVIDUAL PUPIL CONFIGURATION
5. Timetable mechanics: NOW / NEXT / LATER workflow, advance, insert, duplicate, reorder, delete, reset.

### Deck facts to preserve
- Routine name: **CREW Time**: Greeting and Check In → Expectations → Calendar → Weather → Timetable → Movement → Calming.
- Expectations:
  - **Be Kind** (say kind words / focus on yourself / use an inside voice)
  - **Work Hard** (complete the tasks / listen to the teachers / try your best)
  - **Be Responsible** (stay in your seat / walk inside / raise your hand)
- Zones of Regulation: Blue / Green / Yellow / Red + “When I feel annoyed” strategy cards.
- Calendar: Day / Date / Month / Year, weekday + month cards. Weather prompt preserved.

---

## Phase 2 — First Build Deliverable (spec §34) (UPDATED)

### Branding & identity (P0)
- App/product name: **Frith Classroom** (from Old English *friþ* = peace/sanctuary; also in the school name).
- School identity text (replace mascot/smiley): **“Braunstone Frith Primary School, Leicester”**.
- Demo staff display name: **“Ashley Gert”** (replace “Sam”).
- Logo mark: hand-written SVG (no image assets): soft squircle containing 3 stacked rounded bars (Now/Next/Later), top bar highlighted.

### Backend (FastAPI + MongoDB, `/api` prefix)
Already done ✅: `core/` (db, util, security, permissions), routers, seed.

#### P0 — ElevenLabs TTS integration (COMPLETE ✅)
Goal: natural British English speech for Communication, Morning Meeting, Now/Next/Later, Brain Break runner, etc.

Constraints confirmed:
- API key is **restricted**: TTS works, but `voices_read` and `user_read` return 401 → **no dynamic voice listing** and **no quota/subscription screen**.

Implemented:
1. **Secrets & config**
   - `ELEVENLABS_API_KEY` in `/app/backend/.env`.
   - `TTS_CACHE_DIR=/app/backend/assets/tts` (gitignored).
2. **TTS module**: `/app/backend/core/tts.py`
   - Normalises text, caps length, disk cache by sha256(model|voice|text)
   - Safe failure mode: raises `TTSUnavailable` so frontend can fall back
3. **API**: `/app/backend/routers/tts.py`
   - `GET /api/tts/status` (frontend capability + curated voices/models)
   - `POST /api/tts/speak` → `audio/mpeg` with cache headers
   - Cache admin endpoints for settings admins
4. **Curated UK voices (verified live)**
   - Lily `pFZP5JQG7iQjIQuC4Bku` (female warm, default)
   - Alice `Xb7hH8MSUJpSbSDYk0k2` (female clear)
   - George `JBFqnCBsd6RMkjVDRZzb` (male warm)
   - Daniel `onwK4e9ZLuTAKqWW03F9` (male calm)
5. **Settings storage**
   - Global settings seeded now include `tts: { enabled, voice, model_id, autoplay_now_next }`
   - Pupil model supports `pupil.tts: { enabled, voice }` (backend accepts it)

Remaining work (P0):
- Build the staff Settings UI for:
  - class default voice/model
  - per-pupil voice
  - a “Preview voice” button

---

### Frontend (React + Tailwind + shadcn/ui)
Already done ✅: 18 screens, StaffShell + PupilShell, symbol renderer.

#### P0 — Complete UI/Visual overhaul (IN PROGRESS, foundations done ✅)
Objective: look “finished”, professional, school-appropriate; child mode playful but calm.

Non-negotiables:
- **No purple**.
- No decorative animations/gradients; respect `data-animation` + prefers-reduced-motion.
- Accessibility controls must affect every screen: density, contrast, font scale.

Implemented:
1. **Tokens & typography**
   - `/app/frontend/src/index.css` rewritten:
     - Staff: muted green accent, restrained red.
     - Display font: **Montserrat**; Body: **Figtree**; Pupil: **Fredoka**.
     - `data-mode="staff|pupil"` and `data-pupil-theme="pastel|bold"`.
2. **Shared component vocabulary**
   - `/app/frontend/src/components/common.js` rewritten to propagate the new look.
3. **Shells**
   - `/app/frontend/src/components/Shell.js` and `/app/frontend/src/components/PupilShell.js` rewritten.
4. **Brand components**
   - `/app/frontend/src/components/Brand.js` with SVG logo + school identity.
5. **Symbol presentation**
   - `/app/frontend/src/components/Symbol.js` now uses symbol “plates” for Widgit line art.
6. **Toasts**
   - Sonner palette mapped to platform tokens.

Remaining work (P0):
- Produce screenshots for **both** pupil themes (“pastel” and “bold”) and let the user choose.
- Systematically sweep remaining pages for any lingering pre-overhaul styling.

---

## Phase 3 — Logic & QA fixes (P1 → some already completed)

### Timetable “Happening Now” logic (clock-derived) (COMPLETE ✅)
Required behaviour:
- Derive NOW/NEXT from clock using **Europe/London** timezone.
- Preserve manual overrides.

Implemented:
- Backend:
  - `core/util.py` now defines `SCHOOL_TZ = Europe/London`, `today_iso()` uses school date.
  - `core/dayclock.py` derives NOW/NEXT/LATER with `now_source` (clock/staff/none).
  - `routers/timetable.py` `_decorate()` and advance/follow-clock endpoints updated.
  - `routers/platform.py` `/api/today` uses derivation.

Frontend remaining check (P1):
- Confirm Today/Timetable screens show `now_source` appropriately and don’t reintroduce UTC date bugs.

### Morning Meeting initialisation bug (P1)
- Still pending.
- Fix state initialisation and `data-testid` naming issues flagged by `testing_agent_v3`.

### Accessibility enforcement (P1)
- Audit all pages for:
  - font scale multiplier affecting layout
  - density affecting spacing
  - high contrast increasing borders/text contrast
  - `data-animation="none"` removing motion

### Pupil-facing simplification (P1)
- Ensure pupil screens are:
  - large targets (≥80px), minimal text, consistent symbol framing
  - no staff-only content, no editing, no cognitive overload

---

## Phase 4 — Brain Breaks + Watch (Mindfulness / Movement / Videos) (P1)

User choice confirmed earlier: **Both** built-ins + staff-managed video link library.

### NEW user request (verbatim intent)
1. Add a tab/button on the main page with the day’s selection of children’s videos (BBC or YouTube) for **transition periods**.
2. **Alphablocks** and **Numberblocks** must be included.
3. Morning routine starts with a **Morning Song** that is linked in the uploaded PowerPoint.
4. Later: Morning Meeting must reproduce the full PPT slide order + integrate “Makaton Sign of the Week” (user wants planning discussion first).

### Extracted from uploaded PPTX (facts now known)
The three YouTube links embedded in `/app/backend/assets/source/morning_meeting.pptx` are:
- Slide 1: **Good Morning Song — The Kiboomers** (Morning song) → `TFVjU-dsIM8`
- Slide 30: Movement break → `8v1Xb186kH8`
- Slide 32: Calming break → `PWJAmyhxmVc`
(All verified live via YouTube oEmbed.)

Verified official learning channels/playlists:
- Alphablocks uploads playlist: `UU_qs3c0ehDvZkbiEbOj6Drg`
- Numberblocks uploads playlist: `UUPlwvN0w4qFSP1FllALB92w`
- Verified example videos:
  - Numberblocks “The Number One” `7APNVVdrx5M`
  - Alphablocks & Numberblocks “First Meet” `JDOVK-oyu6M`

### Revised architecture decision (P1): one place for all video content = **Watch**
To avoid two competing video libraries (Brain Breaks vs elsewhere), we will introduce **Watch** as the single management + playback surface for all classroom videos.

**Design decision:**
- **Watch** at:
  - Backend: `/api/watch` (NEW)
  - Staff: `/watch` (NEW)
  - Pupil: `/pupil/watch` (NEW)
- Content types (`kind`):
  - `video` (YouTube/Vimeo URL)
  - `playlist` (YouTube playlist)
  - `channel` (opens externally; cannot embed cleanly)
- Collections/tags (`collection`):
  - `morning_song`, `learning`, `movement`, `calm`, `story`, `other`
- `featured` flag:
  - “On today’s board” → surfaced on Today + Pupil Watch
- Embedding rules:
  - Use `youtube-nocookie.com` embeds
  - `rel=0`, `modestbranding=1`, `playsinline=1`
  - If cannot embed: open in a new tab with a clear message

**Implications:**
- **Brain Breaks becomes guided-only** (platform-narrated, animated, offline-friendly).
- The Brain Breaks staff page will:
  - remove the “Videos” tab
  - include a clear button “Manage videos in Watch” linking to `/watch`

### Deliverables (P1)
1. **Watch (videos) — staff-managed library**
   - CRUD: title, url, kind, collection, duration_seconds, enabled, featured
   - Seed with:
     - Morning song from PPT (`TFVjU-dsIM8`) in `morning_song` collection, featured
     - Alphablocks + Numberblocks items (at least a couple single videos + optional playlist entries)
2. **Today surface**
   - Add a “Watch” button/tile on Today (staff) and on pupil home (Now)
   - Add a “Today’s videos” row showing featured items
3. **Pupil Watch**
   - Large clay tiles, minimal text, one-tap play
   - Full-screen player with stop/close

### BBC content note (must confirm before building)
BBC iPlayer embedding often requires authentication/region constraints; we can support BBC links as **external links** (open in a new tab) but cannot guarantee in-app embedding.

---

## Phase 5 — Morning Meeting: full PPT parity + Makaton (DEFERRED; plan with user first)
User request: the Morning Meeting tab must reproduce **all 34 PPT slides**, in **the same order**, including:
- embedded links
- links to the Makaton website and auto-pull “Sign of the Week”

This is a large piece of work and the user explicitly said: “We can lay this out properly when you are ready.”

Before building, ask and confirm:
- Which Makaton source is approved for “Sign of the Week” (official endpoint / page)?
- Whether you want:
  - a weekly cached screenshot + link, or
  - a direct embed/webview (often blocked), or
  - a staff-curated link entry in Watch

---

## Return to the user’s earlier “FINAL POLISH & QA” 17-point checklist (P1/P0 mix)
After Voice + UI overhaul consolidation + Watch + core logic + Brain Breaks are in place, revisit the original checklist and adjust it to incorporate:
- ElevenLabs voice pipeline
- Two-mode design system + pupil theme selection
- School branding + demo identity updates
- Watch video library + morning song

---

## Testing & sign-off gates
- Backend tests:
  - Add integration tests for:
    - `/api/tts/speak` (success + cache-hit + missing key → 503)
    - `/api/watch` CRUD and embed parsing
    - `/api/today` includes `now_source` and correct date handling
- Frontend verification:
  - Screenshot comparisons:
    - Sign-in (brand)
    - Staff shell + Today (new Now card + Watch surface)
    - Communication board (SpeakButton states)
    - Pupil mode (Now / Talk / Feel / Watch) in **pastel** and **bold** pupil themes
  - Manual flow using seeded credentials
- Phase 2 ends with `testing_agent_v3` end-to-end regression testing.

---

## Non-negotiables
- No hard-coded classroom content. Everything seeded is `is_sample: true` and editable.
- One concept, one symbol, everywhere. Never substitute artwork on a screen.
- Respect separation: Staff configuration/management vs Pupil-facing low distraction.
- No corner-cutting:
  - TTS uses server-side caching.
  - UI overhaul done via tokens + shared components (clean, consistent).
  - Accessibility settings demonstrably affect all screens.
- Prototype only — sample data must remain clearly labelled.
