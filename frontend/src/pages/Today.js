import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Dices,
  Eye,
  Lightbulb,
  MessageCircle,
  Pencil,
  Sun,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api, errorMessage, formatLongDate, formatTimeAgo, tint } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { SymbolImage, SymbolTile } from "@/components/Symbol";
import {
  EmptyState,
  Loading,
  PageHeader,
  PupilAvatar,
  SampleDataBanner,
  SectionCard,
  StatusChip,
} from "@/components/common";
import { QuickObservationSheet } from "@/components/QuickObservation";

const QUICK_ACTIONS = [
  { to: "/morning-meeting", label: "Morning Meeting", concept: "activity.crew_time", permission: "morning_meeting.run", feature: "morning_meeting" },
  { to: "/communication", label: "Communication", concept: "comm.communication", permission: "comm.view", feature: "communication" },
  { to: "/regulation", label: "Regulation", concept: "regulation.zones", permission: "regulation.view", feature: "regulation" },
  { to: "/pickers", label: "Pick a child", concept: "system.picker", permission: "pickers.use", feature: "pickers" },
  { to: "/prepare-me", label: "Prepare Me", concept: "system.prepare_me", permission: "prepare_me.view", feature: "prepare_me" },
  { to: "/jobs", label: "Classroom jobs", concept: "job.job", permission: "jobs.view", feature: "jobs" },
];

