import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  Plus,
  RotateCcw,
  SkipForward,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errorMessage, formatLongDate, DAY_CONCEPTS, MONTH_CONCEPTS } from "@/lib/api";
import { useApp, speak } from "@/context/AppContext";
import { SymbolImage, SymbolTile } from "@/components/Symbol";
import { SymbolField } from "@/components/SymbolPicker";
import {
  AccessDenied,
  ConfirmAction,
  EmptyState,
  Loading,
  PageHeader,
  PupilAvatar,
  SampleBadge,
  SectionCard,
} from "@/components/common";
import { cn } from "@/lib/utils";

const WEATHER = [
  ["Sunny", "weather.sunny"],
  ["Cloudy", "weather.cloudy"],
  ["Rainy", "weather.rainy"],
  ["Snowy", "weather.snowy"],
  ["Clear", "weather.clear"],
];
const TEMPERATURE = [
  ["Hot", "weather.hot"],
  ["Warm", "weather.warm"],
  ["Chilly", "weather.chilly"],
  ["Cold", "weather.cold"],
  ["Freezing", "weather.freezing"],
];

export default function MorningMeeting() {
  const { can } = useApp();
  const [payload, setPayload] = useState(null);
  const [pupils, setPupils] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [dayItems, setDayItems] = useState([]);

  const load = useCallback(async () => {
    try {
      const [run, pupilRes, reg, day] = await Promise.all([
        api.get("/morning-meeting/run"),
        api.get("/pupils").catch(() => ({ data: [] })),
        api.get("/regulation/board").catch(() => ({ data: { strategies: [] } })),
        api.get("/timetable/day").catch(() => ({ data: { items: [] } })),
      ]);
      setPayload(run.data);
      setPupils(pupilRes.data);
      setStrategies(reg.data.strategies || []);
      setDayItems(day.data.items || []);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("morning_meeting.run")) return <AccessDenied what="Morning Meeting" />;
  if (!payload) return <Loading label="Getting Morning Meeting ready" />;

  const template = payload.template;
  const run = payload.run;

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow={formatLongDate(run.date)}
        title={template?.name || "Morning Meeting"}
        description="The same routine, in the same order, with the same symbols every day."
      />
      <Tabs defaultValue="run">
        <TabsList>
          <TabsTrigger value="run" data-testid="tab-mm-run">Run the meeting</TabsTrigger>
          {can("morning_meeting.edit") ? (
            <TabsTrigger value="configure" data-testid="tab-mm-configure">Configure the sequence</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="run" className="mt-[var(--wp-gap)]">
          <RunMode
            payload={payload}
            pupils={pupils}
            strategies={strategies}
            dayItems={dayItems}
            reload={load}
          />
        </TabsContent>

        {can("morning_meeting.edit") ? (
          <TabsContent value="configure" className="mt-[var(--wp-gap)]">
            <Configure template={template} expectations={payload.expectations} reload={load} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

/* ------------------------------ RUN MODE ------------------------------ */
function RunMode({ payload, pupils, strategies, dayItems, reload }) {
  const run = payload.run;
  const components = useMemo(
    () => (payload.template?.components || []).filter((c) => c.enabled !== false),
    [payload]
  );
  const [index, setIndex] = useState(run.current_index || 0);

  useEffect(() => setIndex(run.current_index || 0), [run.current_index]);

  if (!components.length) {
    return (
      <EmptyState
        title="No components in the sequence"
        description="Add the parts of your Morning Meeting on the Configure tab."
      />
    );
  }

  const safeIndex = Math.min(index, components.length - 1);
  const current = components[safeIndex];
  const skipped = run.skipped || [];
  const completed = run.completed || [];

  const patch = async (body) => {
    try {
      const { data } = await api.patch("/morning-meeting/run", body);
      if (typeof body.current_index === "number") setIndex(body.current_index);
      await reload();
      return data;
    } catch (e) {
      toast.error(errorMessage(e));
      return null;
    }
  };

  const goto = (next) => patch({ current_index: Math.max(0, Math.min(next, components.length - 1)) });

  return (
    <div className="wp-stack">
      {/* progress dots */}
      <div className="wp-card flex flex-wrap items-center gap-2 p-4" data-testid="mm-progress">
        {components.map((c, n) => (
          <button
            key={c.id}
            type="button"
            onClick={() => goto(n)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-200",
              n === safeIndex
                ? "border-[hsl(var(--wp-primary))] bg-[hsl(var(--wp-primary-soft))] text-[hsl(var(--wp-primary-700))]"
                : completed.includes(c.id)
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : skipped.includes(c.id)
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-[hsl(var(--border))] bg-white text-[hsl(var(--wp-ink-muted))]"
            )}
            data-testid="mm-step-dot"
          >
            <SymbolImage conceptKey={c.symbol_concept} size="xs" framed={false} className="h-6 w-6 p-0" />
            <span className="hidden sm:inline">{c.title}</span>
            {completed.includes(c.id) ? <Check className="h-3 w-3" /> : null}
          </button>
        ))}
      </div>

      <section className="wp-card p-6" data-testid="mm-current-component">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SymbolImage conceptKey={current.symbol_concept} size="lg" alt={current.title} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
                Step {safeIndex + 1} of {components.length}
              </p>
              <h2 className="wp-display text-2xl font-bold sm:text-3xl">{current.title}</h2>
              {current.script ? (
                <button
                  type="button"
                  onClick={() => speak(current.script)}
                  className="mt-1 text-left text-sm text-[hsl(var(--wp-ink-muted))] underline decoration-dotted"
                  data-testid="mm-speak-script"
                >
                  {current.script}
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => goto(safeIndex - 1)} disabled={safeIndex === 0} data-testid="mm-back">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Button>
            <Button
              variant="outline"
              onClick={() => patch({ skip_component_id: current.id, current_index: safeIndex + 1 })}
              data-testid="mm-skip"
            >
              <SkipForward className="mr-1.5 h-4 w-4" /> Skip
            </Button>
            <Button
              onClick={() => patch({ complete_component_id: current.id, current_index: safeIndex + 1 })}
              data-testid="mm-next"
            >
              Done <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <ComponentBody
            component={current}
            run={run}
            pupils={pupils}
            expectations={payload.expectations}
            strategies={strategies}
            dayItems={dayItems}
            patch={patch}
            reload={reload}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => patch({ reset: true })} data-testid="mm-reset">
          <RotateCcw className="mr-1.5 h-4 w-4" /> Start again
        </Button>
        <Button
          variant="outline"
          onClick={() => patch({ finish: true })}
          data-testid="mm-finish"
        >
          <CheckCircle2 className="mr-1.5 h-4 w-4" /> Finish the meeting
        </Button>
        {run.completed_at ? (
          <span className="text-sm text-emerald-800">Finished for today</span>
        ) : null}
      </div>
    </div>
  );
}

function ComponentBody({ component, run, pupils, expectations, strategies, dayItems, patch, reload }) {
  const kind = component.kind || component.key;

  if (kind === "greeting") {
    return <GreetingCheckIn pupils={pupils} run={run} reload={reload} component={component} />;
  }

  if (kind === "expectations") {
    return (
      <div className="grid gap-4 md:grid-cols-3" data-testid="mm-expectations">
        {(expectations || []).map((e) => (
          <div key={e.id} className="wp-row p-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <SymbolImage conceptKey={e.symbol_concept} size="lg" alt={e.title} />
              <h3 className="wp-display text-xl font-bold">{e.title}</h3>
            </div>
            <ul className="mt-4 space-y-2">
              {(e.children || []).map((c) => (
                <li key={c.id} className="flex items-center gap-3 text-sm font-medium">
                  <SymbolImage conceptKey={c.symbol_concept} size="xs" alt="" />
                  <button type="button" onClick={() => speak(c.title)} className="text-left">
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!expectations?.length ? (
          <p className="text-sm text-[hsl(var(--wp-ink-muted))]">
            No expectations configured yet. Add yours in Configure.
          </p>
        ) : null}
      </div>
    );
  }

  if (kind === "calendar") {
    const now = new Date();
    const dayConcept = DAY_CONCEPTS[now.getDay()];
    const monthConcept = MONTH_CONCEPTS[now.getMonth()];
    return (
      <div className="space-y-5" data-testid="mm-calendar">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SymbolTile conceptKey="calendar.day" label="Day" size="md" showLabel />
          <SymbolTile conceptKey="calendar.date" label="Date" size="md" showLabel />
          <SymbolTile conceptKey="calendar.month" label="Month" size="md" showLabel />
          <SymbolTile conceptKey="calendar.year" label="Year" size="md" showLabel />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="wp-row flex flex-col items-center gap-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
              The day is
            </p>
            <SymbolImage conceptKey={dayConcept} size="lg" alt="" />
            <p className="wp-display text-lg font-bold">
              {now.toLocaleDateString("en-GB", { weekday: "long" })}
            </p>
          </div>
          <div className="wp-row flex flex-col items-center justify-center gap-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
              The date is
            </p>
            <p className="wp-display text-5xl font-bold">{now.getDate()}</p>
          </div>
          <div className="wp-row flex flex-col items-center gap-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
              The month is
            </p>
            <SymbolImage conceptKey={monthConcept} size="lg" alt="" />
            <p className="wp-display text-lg font-bold">
              {now.toLocaleDateString("en-GB", { month: "long" })} {now.getFullYear()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "weather") {
    return (
      <div className="space-y-5" data-testid="mm-weather">
        <div className="flex items-center gap-4">
          <SymbolImage conceptKey="weather.prompt" size="md" alt="" />
          <p className="wp-display text-xl font-bold">How is the weather today?</p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {WEATHER.map(([label, concept]) => (
            <SymbolTile
              key={concept}
              conceptKey={concept}
              label={label}
              size="md"
              showLabel
              selected={run.weather === label}
              onClick={() => {
                speak(label);
                patch({ weather: label });
              }}
              testId="mm-weather-option"
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {TEMPERATURE.map(([label, concept]) => (
            <SymbolTile
              key={concept}
              conceptKey={concept}
              label={label}
              size="md"
              showLabel
              selected={run.temperature === label}
              onClick={() => {
                speak(label);
                patch({ temperature: label });
              }}
              testId="mm-temperature-option"
            />
          ))}
        </div>
      </div>
    );
  }

  if (kind === "timetable") {
    return (
      <div className="space-y-3" data-testid="mm-timetable">
        {dayItems.length ? (
          <div className="wp-scroll-x flex gap-3 pb-2">
            {dayItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "w-[150px] shrink-0 rounded-[var(--wp-radius-xl)] border p-3 text-center",
                  item.status === "current"
                    ? "border-[hsl(var(--wp-primary))] bg-[hsl(var(--wp-primary-soft))]"
                    : "border-[hsl(var(--border))] bg-white",
                  item.status === "done" ? "opacity-60" : ""
                )}
              >
                <SymbolImage conceptKey={item.symbol_concept} size="md" alt="" className="mx-auto" />
                <p className="mt-2 text-sm font-semibold leading-tight">{item.title}</p>
                {item.start ? (
                  <p className="text-xs text-[hsl(var(--wp-ink-muted))]">{item.start}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[hsl(var(--wp-ink-muted))]">Today has no activities yet.</p>
        )}
      </div>
    );
  }

  if (kind === "movement" || kind === "calming") {
    const wanted = kind === "movement" ? ["movement"] : ["calming", "sensory"];
    const list = strategies.filter((s) => wanted.includes(s.kind));
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid={`mm-${kind}`}>
        {list.map((s) => (
          <SymbolTile
            key={s.id}
            conceptKey={s.symbol_concept}
            label={s.title}
            size="md"
            showLabel
            onClick={() => speak(s.title)}
            testId="mm-strategy-option"
          />
        ))}
        {!list.length ? (
          <p className="col-span-full text-sm text-[hsl(var(--wp-ink-muted))]">
            Add {kind} activities in the Regulation area and they will appear here.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center" data-testid="mm-custom">
      <SymbolImage conceptKey={component.symbol_concept} size="hero" alt={component.title} />
      <p className="max-w-xl text-lg font-medium">{component.script || component.title}</p>
      <Button variant="outline" onClick={() => speak(component.script || component.title)}>
        Read it aloud
      </Button>
    </div>
  );
}

function GreetingCheckIn({ pupils, run, reload, component }) {
  const checkins = run.checkins || [];
  const byPupil = Object.fromEntries(checkins.map((c) => [c.pupil_id, c]));
  const [zones, setZones] = useState([]);

  useEffect(() => {
    api.get("/regulation/zones").then((r) => setZones(r.data)).catch(() => {});
  }, []);

  const setCheckin = async (pupil, body) => {
    try {
      await api.post("/morning-meeting/run/checkin", { pupil_id: pupil.id, ...body });
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-4" data-testid="mm-greeting">
      <div className="flex flex-wrap items-center gap-4">
        {component.config?.show_sign ? (
          <div className="flex items-center gap-3">
            <SymbolImage conceptKey={component.config.sign_concept || "sign.good_morning"} size="md" alt="" />
            <p className="text-sm font-medium">Good morning (sign)</p>
          </div>
        ) : null}
        <Button variant="outline" onClick={() => speak("Good morning everybody")} data-testid="mm-greeting-speak">
          Say good morning
        </Button>
        <span className="text-sm text-[hsl(var(--wp-ink-muted))]">
          {checkins.filter((c) => c.present).length} of {pupils.length} checked in
        </span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pupils.map((p) => {
          const c = byPupil[p.id];
          return (
            <li key={p.id} className="wp-row p-3" data-testid="mm-checkin-card">
              <div className="flex items-center gap-3">
                <PupilAvatar pupil={p} size={44} context="today" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.display_name}</p>
                  <p className="text-xs text-[hsl(var(--wp-ink-muted))]">
                    {c?.present ? "Here today" : "Not checked in"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={c?.present ? "default" : "outline"}
                  onClick={() => setCheckin(p, { present: !c?.present, zone_id: c?.zone_id })}
                  data-testid="mm-checkin-toggle"
                >
                  {c?.present ? "Here" : "Check in"}
                </Button>
              </div>
              {zones.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {zones.map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setCheckin(p, { present: true, zone_id: z.id })}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                        c?.zone_id === z.id ? "border-[hsl(var(--wp-ink))]" : "border-[hsl(var(--border))]"
                      )}
                      style={{
                        backgroundColor:
                          z.colour === "blue"
                            ? "hsl(205 70% 90%)"
                            : z.colour === "green"
                            ? "hsl(140 45% 88%)"
                            : z.colour === "yellow"
                            ? "hsl(48 90% 86%)"
                            : "hsl(6 70% 90%)",
                      }}
                      data-testid="mm-checkin-zone"
                    >
                      {z.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------ CONFIGURE ------------------------------ */
function Configure({ template, expectations, reload }) {
  const [draft, setDraft] = useState({ title: "", symbol_concept: "activity.crew_time", script: "" });
  if (!template) return null;
  const components = [...(template.components || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

  const reorder = async (index, delta) => {
    const next = [...components];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await api.post(`/morning-meeting/templates/${template.id}/reorder`, {
      component_ids: next.map((c) => c.id),
    });
    toast.success("Sequence reordered");
    reload();
  };

  return (
    <div className="wp-stack">
      <SectionCard
        title="Morning Meeting sequence"
        description="Add, remove, reorder, reword or hide any part. The symbol you choose is used everywhere that concept appears."
        testId="mm-configure"
      >
        <ol className="space-y-2">
          {components.map((c, index) => (
            <li key={c.id} className="wp-row flex flex-wrap items-center gap-3 p-3" data-testid="mm-config-row">
              <SymbolField
                value={c.symbol_concept}
                label=""
                onChange={async (concept) => {
                  await api.patch(`/morning-meeting/templates/${template.id}/components/${c.id}`, {
                    symbol_concept: concept,
                  });
                  toast.success("Symbol updated");
                  reload();
                }}
              />
              <Input
                defaultValue={c.title}
                onBlur={async (e) => {
                  if (e.target.value === c.title) return;
                  await api.patch(`/morning-meeting/templates/${template.id}/components/${c.id}`, {
                    title: e.target.value,
                  });
                  toast.success("Wording updated");
                  reload();
                }}
                className="h-9 min-w-[150px] flex-1"
                data-testid="mm-config-title"
              />
              <Input
                defaultValue={c.script || ""}
                placeholder="What staff say"
                onBlur={async (e) => {
                  if (e.target.value === (c.script || "")) return;
                  await api.patch(`/morning-meeting/templates/${template.id}/components/${c.id}`, {
                    script: e.target.value,
                  });
                  toast.success("Script updated");
                  reload();
                }}
                className="h-9 min-w-[180px] flex-[1.4]"
                data-testid="mm-config-script"
              />
              <div className="flex items-center gap-2">
                <Label htmlFor={`on-${c.id}`} className="text-xs">
                  On
                </Label>
                <Switch
                  id={`on-${c.id}`}
                  checked={c.enabled !== false}
                  onCheckedChange={async (value) => {
                    await api.patch(`/morning-meeting/templates/${template.id}/components/${c.id}`, {
                      enabled: value,
                    });
                    reload();
                  }}
                  data-testid="mm-config-enabled"
                />
              </div>
              <Button variant="ghost" size="icon" aria-label="Move up" onClick={() => reorder(index, -1)} data-testid="mm-config-up">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Move down" onClick={() => reorder(index, 1)} data-testid="mm-config-down">
                <ArrowDown className="h-4 w-4" />
              </Button>
              <ConfirmAction
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Remove" data-testid="mm-config-delete">
                    <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                  </Button>
                }
                title={`Remove ${c.title} from the sequence?`}
                description="You can add it back at any time."
                confirmLabel="Remove"
                onConfirm={async () => {
                  await api.delete(`/morning-meeting/templates/${template.id}/components/${c.id}`);
                  toast.success("Component removed");
                  reload();
                }}
              />
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
          <div>
            <Label htmlFor="mm-new">Add a component</Label>
            <Input
              id="mm-new"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g. Song of the week"
              className="mt-1.5 w-[210px]"
              data-testid="mm-new-title"
            />
          </div>
          <SymbolField value={draft.symbol_concept} onChange={(c) => setDraft({ ...draft, symbol_concept: c })} />
          <Button
            onClick={async () => {
              if (!draft.title.trim()) {
                toast.error("Give the component a name");
                return;
              }
              await api.post(`/morning-meeting/templates/${template.id}/components`, {
                title: draft.title.trim(),
                symbol_concept: draft.symbol_concept,
                script: draft.script,
              });
              toast.success("Component added");
              setDraft({ title: "", symbol_concept: "activity.crew_time", script: "" });
              reload();
            }}
            data-testid="mm-add-component"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </div>
      </SectionCard>

      <ExpectationsConfig expectations={expectations} reload={reload} />
    </div>
  );
}

function ExpectationsConfig({ expectations, reload }) {
  const [title, setTitle] = useState("");
  const [concept, setConcept] = useState("routine.expectations");

  return (
    <SectionCard
      title="Classroom expectations"
      description="Your expectations and the reminders under each one. Rename or replace them freely."
      testId="expectations-config"
    >
      <ul className="grid gap-3 md:grid-cols-3">
        {(expectations || []).map((e) => (
          <li key={e.id} className="wp-row p-4" data-testid="expectation-card">
            <div className="flex items-center gap-3">
              <SymbolImage conceptKey={e.symbol_concept} size="sm" alt="" />
              <Input
                defaultValue={e.title}
                onBlur={async (ev) => {
                  if (ev.target.value === e.title) return;
                  await api.patch(`/morning-meeting/expectations/${e.id}`, { title: ev.target.value });
                  toast.success("Expectation renamed");
                  reload();
                }}
                className="h-9"
                data-testid="expectation-title"
              />
              <ConfirmAction
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Delete" data-testid="expectation-delete">
                    <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                  </Button>
                }
                title={`Delete ${e.title}?`}
                description="This removes it from Morning Meeting."
                onConfirm={async () => {
                  await api.delete(`/morning-meeting/expectations/${e.id}`);
                  reload();
                }}
              />
            </div>
            <ul className="mt-3 space-y-2">
              {(e.children || []).map((c, index) => (
                <li key={c.id} className="flex items-center gap-2">
                  <SymbolImage conceptKey={c.symbol_concept} size="xs" alt="" />
                  <Input
                    defaultValue={c.title}
                    onBlur={async (ev) => {
                      const children = (e.children || []).map((x, n) =>
                        n === index ? { ...x, title: ev.target.value } : x
                      );
                      await api.patch(`/morning-meeting/expectations/${e.id}`, { children });
                      reload();
                    }}
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove reminder"
                    onClick={async () => {
                      const children = (e.children || []).filter((_, n) => n !== index);
                      await api.patch(`/morning-meeting/expectations/${e.id}`, { children });
                      reload();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={async () => {
                const children = [
                  ...(e.children || []),
                  { id: `c-${Date.now()}`, title: "New reminder", symbol_concept: "routine.expectations" },
                ];
                await api.patch(`/morning-meeting/expectations/${e.id}`, { children });
                reload();
              }}
              data-testid="expectation-add-child"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add reminder
            </Button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
        <div>
          <Label htmlFor="new-expectation">New expectation</Label>
          <Input
            id="new-expectation"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 w-[200px]"
            data-testid="new-expectation-title"
          />
        </div>
        <SymbolField value={concept} onChange={setConcept} />
        <Button
          onClick={async () => {
            if (!title.trim()) return;
            await api.post("/morning-meeting/expectations", {
              title: title.trim(),
              symbol_concept: concept,
              children: [],
            });
            toast.success("Expectation added");
            setTitle("");
            reload();
          }}
          data-testid="add-expectation"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add
        </Button>
      </div>
    </SectionCard>
  );
}
