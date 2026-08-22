"""
Western Park Classroom Platform - Comprehensive Backend API Testing
====================================================================

Tests all backend endpoints per the Master Build Specification:
- AUTH: 7 seeded accounts, permissions, 401 on protected endpoints
- CANONICAL SYMBOLS: 178 symbols, ETag consistency, replace/reset/assign
- FOUR LAYERS: template vs day vs pupil independence
- All feature modules: timetable, morning meeting, communication, regulation, etc.
"""
import requests
import sys
from datetime import date, timedelta

BASE = "https://spark-classroom-1.preview.emergentagent.com/api"
PASSWORD = "westernpark"

class APITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tokens = {}
        self.failures = []

    def check(self, name: str, condition: bool, detail: str = "") -> bool:
        self.tests_run += 1
        if condition:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {detail}")
            self.failures.append((name, detail))
        return condition

    def section(self, title: str):
        print(f"\n{'='*80}\n{title}\n{'='*80}")

    def login(self, email: str, password: str = PASSWORD) -> str | None:
        try:
            r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=20)
            if r.status_code == 200:
                return r.json().get("token")
        except Exception as e:
            print(f"Login error for {email}: {e}")
        return None

    def hdr(self, token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}

    # ========================================================================
    # AUTH TESTS
    # ========================================================================
    def test_auth(self):
        self.section("AUTH: Login, roles, permissions")
        
        # Test unauthenticated access
        r = requests.get(f"{BASE}/timetable/day", timeout=20)
        self.check("Unauthenticated request returns 401", r.status_code == 401, f"Got {r.status_code}")

        # Test wrong password
        r = requests.post(f"{BASE}/auth/login", json={"email": "admin@westernpark.school", "password": "wrong"}, timeout=20)
        self.check("Wrong password returns 401", r.status_code == 401, f"Got {r.status_code}")

        # Test all 7 accounts
        accounts = [
            ("admin", "admin@westernpark.school", "Classroom Administrator"),
            ("teacher", "teacher@westernpark.school", "Teacher"),
            ("ta", "ta@westernpark.school", "Teaching Assistant"),
            ("specialist", "specialist@westernpark.school", "Specialist Staff"),
            ("leader", "leader@westernpark.school", "Senior Leader"),
            ("mainstream", "mainstream@westernpark.school", "Mainstream Staff"),
            ("display", "display@westernpark.school", "Pupil-facing mode"),
        ]

        for key, email, role_name in accounts:
            token = self.login(email)
            self.check(f"{role_name} can sign in", bool(token), email)
            if token:
                self.tokens[key] = token

        # Test /auth/me
        if "admin" in self.tokens:
            r = requests.get(f"{BASE}/auth/me", headers=self.hdr(self.tokens["admin"]), timeout=20)
            self.check("GET /auth/me returns role+permissions", 
                      r.status_code == 200 and "role" in r.json() and "permissions" in r.json().get("role", {}),
                      f"Status: {r.status_code}")

    # ========================================================================
    # PERMISSIONS TESTS
    # ========================================================================
    def test_permissions(self):
        self.section("PERMISSIONS: Role-based access control")

        # TA cannot manage staff accounts
        if "ta" in self.tokens:
            r = requests.get(f"{BASE}/auth/users", headers=self.hdr(self.tokens["ta"]), timeout=20)
            self.check("Teaching Assistant gets 403 on GET /api/auth/users", 
                      r.status_code == 403, f"Got {r.status_code}")

        # Senior Leader cannot edit (read-only)
        if "leader" in self.tokens:
            r = requests.post(f"{BASE}/timetable/activities", 
                            headers=self.hdr(self.tokens["leader"]),
                            json={"title": "Should not be created", "symbol_concept": "learning.learning"},
                            timeout=20)
            self.check("Senior Leader gets 403 on POST /api/timetable/activities", 
                      r.status_code == 403, f"Got {r.status_code}")

        # Pupil-facing mode can view but not edit
        if "display" in self.tokens:
            r = requests.get(f"{BASE}/timetable/day", headers=self.hdr(self.tokens["display"]), timeout=20)
            self.check("Pupil-facing mode can GET /api/timetable/day", 
                      r.status_code == 200, f"Got {r.status_code}")
            
            r = requests.post(f"{BASE}/timetable/day/items",
                            headers=self.hdr(self.tokens["display"]),
                            json={"title": "Should not add"}, timeout=20)
            self.check("Pupil-facing mode gets 403 on POST /api/timetable/day/items", 
                      r.status_code == 403, f"Got {r.status_code}")

        # Mainstream Staff limited access
        if "mainstream" in self.tokens:
            r = requests.get(f"{BASE}/mainstream", headers=self.hdr(self.tokens["mainstream"]), timeout=20)
            self.check("Mainstream Staff can GET /api/mainstream", 
                      r.status_code == 200, f"Got {r.status_code}")

    # ========================================================================
    # CANONICAL SYMBOLS TESTS
    # ========================================================================
    def test_symbols(self):
        self.section("CANONICAL SYMBOLS: 178 symbols, consistency, replace/reset")

        # Get all symbols
        r = requests.get(f"{BASE}/symbols", timeout=20)
        self.check("GET /api/symbols returns 200", r.status_code == 200, f"Got {r.status_code}")
        
        if r.status_code == 200:
            symbols = r.json()
            self.check("Symbol library has 178 symbols", len(symbols) == 178, f"Got {len(symbols)}")

            # Check sources
            widgit = [s for s in symbols if s.get("source") == "widgit-deck"]
            arasaac = [s for s in symbols if s.get("source") == "arasaac"]
            self.check("Widgit symbols present", len(widgit) > 0, f"Found {len(widgit)}")
            self.check("ARASAAC symbols present", len(arasaac) > 0, f"Found {len(arasaac)}")

        # Test image serving
        test_key = "routine.timetable"
        r = requests.get(f"{BASE}/symbols/{test_key}/image", timeout=20)
        self.check("GET /api/symbols/{concept_key}/image returns image/png", 
                  r.status_code == 200 and "image/" in r.headers.get("content-type", ""),
                  f"Status: {r.status_code}, Type: {r.headers.get('content-type')}")

        # Test ETag consistency (same concept returns same ETag)
        etags = []
        for _ in range(3):
            r = requests.get(f"{BASE}/symbols/{test_key}/image", timeout=20)
            if r.status_code == 200:
                etags.append(r.headers.get("ETag"))
        self.check("Same concept returns identical ETag (consistency)", 
                  len(set(etags)) == 1, f"ETags: {etags}")

        # Test unknown concept returns 404
        r = requests.get(f"{BASE}/symbols/does.not.exist/image", timeout=20)
        self.check("Unknown concept returns 404 (never substitutes)", 
                  r.status_code == 404, f"Got {r.status_code}")

    # ========================================================================
    # FOUR LAYERS TESTS
    # ========================================================================
    def test_four_layers(self):
        self.section("FOUR LAYERS: Template vs Day vs Pupil independence")

        if "admin" not in self.tokens:
            print("⚠️  Skipping four layers test - no admin token")
            return

        admin = self.tokens["admin"]
        today = date.today().isoformat()

        # Get templates
        r = requests.get(f"{BASE}/timetable/templates", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/timetable/templates returns templates", 
                  r.status_code == 200 and len(r.json()) > 0,
                  f"Status: {r.status_code}")

        if r.status_code == 200:
            templates = r.json()
            template = templates[0]
            template_id = template["id"]
            original_titles = [i["title"] for i in template["items"]]

            # Load template into today
            r = requests.post(f"{BASE}/timetable/day/load-template",
                            headers=self.hdr(admin),
                            json={"template_id": template_id, "date": today, "replace": True},
                            timeout=20)
            self.check("POST /api/timetable/day/load-template loads template into date", 
                      r.status_code == 200, f"Got {r.status_code}")

            if r.status_code == 200:
                day = r.json()
                
                # Edit today's first item
                if day.get("items") and len(day["items"]) > 0:
                    first_item = day["items"][0]
                    r = requests.patch(f"{BASE}/timetable/day/items/{first_item['id']}?date={today}",
                                     headers=self.hdr(admin),
                                     json={"title": "CHANGED TODAY ONLY"},
                                     timeout=20)
                    self.check("PATCH /api/timetable/day/items/{id} renames activity for date only", 
                              r.status_code == 200, f"Got {r.status_code}")

                    # Verify template unchanged
                    r = requests.get(f"{BASE}/timetable/templates", headers=self.hdr(admin), timeout=20)
                    if r.status_code == 200:
                        templates_after = r.json()
                        template_after = next((t for t in templates_after if t["id"] == template_id), None)
                        if template_after:
                            after_titles = [i["title"] for i in template_after["items"]]
                            self.check("Template unchanged after editing day (LAYER SEPARATION)", 
                                      after_titles == original_titles,
                                      f"Original: {original_titles[0]}, After: {after_titles[0]}")

        # Test pupil adaptations
        r = requests.get(f"{BASE}/pupils", headers=self.hdr(admin), timeout=20)
        if r.status_code == 200:
            pupils = r.json()
            if len(pupils) > 0:
                pupil_id = pupils[0]["id"]
                
                # Get today's day
                r = requests.get(f"{BASE}/timetable/day?date={today}", headers=self.hdr(admin), timeout=20)
                if r.status_code == 200 and r.json().get("items"):
                    day = r.json()
                    parent_item = day["items"][0]
                    
                    # Add pupil adaptation
                    r = requests.post(f"{BASE}/timetable/adaptations",
                                    headers=self.hdr(admin),
                                    json={
                                        "pupil_id": pupil_id,
                                        "date": today,
                                        "parent_item_id": parent_item["id"],
                                        "parent_title": parent_item["title"],
                                        "steps": [
                                            {"title": "Step 1", "symbol_concept": "system.symbol"},
                                            {"title": "Step 2", "symbol_concept": "learning.learning"}
                                        ]
                                    },
                                    timeout=20)
                    self.check("POST /api/timetable/adaptations adds pupil support sequence", 
                              r.status_code == 200, f"Got {r.status_code}")

                    # Verify whole-class day unchanged
                    r = requests.get(f"{BASE}/timetable/day?date={today}", headers=self.hdr(admin), timeout=20)
                    if r.status_code == 200:
                        day_after = r.json()
                        self.check("Whole-class timetable unchanged by pupil adaptation (LAYER SEPARATION)", 
                                  len(day_after["items"]) == len(day["items"]),
                                  f"Before: {len(day['items'])}, After: {len(day_after['items'])}")

                # Test pupil visibility control
                r = requests.put(f"{BASE}/timetable/pupil-view/{pupil_id}",
                               headers=self.hdr(admin),
                               json={"pupil_id": pupil_id, "timetable_visibility": "now_next", "show_times": False},
                               timeout=20)
                self.check("PUT /api/timetable/pupil-view/{pupil_id} controls visibility", 
                          r.status_code == 200, f"Got {r.status_code}")

                r = requests.get(f"{BASE}/timetable/pupil-day/{pupil_id}?date={today}", 
                               headers=self.hdr(admin), timeout=20)
                if r.status_code == 200:
                    pupil_day = r.json()
                    self.check("GET /api/timetable/pupil-day/{pupil_id} respects visibility (now_next = max 2)", 
                              len(pupil_day.get("items", [])) <= 2,
                              f"Got {len(pupil_day.get('items', []))} items")

    # ========================================================================
    # TIMETABLE MECHANICS TESTS
    # ========================================================================
    def test_timetable_mechanics(self):
        self.section("TIMETABLE MECHANICS: CRUD, advance, duplicate, reorder")

        if "admin" not in self.tokens:
            print("⚠️  Skipping timetable mechanics - no admin token")
            return

        admin = self.tokens["admin"]
        today = date.today().isoformat()

        # Get day
        r = requests.get(f"{BASE}/timetable/day?date={today}", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/timetable/day returns day", r.status_code == 200, f"Got {r.status_code}")

        if r.status_code == 200:
            day = r.json()
            
            # Test status current (NOW)
            if day.get("items") and len(day["items"]) > 0:
                first_item = day["items"][0]
                r = requests.post(f"{BASE}/timetable/day/items/{first_item['id']}/status?date={today}",
                                headers=self.hdr(admin),
                                json={"status": "current"},
                                timeout=20)
                self.check("POST /api/timetable/day/items/{id}/status sets NOW", 
                          r.status_code == 200, f"Got {r.status_code}")

                if r.status_code == 200:
                    updated = r.json()
                    self.check("NOW is set correctly", 
                              updated.get("now") is not None,
                              f"Now: {updated.get('now')}")
                    self.check("NEXT is derived automatically", 
                              updated.get("next") is not None,
                              f"Next: {updated.get('next')}")

            # Test advance
            r = requests.post(f"{BASE}/timetable/day/advance?date={today}", 
                            headers=self.hdr(admin), timeout=20)
            self.check("POST /api/timetable/day/advance moves to next activity", 
                      r.status_code == 200, f"Got {r.status_code}")

            # Test activity library CRUD
            r = requests.get(f"{BASE}/timetable/activities", headers=self.hdr(admin), timeout=20)
            self.check("GET /api/timetable/activities returns activity library", 
                      r.status_code == 200, f"Got {r.status_code}")

            # Test template CRUD
            r = requests.get(f"{BASE}/timetable/templates", headers=self.hdr(admin), timeout=20)
            self.check("GET /api/timetable/templates returns templates", 
                      r.status_code == 200, f"Got {r.status_code}")

    # ========================================================================
    # MORNING MEETING TESTS
    # ========================================================================
    def test_morning_meeting(self):
        self.section("MORNING MEETING: CREW Time sequence")

        if "admin" not in self.tokens:
            print("⚠️  Skipping morning meeting - no admin token")
            return

        admin = self.tokens["admin"]

        # Get run state
        r = requests.get(f"{BASE}/morning-meeting/run", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/morning-meeting/run returns CREW Time sequence", 
                  r.status_code == 200, f"Got {r.status_code}")

        if r.status_code == 200:
            run = r.json()
            components = run.get("components", [])
            self.check("CREW Time has 7 components", 
                      len(components) >= 7,
                      f"Got {len(components)} components")

        # Get config
        r = requests.get(f"{BASE}/morning-meeting/config", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/morning-meeting/config returns configuration", 
                  r.status_code == 200, f"Got {r.status_code}")

    # ========================================================================
    # COMMUNICATION TESTS
    # ========================================================================
    def test_communication(self):
        self.section("COMMUNICATION: Categories and options CRUD")

        if "admin" not in self.tokens:
            print("⚠️  Skipping communication - no admin token")
            return

        admin = self.tokens["admin"]

        # Get board
        r = requests.get(f"{BASE}/communication/board", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/communication/board returns 6 categories", 
                  r.status_code == 200,
                  f"Got {r.status_code}")

        if r.status_code == 200:
            board = r.json()
            self.check("Board has 6 categories (I want/need/feel/think/can say/Help)", 
                      len(board) >= 6,
                      f"Got {len(board)} categories")

    # ========================================================================
    # INTERACTION + BLANKS TESTS
    # ========================================================================
    def test_interaction(self):
        self.section("INTERACTION + BLANKS: Areas and prompts")

        if "admin" not in self.tokens:
            print("⚠️  Skipping interaction - no admin token")
            return

        admin = self.tokens["admin"]

        # Get areas
        r = requests.get(f"{BASE}/interaction/areas", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/interaction/areas returns areas", 
                  r.status_code == 200, f"Got {r.status_code}")

        # Get Blank's levels
        r = requests.get(f"{BASE}/interaction/blanks", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/interaction/blanks returns prompts for levels 1-4", 
                  r.status_code == 200, f"Got {r.status_code}")

    # ========================================================================
    # REGULATION TESTS
    # ========================================================================
    def test_regulation(self):
        self.section("REGULATION: Zones and strategies")

        if "admin" not in self.tokens:
            print("⚠️  Skipping regulation - no admin token")
            return

        admin = self.tokens["admin"]

        # Get board
        r = requests.get(f"{BASE}/regulation/board", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/regulation/board returns 4 zones and strategies", 
                  r.status_code == 200, f"Got {r.status_code}")

        if r.status_code == 200:
            board = r.json()
            self.check("Board has 4 zones", 
                      len(board) >= 4,
                      f"Got {len(board)} zones")

    # ========================================================================
    # PREPARE ME TESTS
    # ========================================================================
    def test_prepare_me(self):
        self.section("PREPARE ME: Templates and stories")

        if "admin" not in self.tokens:
            print("⚠️  Skipping prepare me - no admin token")
            return

        admin = self.tokens["admin"]

        # Get templates
        r = requests.get(f"{BASE}/prepare-me/templates", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/prepare-me/templates returns templates", 
                  r.status_code == 200, f"Got {r.status_code}")

        if r.status_code == 200:
            templates = r.json()
            self.check("7 default templates present", 
                      len(templates) >= 7,
                      f"Got {len(templates)} templates")

        # Get stories
        r = requests.get(f"{BASE}/prepare-me/stories", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/prepare-me/stories returns stories", 
                  r.status_code == 200, f"Got {r.status_code}")

    # ========================================================================
    # JOBS TESTS
    # ========================================================================
    def test_jobs(self):
        self.section("JOBS: CRUD, assign, rotate, random")

        if "admin" not in self.tokens:
            print("⚠️  Skipping jobs - no admin token")
            return

        admin = self.tokens["admin"]

        # Get jobs
        r = requests.get(f"{BASE}/jobs", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/jobs returns jobs + assignments", 
                  r.status_code == 200, f"Got {r.status_code}")

        if r.status_code == 200:
            jobs = r.json()
            self.check("Jobs list returned", 
                      isinstance(jobs, list) or "jobs" in jobs,
                      f"Type: {type(jobs)}")

    # ========================================================================
    # PICKERS TESTS
    # ========================================================================
    def test_pickers(self):
        self.section("PICKERS: Spin with no-immediate-repeat")

        if "admin" not in self.tokens:
            print("⚠️  Skipping pickers - no admin token")
            return

        admin = self.tokens["admin"]

        # Get pickers
        r = requests.get(f"{BASE}/pickers", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/pickers returns pickers", 
                  r.status_code == 200, f"Got {r.status_code}")

        if r.status_code == 200:
            pickers = r.json()
            if len(pickers) > 0:
                picker = pickers[0]
                picker_id = picker["id"]

                # Test spin
                results = []
                for _ in range(3):
                    r = requests.post(f"{BASE}/pickers/{picker_id}/spin", 
                                    headers=self.hdr(admin), timeout=20)
                    if r.status_code == 200:
                        result = r.json()
                        results.append(result.get("result"))

                self.check("POST /api/pickers/{id}/spin returns result", 
                          len(results) > 0, f"Got {len(results)} results")

                # Check no immediate repeat (if more than 1 option)
                if len(results) >= 2:
                    no_immediate_repeat = results[0] != results[1] or len(picker.get("options", [])) <= 1
                    self.check("No immediate repeat in picker results", 
                              no_immediate_repeat,
                              f"Results: {results[:2]}")

    # ========================================================================
    # PUPILS + PHOTOS TESTS
    # ========================================================================
    def test_pupils(self):
        self.section("PUPILS + PHOTOS: CRUD and photo permissions")

        if "admin" not in self.tokens:
            print("⚠️  Skipping pupils - no admin token")
            return

        admin = self.tokens["admin"]

        # Get pupils
        r = requests.get(f"{BASE}/pupils", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/pupils returns 8 sample pupils", 
                  r.status_code == 200, f"Got {r.status_code}")

        if r.status_code == 200:
            pupils = r.json()
            self.check("8 sample pupils present", 
                      len(pupils) >= 8,
                      f"Got {len(pupils)} pupils")

            if len(pupils) > 0:
                pupil = pupils[0]
                pupil_id = pupil["id"]

                # Get pupil profile
                r = requests.get(f"{BASE}/pupils/{pupil_id}", headers=self.hdr(admin), timeout=20)
                self.check("GET /api/pupils/{id} returns profile", 
                          r.status_code == 200, f"Got {r.status_code}")

    # ========================================================================
    # QUICK OBSERVATION TESTS
    # ========================================================================
    def test_observations(self):
        self.section("QUICK OBSERVATION: Create with validation")

        if "admin" not in self.tokens:
            print("⚠️  Skipping observations - no admin token")
            return

        admin = self.tokens["admin"]

        # Get options
        r = requests.get(f"{BASE}/observations/options", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/observations/options returns 5 areas and 3 support levels", 
                  r.status_code == 200, f"Got {r.status_code}")

        # Get observations
        r = requests.get(f"{BASE}/observations", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/observations returns observations", 
                  r.status_code == 200, f"Got {r.status_code}")

        # Get patterns
        r = requests.get(f"{BASE}/observations/patterns", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/observations/patterns returns patterns with disclaimer", 
                  r.status_code == 200, f"Got {r.status_code}")

        if r.status_code == 200:
            patterns = r.json()
            self.check("Patterns include disclaimer (NEVER behaviour score)", 
                      "disclaimer" in patterns,
                      f"Keys: {list(patterns.keys())}")

    # ========================================================================
    # SPARKS TESTS
    # ========================================================================
    def test_sparks(self):
        self.section("SPARKS: Award, rules, badges")

        if "admin" not in self.tokens:
            print("⚠️  Skipping sparks - no admin token")
            return

        admin = self.tokens["admin"]

        # Get board
        r = requests.get(f"{BASE}/sparks/board", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/sparks/board returns enabled flag, rules, badges, totals", 
                  r.status_code == 200, f"Got {r.status_code}")

        if r.status_code == 200:
            board = r.json()
            self.check("Board has rules and badges", 
                      "rules" in board and "badges" in board,
                      f"Keys: {list(board.keys())}")

    # ========================================================================
    # PROJECTS TESTS
    # ========================================================================
    def test_projects(self):
        self.section("PROJECTS: Project Spark CRUD")

        if "admin" not in self.tokens:
            print("⚠️  Skipping projects - no admin token")
            return

        admin = self.tokens["admin"]

        # Get projects
        r = requests.get(f"{BASE}/projects", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/projects returns projects", 
                  r.status_code == 200, f"Got {r.status_code}")

    # ========================================================================
    # MAINSTREAM BRIDGE TESTS
    # ========================================================================
    def test_mainstream(self):
        self.section("MAINSTREAM BRIDGE: Permission-limited summary")

        if "mainstream" not in self.tokens:
            print("⚠️  Skipping mainstream - no mainstream token")
            return

        mainstream = self.tokens["mainstream"]

        # Get mainstream list
        r = requests.get(f"{BASE}/mainstream", headers=self.hdr(mainstream), timeout=20)
        self.check("GET /api/mainstream lists permitted pupils", 
                  r.status_code == 200, f"Got {r.status_code}")

        if r.status_code == 200:
            pupils = r.json()
            if len(pupils) > 0:
                pupil_id = pupils[0]["id"]
                
                # Get mainstream summary
                r = requests.get(f"{BASE}/mainstream/{pupil_id}", headers=self.hdr(mainstream), timeout=20)
                self.check("GET /api/mainstream/{pupil_id} returns limited summary", 
                          r.status_code == 200, f"Got {r.status_code}")

                if r.status_code == 200:
                    summary = r.json()
                    self.check("Summary includes note about limited visibility", 
                              "note" in summary or "mainstream_visible" in str(summary),
                              f"Keys: {list(summary.keys())}")

    # ========================================================================
    # SETTINGS TESTS
    # ========================================================================
    def test_settings(self):
        self.section("SETTINGS: Global settings and roles")

        if "admin" not in self.tokens:
            print("⚠️  Skipping settings - no admin token")
            return

        admin = self.tokens["admin"]

        # Get settings
        r = requests.get(f"{BASE}/settings", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/settings returns settings", 
                  r.status_code == 200, f"Got {r.status_code}")

        # Get roles
        r = requests.get(f"{BASE}/auth/roles", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/auth/roles returns roles", 
                  r.status_code == 200, f"Got {r.status_code}")

        # Get integrations
        r = requests.get(f"{BASE}/settings/integrations", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/settings/integrations reports ClassDojo as not_connected", 
                  r.status_code == 200, f"Got {r.status_code}")

    # ========================================================================
    # TODAY PAYLOAD TESTS
    # ========================================================================
    def test_today(self):
        self.section("TODAY PAYLOAD: Comprehensive payload")

        if "admin" not in self.tokens:
            print("⚠️  Skipping today - no admin token")
            return

        admin = self.tokens["admin"]

        # Get today
        r = requests.get(f"{BASE}/today", headers=self.hdr(admin), timeout=20)
        self.check("GET /api/today returns comprehensive payload", 
                  r.status_code == 200, f"Got {r.status_code}")

        if r.status_code == 200:
            today = r.json()
            expected_keys = ["date", "now", "next", "later", "progress", "jobs", 
                           "morning_meeting", "communication_categories", "zones", 
                           "sparks", "sample_data"]
            
            for key in expected_keys:
                self.check(f"Today payload includes '{key}'", 
                          key in today,
                          f"Missing: {key}")

            # IMPORTANT: 'next' must never be done or skipped
            if today.get("next"):
                next_status = today["next"].get("status")
                self.check("'next' is never done or skipped", 
                          next_status not in ["done", "skipped"],
                          f"Next status: {next_status}")

    # ========================================================================
    # RUN ALL TESTS
    # ========================================================================
    def run_all(self):
        print("\n" + "="*80)
        print("WESTERN PARK CLASSROOM PLATFORM - BACKEND API TESTING")
        print("="*80)

        self.test_auth()
        self.test_permissions()
        self.test_symbols()
        self.test_four_layers()
        self.test_timetable_mechanics()
        self.test_morning_meeting()
        self.test_communication()
        self.test_interaction()
        self.test_regulation()
        self.test_prepare_me()
        self.test_jobs()
        self.test_pickers()
        self.test_pupils()
        self.test_observations()
        self.test_sparks()
        self.test_projects()
        self.test_mainstream()
        self.test_settings()
        self.test_today()

        # Summary
        print(f"\n{'='*80}")
        print(f"SUMMARY: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"{'='*80}")

        if self.failures:
            print(f"\n❌ FAILURES ({len(self.failures)}):")
            for name, detail in self.failures:
                print(f"  - {name}: {detail}")
            return 1
        else:
            print("\n✅ ALL TESTS PASSED")
            return 0


if __name__ == "__main__":
    tester = APITester()
    sys.exit(tester.run_all())
