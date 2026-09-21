import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Eye,
  Image as ImageIcon,
  Palette,
  Plug,
  Plus,
  ScrollText,
  Shield,
  Sparkles,
  Trash2,
  ToggleLeft,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, errorMessage, formatTimeAgo, symbolUrl } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { SymbolImage } from "@/components/Symbol";
import { clearSymbolCache, SymbolPickerDialog } from "@/components/SymbolPicker";
import {
  AccessDenied,
  ConfirmAction,
  Loading,
  PageHeader,
  SampleBadge,
  SectionCard,
} from "@/components/common";
import { cn } from "@/lib/utils";

const PANELS = [
  { key: "classroom", label: "Classroom", icon: Building2 },
  { key: "appearance", label: "Appearance & accessibility", icon: Palette },
  { key: "features", label: "Features", icon: ToggleLeft },
  { key: "gamification", label: "Recognition", icon: Sparkles },
  { key: "profile", label: "Profile sections", icon: Eye },
  { key: "symbols", label: "Symbol Library", icon: ImageIcon },
  { key: "permissions", label: "Permissions & staff", icon: Shield },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "audit", label: "Activity log", icon: ScrollText },
];

export default function Settings() {
  const { can, settings, updateSettings, loadSettings } = useApp();
  const [panel, setPanel] = useState("classroom");

  if (!can("settings.edit")) return <AccessDenied what="settings" />;
  if (!settings) return <Loading label="Loading settings" />;

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="Nothing here needs a developer"
        title="Settings"
        description="Everything about how this classroom works is configuration, not code."
      />

      <div className="grid gap-[var(--wp-gap)] lg:grid-cols-[260px_1fr]">
        <nav className="wp-card p-3" aria-label="Settings sections" data-testid="settings-nav">
          <ul className="space-y-1">
            {PANELS.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => setPanel(p.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--wp-radius-md)] px-3 py-2.5 text-left text-sm font-medium transition-colors duration-200",
                    panel === p.key
                      ? "bg-[hsl(var(--wp-primary-soft))] text-[hsl(var(--wp-primary-700))]"
                      : "hover:bg-[hsl(var(--muted))]"
                  )}
                  data-testid={`settings-tab-${p.key}`}
                >
                  <p.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="wp-stack">
          {panel === "classroom" ? <ClassroomPanel settings={settings} update={updateSettings} /> : null}
          {panel === "appearance" ? <AppearancePanel settings={settings} update={updateSettings} /> : null}
          {panel === "features" ? <FeaturesPanel settings={settings} update={updateSettings} /> : null}
          {panel === "gamification" ? <RecognitionPanel settings={settings} update={updateSettings} /> : null}
          {panel === "profile" ? <ProfileSectionsPanel /> : null}
          {panel === "symbols" ? <SymbolLibraryPanel /> : null}
          {panel === "permissions" ? <PermissionsPanel /> : null}
          {panel === "integrations" ? <IntegrationsPanel /> : null}
          {panel === "audit" ? <AuditPanel /> : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- classroom ------------------------------- */
function ClassroomPanel({ settings, update }) {
  return (
    <>
      <SectionCard title="Classroom" testId="settings-classroom">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="class-name">Classroom name</Label>
            <Input
              id="class-name"
              defaultValue={settings.classroom_name}
              onBlur={(e) => update({ classroom_name: e.target.value })}
              className="mt-1.5"
              data-testid="settings-classroom-name"
            />
          </div>
          <div>
            <Label htmlFor="school-name">School</Label>
            <Input
              id="school-name"
              defaultValue={settings.school_name}
              onBlur={(e) => update({ school_name: e.target.value })}
              className="mt-1.5"
              data-testid="settings-school-name"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Sample data"
        description="This prototype was seeded with example content so you can see how everything works."
        testId="settings-sample-data"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SampleBadge />
            <p className="text-sm">
              {settings.sample_data
                ? "Sample content is present and clearly labelled throughout."
                : "Sample content has been removed."}
            </p>
          </div>
          {settings.sample_data ? (
            <ConfirmAction
              trigger={
                <Button variant="outline" data-testid="settings-remove-sample">
                  Remove all sample content
                </Button>
              }
              title="Remove every piece of sample content?"
              description="Sample pupils, activities, templates, jobs, pickers, communication choices, zones, strategies and projects will be deleted. Anything you created yourself is kept."
              confirmLabel="Remove sample content"
              onConfirm={async () => {
                try {
                  const { data } = await api.post("/settings/reset-sample-data");
                  toast.success(`Removed sample content from ${Object.keys(data.removed).length} areas`);
                  window.location.reload();
                } catch (e) {
                  toast.error(errorMessage(e));
                }
              }}
            />
          ) : null}
        </div>
        <p className="mt-3 text-xs text-[hsl(var(--wp-ink-muted))]">
          This is a prototype. Do not enter live pupil information until your school has completed its
          own data protection checks.
        </p>
      </SectionCard>
    </>
  );
}

/* ------------------------------ appearance ------------------------------ */
function AppearancePanel({ settings, update }) {
  const a = settings.appearance || {};
  const set = (patch) => update({ appearance: patch });
  return (
    <SectionCard
      title="Appearance and accessibility"
      description="These settings take effect immediately across the whole platform."
      testId="settings-appearance"
    >
      <div className="space-y-5">
        <div>
          <Label>Visual density</Label>
          <Select value={a.density || "comfortable"} onValueChange={(density) => set({ density })}>
            <SelectTrigger className="mt-1.5 w-[220px]" data-testid="appearance-density">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["compact", "comfortable", "spacious"].map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Animation level</Label>
          <Select value={a.animation || "subtle"} onValueChange={(animation) => set({ animation })}>
            <SelectTrigger className="mt-1.5 w-[220px]" data-testid="appearance-animation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["none", "subtle", "full"].map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-xs text-[hsl(var(--wp-ink-muted))]">
            Choosing none removes all movement, including the picker shuffle.
          </p>
        </div>

        <div>
          <Label>Text size ({Math.round((a.font_scale || 1) * 100)}%)</Label>
          <Slider
            value={[Number(a.font_scale || 1) * 100]}
            min={85}
            max={140}
            step={5}
            onValueChange={([v]) => set({ font_scale: v / 100 })}
            className="mt-3 max-w-sm"
            data-testid="appearance-font-scale"
          />
        </div>

        {[
          ["high_contrast", "Higher contrast borders and text"],
          ["show_symbol_labels", "Show the written word under every symbol"],
          ["show_photos", "Allow pupil photographs to be displayed"],
        ].map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <Label htmlFor={`app-${key}`} className="text-sm font-normal">
              {label}
            </Label>
            <Switch
              id={`app-${key}`}
              checked={a[key] !== false && Boolean(a[key])}
              onCheckedChange={(v) => set({ [key]: v })}
              data-testid={`appearance-${key}`}
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------- features ------------------------------- */
function FeaturesPanel({ settings, update }) {
  const f = settings.features || {};
  const pf = settings.pupil_facing || {};
  const labels = {
    morning_meeting: "Morning Meeting",
    communication: "Communication Centre",
    interaction: "Interaction Centre",
    regulation: "Regulation Centre",
    prepare_me: "Prepare Me",
    jobs: "Classroom jobs",
    pickers: "Random pickers",
    observations: "Observations",
    projects: "Project Spark",
    mainstream_bridge: "Mainstream Bridge",
  };
  return (
    <>
      <SectionCard
        title="Which areas are switched on"
        description="Turn off anything your classroom is not using. It disappears from navigation for everyone."
        testId="settings-features"
      >
        <div className="space-y-3">
          {Object.entries(labels).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <Label htmlFor={`f-${key}`} className="text-sm font-normal">
                {label}
              </Label>
              <Switch
                id={`f-${key}`}
                checked={f[key] !== false}
                onCheckedChange={(v) => update({ features: { [key]: v } })}
                data-testid={`feature-${key}`}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Pupil-facing mode"
        description="What appears on the classroom display. Keep it minimal."
        testId="settings-pupil-facing"
      >
        <div className="space-y-3">
          {[
            ["show_timetable", "My day"],
            ["show_communication", "I can say"],
            ["show_regulation", "How I feel"],
            ["show_sparks", "My Sparks"],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <Label htmlFor={`pf-${key}`} className="text-sm font-normal">
                {label}
              </Label>
              <Switch
                id={`pf-${key}`}
                checked={pf[key] !== false}
                onCheckedChange={(v) => update({ pupil_facing: { [key]: v } })}
                data-testid={`pupil-facing-${key}`}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

/* ----------------------------- recognition ----------------------------- */
function RecognitionPanel({ settings, update }) {
  const [rules, setRules] = useState([]);
  const [badges, setBadges] = useState([]);
  const [goals, setGoals] = useState([]);
  const g = settings.gamification || {};

  const load = useCallback(async () => {
    const [r, b, go] = await Promise.all([
      api.get("/sparks/rules"),
      api.get("/sparks/badges"),
      api.get("/sparks/goal"),
    ]);
    setRules(r.data);
    setBadges(b.data);
    setGoals(go.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <SectionCard title="Recognition settings" testId="settings-recognition">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="gam-on" className="text-sm font-normal">
              Use recognition at all
            </Label>
            <Switch
              id="gam-on"
              checked={g.enabled !== false}
              onCheckedChange={(v) => update({ gamification: { enabled: v } })}
              data-testid="gamification-enabled"
            />
          </div>
          <div>
            <Label htmlFor="currency">What do you call them?</Label>
            <Input
              id="currency"
              defaultValue={g.currency_name || "Sparks"}
              onBlur={(e) => update({ gamification: { currency_name: e.target.value } })}
              className="mt-1.5 w-[220px]"
              data-testid="gamification-currency"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="gam-today" className="text-sm font-normal">
              Show the class total on Today
            </Label>
            <Switch
              id="gam-today"
              checked={g.show_on_today !== false}
              onCheckedChange={(v) => update({ gamification: { show_on_today: v } })}
              data-testid="gamification-show-today"
            />
          </div>
          <div>
            <Label>Reset period</Label>
            <Select
              value={g.reset_period || "half_term"}
              onValueChange={(reset_period) => update({ gamification: { reset_period } })}
            >
              <SelectTrigger className="mt-1.5 w-[220px]" data-testid="gamification-reset-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["weekly", "half_term", "termly", "never"].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ConfirmAction
            trigger={
              <Button variant="outline" data-testid="gamification-reset">
                Reset all totals now
              </Button>
            }
            title="Clear every recognition record?"
            description="All totals return to zero. The reasons and achievements you configured are kept."
            confirmLabel="Reset totals"
            onConfirm={async () => {
              await api.post("/sparks/reset");
              toast.success("Totals reset");
            }}
          />
        </div>
      </SectionCard>

      <EditableList
        title="What earns recognition"
        description="Skills and participation only. Never behaviour points."
        items={rules}
        testId="settings-spark-rules"
        fields={[
          { key: "title", label: "Reason", width: "flex-1 min-w-[180px]" },
          { key: "area", label: "Area", width: "w-[150px]" },
          { key: "points", label: "Points", width: "w-[90px]", type: "number" },
        ]}
        onPatch={(id, patch) => api.patch(`/sparks/rules/${id}`, patch)}
        onDelete={(id) => api.delete(`/sparks/rules/${id}`)}
        onCreate={(body) => api.post("/sparks/rules", body)}
        reload={load}
        newDefaults={{ title: "", area: "Participation", points: 1, symbol_concept: "system.spark" }}
      />

      <EditableList
        title="Achievements"
        description="Milestones a pupil reaches, at whatever threshold you choose."
        items={badges}
        testId="settings-badges"
        fields={[
          { key: "title", label: "Achievement", width: "flex-1 min-w-[180px]" },
          { key: "area", label: "Area", width: "w-[150px]" },
          { key: "threshold", label: "At", width: "w-[90px]", type: "number" },
        ]}
        onPatch={(id, patch) => api.patch(`/sparks/badges/${id}`, patch)}
        onDelete={(id) => api.delete(`/sparks/badges/${id}`)}
        onCreate={(body) => api.post("/sparks/badges", body)}
        reload={load}
        newDefaults={{ title: "", area: "Participation", threshold: 10, symbol_concept: "system.badge" }}
      />

      <EditableList
        title="Class goals"
        items={goals}
        testId="settings-goals"
        fields={[
          { key: "title", label: "Goal", width: "flex-1 min-w-[180px]" },
          { key: "target", label: "Target", width: "w-[100px]", type: "number" },
          { key: "reward", label: "Reward", width: "w-[180px]" },
        ]}
        onPatch={(id, patch) => api.patch(`/sparks/goal/${id}`, patch)}
        onDelete={(id) => api.delete(`/sparks/goal/${id}`)}
        onCreate={(body) => api.post("/sparks/goal", body)}
        reload={load}
        newDefaults={{ title: "", target: 50, reward: "" }}
        noSymbol
      />
    </>
  );
}

/* --------------------------- generic editable list --------------------------- */
function EditableList({
  title,
  description,
  items,
  fields,
  onPatch,
  onDelete,
  onCreate,
  reload,
  newDefaults,
  testId,
  noSymbol,
}) {
  const [draft, setDraft] = useState(newDefaults);
  const [pickerFor, setPickerFor] = useState(null);

  return (
    <SectionCard title={title} description={description} testId={testId}>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="wp-row flex flex-wrap items-center gap-2 p-3" data-testid="editable-row">
            {!noSymbol ? (
              <button
                type="button"
                onClick={() => setPickerFor(item)}
                aria-label="Change symbol"
                data-testid="editable-row-symbol"
              >
                <SymbolImage conceptKey={item.symbol_concept} size="sm" alt="" />
              </button>
            ) : null}
            {fields.map((f) => (
              <Input
                key={f.key}
                type={f.type || "text"}
                defaultValue={item[f.key]}
                aria-label={f.label}
                onBlur={async (e) => {
                  const value = f.type === "number" ? Number(e.target.value) : e.target.value;
                  if (value === item[f.key]) return;
                  await onPatch(item.id, { [f.key]: value });
                  toast.success("Saved");
                  reload();
                }}
                className={cn("h-9", f.width)}
                data-testid={`editable-${f.key}`}
              />
            ))}
            {item.is_sample ? <SampleBadge /> : null}
            <ConfirmAction
              trigger={
                <Button variant="ghost" size="icon" aria-label="Delete" data-testid="editable-row-delete">
                  <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                </Button>
              }
              title={`Delete "${item.title}"?`}
              description="This cannot be undone."
              onConfirm={async () => {
                await onDelete(item.id);
                toast.success("Deleted");
                reload();
              }}
            />
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-end gap-2 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
        {fields.map((f) => (
          <div key={f.key}>
            <Label className="text-xs">{f.label}</Label>
            <Input
              type={f.type || "text"}
              value={draft[f.key] ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                })
              }
              className={cn("mt-1 h-9", f.width)}
              data-testid={`new-${f.key}`}
            />
          </div>
        ))}
        <Button
          onClick={async () => {
            if (!String(draft.title || "").trim()) {
              toast.error("Give it a name");
              return;
            }
            await onCreate(draft);
            toast.success("Added");
            setDraft(newDefaults);
            reload();
          }}
          data-testid="editable-list-add"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add
        </Button>
      </div>

      <SymbolPickerDialog
        open={Boolean(pickerFor)}
        onOpenChange={(o) => !o && setPickerFor(null)}
        value={pickerFor?.symbol_concept}
        onSelect={async (concept) => {
          await onPatch(pickerFor.id, { symbol_concept: concept });
          setPickerFor(null);
          reload();
        }}
      />
    </SectionCard>
  );
}

/* --------------------------- profile sections --------------------------- */
function ProfileSectionsPanel() {
  const [sections, setSections] = useState([]);
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get("/pupils/profile-sections");
    setSections(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SectionCard
      title="Pupil profile sections"
      description="Decide what a profile contains, and which parts mainstream colleagues can see."
      testId="settings-profile-sections"
    >
      <ul className="space-y-2">
        {sections.map((s) => (
          <li key={s.id} className="wp-row flex flex-wrap items-center gap-3 p-3" data-testid="profile-section-row">
            <SymbolImage conceptKey={s.symbol_concept} size="sm" alt="" />
            <Input
              defaultValue={s.title}
              onBlur={async (e) => {
                if (e.target.value === s.title) return;
                await api.patch(`/pupils/profile-sections/${s.id}`, { title: e.target.value });
                toast.success("Renamed");
                load();
              }}
              className="h-9 min-w-[180px] flex-1"
              data-testid="profile-section-title"
            />
            <div className="flex items-center gap-2">
              <Label className="text-xs">On</Label>
              <Switch
                checked={s.enabled !== false}
                onCheckedChange={async (v) => {
                  await api.patch(`/pupils/profile-sections/${s.id}`, { enabled: v });
                  load();
                }}
                data-testid="profile-section-enabled"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Mainstream can see</Label>
              <Switch
                checked={Boolean(s.mainstream_visible)}
                onCheckedChange={async (v) => {
                  await api.patch(`/pupils/profile-sections/${s.id}`, { mainstream_visible: v });
                  load();
                }}
                data-testid="profile-section-mainstream"
              />
            </div>
            <ConfirmAction
              trigger={
                <Button variant="ghost" size="icon" aria-label="Delete section" data-testid="profile-section-delete">
                  <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                </Button>
              }
              title={`Delete the ${s.title} section?`}
              description="Content already written in it stays in the database but is no longer shown."
              onConfirm={async () => {
                await api.delete(`/pupils/profile-sections/${s.id}`);
                load();
              }}
            />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-end gap-2 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
        <div>
          <Label htmlFor="new-section" className="text-xs">
            New section
          </Label>
          <Input
            id="new-section"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 h-9 w-[220px]"
            data-testid="new-profile-section"
          />
        </div>
        <Button
          onClick={async () => {
            if (!title.trim()) return;
            await api.post("/pupils/profile-sections", { title: title.trim() });
            toast.success("Section added");
            setTitle("");
            load();
          }}
          data-testid="add-profile-section"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add
        </Button>
      </div>
    </SectionCard>
  );
}

/* ---------------------------- symbol library ---------------------------- */
function SymbolLibraryPanel() {
  const [symbols, setSymbols] = useState([]);
  const [attributions, setAttributions] = useState([]);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [busy, setBusy] = useState(null);
  const [version, setVersion] = useState(0);
  const fileRef = useRef(null);
  const [uploadFor, setUploadFor] = useState(null);

  const load = useCallback(async () => {
    const [s, a] = await Promise.all([api.get("/symbols"), api.get("/symbols/attributions")]);
    setSymbols(s.data);
    setAttributions(a.data);
    clearSymbolCache();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(
    () => ["All", ...Array.from(new Set(symbols.map((s) => s.group))).sort()],
    [symbols]
  );
  const filtered = symbols.filter((s) => {
    if (group !== "All" && s.group !== group) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return s.label.toLowerCase().includes(q) || s.concept_key.toLowerCase().includes(q);
  });

  return (
    <>
      <SectionCard
        title="Canonical Symbol Library"
        description="One symbol per concept, used on every screen. Replace a symbol here and it changes everywhere at once."
        testId="settings-symbol-library"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbols"
            className="h-9 w-[220px]"
            data-testid="symbol-library-search"
          />
          <div className="wp-scroll-x flex gap-2">
            {groups.map((g) => (
              <Button
                key={g}
                variant={group === g ? "default" : "outline"}
                size="sm"
                onClick={() => setGroup(g)}
                className="shrink-0 rounded-full"
                data-testid={`symbol-library-group-${g}`}
              >
                {g}
              </Button>
            ))}
          </div>
        </div>

        <p className="mt-3 text-xs text-[hsl(var(--wp-ink-muted))]">
          {filtered.length} of {symbols.length} symbols
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !uploadFor) return;
            const form = new FormData();
            form.append("file", file);
            setBusy(uploadFor);
            try {
              await api.post(`/symbols/${uploadFor}/replace`, form, {
                headers: { "Content-Type": "multipart/form-data" },
              });
              toast.success("Symbol replaced everywhere in the platform");
              setVersion((v) => v + 1);
              load();
            } catch (err) {
              toast.error(errorMessage(err));
            } finally {
              setBusy(null);
              setUploadFor(null);
              e.target.value = "";
            }
          }}
          data-testid="symbol-replace-input"
        />

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, 90).map((s) => (
            <li key={s.concept_key} className="wp-row flex items-center gap-3 p-3" data-testid="symbol-library-row">
              <img
                src={`${symbolUrl(s.concept_key)}?v=${version}`}
                alt={s.label}
                className="h-14 w-14 shrink-0 rounded-[var(--wp-radius-md)] border border-[hsl(var(--border))] bg-white object-contain p-1"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.label}</p>
                <p className="truncate text-[11px] text-[hsl(var(--wp-ink-muted))]">{s.concept_key}</p>
                <p className="truncate text-[11px] text-[hsl(var(--wp-ink-muted))]">{s.source}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy === s.concept_key}
                  onClick={() => {
                    setUploadFor(s.concept_key);
                    setTimeout(() => fileRef.current?.click(), 0);
                  }}
                  data-testid="symbol-replace-button"
                >
                  <Upload className="mr-1 h-3.5 w-3.5" /> Replace
                </Button>
                {s.source === "school-upload" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await api.post(`/symbols/${s.concept_key}/reset`);
                      toast.success("Reset to the bundled symbol");
                      setVersion((v) => v + 1);
                      load();
                    }}
                    data-testid="symbol-reset-button"
                  >
                    Reset
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {filtered.length > 90 ? (
          <p className="mt-3 text-xs text-[hsl(var(--wp-ink-muted))]">
            Showing the first 90. Use search to narrow it down.
          </p>
        ) : null}
      </SectionCard>

      <SectionCard title="Where these symbols come from" testId="symbol-attributions">
        <ul className="space-y-2 text-sm">
          {attributions.map((a) => (
            <li key={a.source} className="wp-row p-3">
              <p className="font-semibold">{a.source}</p>
              <p className="mt-0.5 text-xs text-[hsl(var(--wp-ink-muted))]">{a.attribution}</p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  );
}

/* ----------------------------- permissions ----------------------------- */
function PermissionsPanel() {
  const [roles, setRoles] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [users, setUsers] = useState([]);
  const [pupils, setPupils] = useState([]);
  const [openRole, setOpenRole] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role_id: "" });

  const load = useCallback(async () => {
    try {
      const [r, c, u, p] = await Promise.all([
        api.get("/auth/roles"),
        api.get("/auth/permissions"),
        api.get("/auth/users").catch(() => ({ data: [] })),
        api.get("/pupils").catch(() => ({ data: [] })),
      ]);
      setRoles(r.data);
      setCatalogue(c.data);
      setUsers(u.data);
      setPupils(p.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = {};
    catalogue.forEach((p) => {
      map[p.group] = map[p.group] || [];
      map[p.group].push(p);
    });
    return map;
  }, [catalogue]);

  return (
    <>
      <SectionCard
        title="Roles"
        description="Roles are data. Create your own, and choose exactly what each one can do."
        testId="settings-roles"
      >
        <ul className="space-y-2">
          {roles.map((role) => (
            <li key={role.id} className="wp-row p-3" data-testid="role-row">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{role.name}</p>
                  <p className="text-xs text-[hsl(var(--wp-ink-muted))]">
                    {role.description} ·{" "}
                    {role.permissions?.includes("*")
                      ? "all permissions"
                      : `${role.permissions?.length || 0} permissions`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenRole(openRole === role.id ? null : role.id)}
                  data-testid="role-edit"
                >
                  {openRole === role.id ? "Close" : "Permissions"}
                </Button>
                {!role.is_system ? (
                  <ConfirmAction
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Delete role" data-testid="role-delete">
                        <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                      </Button>
                    }
                    title={`Delete the ${role.name} role?`}
                    description="Staff must be moved to another role first."
                    onConfirm={async () => {
                      try {
                        await api.delete(`/auth/roles/${role.id}`);
                        toast.success("Role deleted");
                        load();
                      } catch (e) {
                        toast.error(errorMessage(e));
                      }
                    }}
                  />
                ) : null}
              </div>

              {openRole === role.id ? (
                <div className="mt-3 space-y-3 border-t border-[hsl(var(--border))] pt-3">
                  {role.permissions?.includes("*") ? (
                    <p className="text-sm text-[hsl(var(--wp-ink-muted))]">
                      This role has every permission and cannot be narrowed.
                    </p>
                  ) : (
                    Object.entries(grouped).map(([groupName, perms]) => (
                      <div key={groupName}>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
                          {groupName}
                        </p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {perms.map((perm) => {
                            const on = role.permissions?.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className="flex items-center gap-2 rounded-[var(--wp-radius-sm)] border border-[hsl(var(--border))] bg-white px-2 py-1.5 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(on)}
                                  onChange={async (e) => {
                                    const next = e.target.checked
                                      ? [...(role.permissions || []), perm.key]
                                      : (role.permissions || []).filter((x) => x !== perm.key);
                                    await api.patch(`/auth/roles/${role.id}`, { permissions: next });
                                    load();
                                  }}
                                  data-testid="permission-checkbox"
                                />
                                {perm.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                  <div>
                    <Label className="text-xs">Which pupil records can this role see?</Label>
                    <Select
                      value={role.visibility_scope || "assigned_pupils"}
                      onValueChange={async (visibility_scope) => {
                        await api.patch(`/auth/roles/${role.id}`, { visibility_scope });
                        toast.success("Saved");
                        load();
                      }}
                    >
                      <SelectTrigger className="mt-1.5 w-[240px]" data-testid="role-scope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_pupils">All pupils</SelectItem>
                        <SelectItem value="assigned_pupils">Only assigned pupils</SelectItem>
                        <SelectItem value="none">No pupil records</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
          <div>
            <Label htmlFor="new-role" className="text-xs">
              New role
            </Label>
            <Input
              id="new-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="mt-1 h-9 w-[220px]"
              data-testid="new-role-name"
            />
          </div>
          <Button
            onClick={async () => {
              if (!newRole.trim()) return;
              await api.post("/auth/roles", { name: newRole.trim(), permissions: ["timetable.view"] });
              toast.success("Role created — now choose its permissions");
              setNewRole("");
              load();
            }}
            data-testid="add-role"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add role
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Staff accounts"
        description="Not every member of staff should see every pupil record."
        symbol={<Users className="h-5 w-5" aria-hidden="true" />}
        testId="settings-users"
      >
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="wp-row flex flex-wrap items-center gap-3 p-3" data-testid="user-row">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{u.name}</p>
                <p className="truncate text-xs text-[hsl(var(--wp-ink-muted))]">{u.email}</p>
              </div>
              <Select
                value={u.role_id}
                onValueChange={async (role_id) => {
                  await api.patch(`/auth/users/${u.id}`, { role_id });
                  toast.success("Role changed");
                  load();
                }}
              >
                <SelectTrigger className="h-9 w-[190px]" data-testid="user-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Active</Label>
                <Switch
                  checked={u.active !== false}
                  onCheckedChange={async (v) => {
                    await api.patch(`/auth/users/${u.id}`, { active: v });
                    load();
                  }}
                  data-testid="user-active"
                />
              </div>
              <ConfirmAction
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Delete account" data-testid="user-delete">
                    <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                  </Button>
                }
                title={`Delete ${u.name}'s account?`}
                description="They will no longer be able to sign in."
                onConfirm={async () => {
                  try {
                    await api.delete(`/auth/users/${u.id}`);
                    toast.success("Account deleted");
                    load();
                  } catch (e) {
                    toast.error(errorMessage(e));
                  }
                }}
              />
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
          {[
            ["name", "Name", "text"],
            ["email", "Email", "email"],
            ["password", "Password", "text"],
          ].map(([key, label, type]) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Input
                type={type}
                value={newUser[key]}
                onChange={(e) => setNewUser({ ...newUser, [key]: e.target.value })}
                className="mt-1 h-9 w-[170px]"
                data-testid={`new-user-${key}`}
              />
            </div>
          ))}
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={newUser.role_id} onValueChange={(role_id) => setNewUser({ ...newUser, role_id })}>
              <SelectTrigger className="mt-1 h-9 w-[180px]" data-testid="new-user-role">
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={async () => {
              if (!newUser.name || !newUser.email || newUser.password.length < 6 || !newUser.role_id) {
                toast.error("Name, email, a password of at least 6 characters and a role are needed");
                return;
              }
              try {
                await api.post("/auth/users", { ...newUser, pupil_ids: pupils.map((p) => p.id) });
                toast.success("Staff account created");
                setNewUser({ name: "", email: "", password: "", role_id: "" });
                load();
              } catch (e) {
                toast.error(errorMessage(e));
              }
            }}
            data-testid="add-user"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add staff
          </Button>
        </div>
      </SectionCard>
    </>
  );
}

/* ----------------------------- integrations ----------------------------- */
function IntegrationsPanel() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/settings/integrations").then((r) => setData(r.data)).catch(() => setData({ available: [] }));
  }, []);
  if (!data) return <Loading />;
  return (
    <SectionCard
      title="Integrations"
      description="This platform works completely on its own. Integrations are optional and kept in a separate layer."
      testId="settings-integrations"
    >
      <ul className="space-y-3">
        {data.available.map((i) => (
          <li key={i.key} className="wp-row p-4" data-testid="integration-row">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{i.name}</p>
              <span className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-semibold">
                Not connected
              </span>
            </div>
            <p className="mt-2 text-sm text-[hsl(var(--wp-ink-muted))]">{i.note}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/* -------------------------------- audit -------------------------------- */
function AuditPanel() {
  const [events, setEvents] = useState(null);
  useEffect(() => {
    api.get("/settings/audit").then((r) => setEvents(r.data)).catch(() => setEvents([]));
  }, []);
  if (!events) return <Loading />;
  return (
    <SectionCard
      title="Activity log"
      description="A record of significant changes, so it is always clear who changed what."
      testId="settings-audit"
    >
      {events.length ? (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="wp-row flex items-center gap-3 p-3" data-testid="audit-row">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.summary}</p>
                <p className="text-xs text-[hsl(var(--wp-ink-muted))]">{e.actor_name}</p>
              </div>
              <span className="text-xs text-[hsl(var(--wp-ink-muted))]">{formatTimeAgo(e.at)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[hsl(var(--wp-ink-muted))]">Nothing recorded yet.</p>
      )}
    </SectionCard>
  );
}