export default function Today() {
  const { can, features, user } = useApp();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: payload } = await api.get("/today");
      setData(payload);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const advance = async () => {
    setBusy(true);
    try {
      await api.post("/timetable/day/advance");
      await load();
      toast.success("Moved on to the next activity");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <Loading label="Opening today" />;

  const progressPct = data.progress?.total
    ? Math.round((data.progress.done / data.progress.total) * 100)
    : 0;
  const gamOn = data.gamification?.enabled && data.gamification?.show_on_today !== false;

  return (
    <div className="wp-stack">
      <SampleDataBanner />

      <PageHeader
        eyebrow={formatLongDate(data.date)}
        title={`${data.classroom_name} today`}
        description={`Welcome ${user?.name?.split(" ")[0] || ""}. Here is what is happening now, next and later.`}
        actions={
          <>
            {can("timetable.edit") ? (
              <Button asChild variant="outline" className="gap-2" data-testid="today-edit-timetable">
                <Link to="/timetable">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Change today
                </Link>
              </Button>
            ) : null}
            {can("morning_meeting.run") && features.morning_meeting !== false ? (
              <Button asChild className="gap-2" data-testid="today-start-morning-meeting">
                <Link to="/morning-meeting">
                  <Sun className="h-4 w-4" aria-hidden="true" />
                  Morning Meeting
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid items-start gap-[var(--wp-gap)] lg:grid-cols-3">
        {/* NOW */}
        <section
          className="wp-card relative overflow-hidden p-6 lg:col-span-2"
          data-testid="today-now-card"
        >
          <span
            className="absolute inset-y-0 left-0 w-2 bg-[hsl(var(--wp-state-now))]"
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusChip status="current" />
            {data.now?.start ? (
              <span className="text-sm font-semibold text-[hsl(var(--wp-ink-muted))]">
                {data.now.start}
                {data.now.end ? ` – ${data.now.end}` : ""}
              </span>
            ) : null}
          </div>

          {data.now ? (
            <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <SymbolImage conceptKey={data.now.symbol_concept} size="hero" alt={data.now.title} />
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h2 className="wp-display text-3xl font-bold leading-tight sm:text-4xl">
                  {data.now.title}
                </h2>
                {data.now.note ? (
                  <p className="mt-2 text-sm text-[hsl(var(--wp-ink-muted))]">{data.now.note}</p>
                ) : null}
                {can("timetable.edit") ? (
                  <Button
                    onClick={advance}
                    disabled={busy}
                    className="mt-5 h-12 gap-2 text-base"
                    data-testid="today-finish-and-next"
                  >
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    Finished — move on
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="Nothing is marked as happening now"
                description="Open the timetable and mark an activity as Now, or load a template for today."
                action={
                  can("timetable.edit") ? (
                    <Button asChild data-testid="today-open-timetable">
                      <Link to="/timetable">Open the timetable</Link>
                    </Button>
                  ) : null
                }
              />
            </div>
          )}

          {data.progress?.total ? (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-[hsl(var(--wp-ink-muted))]">
                <span>Our day so far</span>
                <span data-testid="today-progress-label">
                  {data.progress.done} of {data.progress.total} finished
                </span>
              </div>
              <Progress value={progressPct} className="h-2.5" />
            </div>
          ) : null}
        </section>

        {/* NEXT + LATER */}
        <div className="wp-stack">
          <section className="wp-card p-5" data-testid="today-next-card">
            <StatusChip status="next" />
            {data.next ? (
              <div className="mt-4 flex items-center gap-4">
                <SymbolImage conceptKey={data.next.symbol_concept} size="lg" alt={data.next.title} />
                <div className="min-w-0">
                  <h3 className="wp-display text-xl font-bold leading-tight">{data.next.title}</h3>
                  {data.next.start ? (
                    <p className="mt-1 text-sm text-[hsl(var(--wp-ink-muted))]">{data.next.start}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[hsl(var(--wp-ink-muted))]">
                Nothing scheduled after this.
              </p>
            )}
          </section>

          <section className="wp-card p-5" data-testid="today-later-card">
            <StatusChip status="later" />
            {data.later?.length ? (
              <ul className="mt-4 space-y-2">
                {data.later.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <SymbolImage conceptKey={item.symbol_concept} size="xs" alt={item.title} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                    {item.start ? (
                      <span className="text-xs text-[hsl(var(--wp-ink-muted))]">{item.start}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[hsl(var(--wp-ink-muted))]">Nothing else planned.</p>
            )}
          </section>

          {gamOn ? (
            <section
              className="wp-card p-5"
              style={{ backgroundColor: tint("butter") }}
              data-testid="today-sparks-card"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[hsl(35_70%_30%)]" aria-hidden="true" />
                <h3 className="font-semibold">{data.gamification?.currency_name || "Sparks"}</h3>
              </div>
              <p className="wp-display mt-3 text-3xl font-bold">{data.sparks?.class_total || 0}</p>
              <p className="text-xs text-[hsl(var(--wp-ink-muted))]">
                {data.sparks?.today || 0} earned today by the whole class
              </p>
              {data.sparks?.goal ? (
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-medium">{data.sparks.goal.title}</p>
                  <Progress
                    value={Math.min(
                      100,
                      Math.round(((data.sparks.class_total || 0) / (data.sparks.goal.target || 1)) * 100)
                    )}
                    className="h-2"
                  />
                </div>
              ) : null}
              <Button asChild variant="outline" size="sm" className="mt-4 w-full bg-white" data-testid="today-open-sparks">
                <Link to="/sparks">Award {data.gamification?.currency_name || "Sparks"}</Link>
              </Button>
            </section>
          ) : null}
        </div>
      </div>

      {/* quick actions */}
      <SectionCard title="Classroom tools" description="The same tools, always in the same place.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIONS.filter(
            (a) => (!a.permission || can(a.permission)) && (!a.feature || features[a.feature] !== false)
          ).map((action) => (
            <Link key={action.to} to={action.to} data-testid={`quick-action-${action.to.replace(/\//g, "")}`}>
              <SymbolTile conceptKey={action.concept} label={action.label} size="md" showLabel />
            </Link>
          ))}
          {can("observation.create") ? (
            <button type="button" onClick={() => setObsOpen(true)} data-testid="quick-action-observation">
              <SymbolTile conceptKey="system.observation" label="Observation" size="md" showLabel />
            </button>
          ) : null}
        </div>
      </SectionCard>

      <div className="grid gap-[var(--wp-gap)] lg:grid-cols-2">
        {can("jobs.view") && features.jobs !== false ? (
          <SectionCard
            title="Today's classroom jobs"
            actions={
              <Button asChild variant="outline" size="sm" data-testid="today-manage-jobs">
                <Link to="/jobs">
                  Manage <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            }
            testId="today-jobs"
          >
            {data.jobs?.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {data.jobs.map((job) => (
                  <li key={job.id} className="wp-row flex items-center gap-3 p-3">
                    <SymbolImage conceptKey={job.symbol_concept} size="sm" alt={job.title} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{job.title}</p>
                      <p className="truncate text-xs text-[hsl(var(--wp-ink-muted))]">
                        {job.pupil ? job.pupil.display_name : "Not assigned yet"}
                      </p>
                    </div>
                    {job.pupil ? <PupilAvatar pupil={job.pupil} size={34} context="jobs" /> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No classroom jobs yet"
                description="Create the jobs your classroom actually uses — nothing is pre-set."
              />
            )}
          </SectionCard>
        ) : null}

        {can("observation.view") ? (
          <SectionCard
            title="Recent observations"
            actions={
              <Button asChild variant="outline" size="sm" data-testid="today-all-observations">
                <Link to="/observations">
                  All <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            }
            testId="today-observations"
          >
            {data.recent_observations?.length ? (
              <ul className="space-y-2">
                {data.recent_observations.map((o) => (
                  <li key={o.id} className="wp-row flex items-center gap-3 p-3">
                    {o.pupil ? <PupilAvatar pupil={o.pupil} size={34} context="profile" /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {o.pupil?.display_name} · {o.area}
                      </p>
                      <p className="truncate text-xs text-[hsl(var(--wp-ink-muted))]">
                        {o.support_level}
                        {o.note ? ` — ${o.note}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[hsl(var(--wp-ink-muted))]">
                      {formatTimeAgo(o.at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No observations recorded yet"
                description="Recording takes about ten seconds and builds the progress picture over time."
                action={
                  can("observation.create") ? (
                    <Button onClick={() => setObsOpen(true)} data-testid="today-empty-add-observation">
                      Record one now
                    </Button>
                  ) : null
                }
              />
            )}
          </SectionCard>
        ) : null}
      </div>

      <QuickObservationSheet open={obsOpen} onOpenChange={setObsOpen} onSaved={load} />
    </div>
  );
}
