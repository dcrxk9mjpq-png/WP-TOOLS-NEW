import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  Pencil,
  Play,
  Sparkles,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api, errorMessage, formatLongDate, formatTimeAgo, tint } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { SymbolImage, SymbolTile } from "@/components/Symbol";
import { SpeakButton } from "@/components/SpeakButton";
import {
  EmptyState,
  Loading,
  NowSourceNote,
  PageHeader,
  PupilAvatar,
  SampleDataBanner,
  SectionCard,
  StatusChip,
} from "@/components/common";
import { QuickObservationSheet } from "@/components/QuickObservation";
import {
  VideoStage,
  VideoThumb,
  collectionLabel,
  videoLength,
} from "@/components/VideoPlayer";

const QUICK_ACTIONS = [
  { to: "/morning-meeting", label: "Morning Meeting", concept: "activity.crew_time", permission: "morning_meeting.run", feature: "morning_meeting" },
  { to: "/communication", label: "Communication", concept: "comm.communication", permission: "comm.view", feature: "communication" },
  { to: "/regulation", label: "Regulation", concept: "regulation.zones", permission: "regulation.view", feature: "regulation" },
  { to: "/brain-breaks", label: "Brain break", concept: "resource.brain_break", permission: "brain_breaks.view", feature: "brain_breaks" },
  { to: "/watch", label: "Watch", concept: "resource.good_morning_song", permission: "watch.view", feature: "watch" },
  { to: "/pickers", label: "Pick a child", concept: "system.picker", permission: "pickers.use", feature: "pickers" },
  { to: "/prepare-me", label: "Prepare Me", concept: "system.prepare_me", permission: "prepare_me.view", feature: "prepare_me" },
  { to: "/jobs", label: "Classroom jobs", concept: "job.job", permission: "jobs.view", feature: "jobs" },
];

export default function Today() {
  const { can, features, user } = useApp();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const [playing, setPlaying] = useState(null);

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
    // The board has to stay true to the clock without anybody refreshing it.
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  const act = async (request, message) => {
    setBusy(true);
    try {
      await request();
      await load();
      toast.success(message);
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
  const nowLine = data.now
    ? `It is time for ${data.now.title}.`
    : "We are getting ready.";

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
              <Button asChild variant="outline" className="min-h-[44px] gap-2" data-testid="today-edit-timetable">
                <Link to="/timetable">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Change today
                </Link>
              </Button>
            ) : null}
            {can("morning_meeting.run") && features.morning_meeting !== false ? (
              <Button asChild className="min-h-[44px] gap-2" data-testid="today-start-morning-meeting">
                <Link to="/morning-meeting">
                  <Sun className="h-4 w-4" aria-hidden="true" />
                  Morning Meeting
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-[var(--wp-gap)] lg:grid-cols-3 lg:items-stretch">
        {/* NOW */}
        <section
          className="wp-card relative flex flex-col overflow-hidden lg:col-span-2"
          data-testid="today-now-card"
        >
          <span
            className="absolute inset-y-0 left-0 w-1.5 bg-[hsl(var(--wp-state-now))]"
            aria-hidden="true"
          />
          <div className="flex flex-1 flex-col p-[var(--wp-card-pad)] pl-[calc(var(--wp-card-pad)+0.5rem)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <StatusChip status="current" />
                <NowSourceNote source={data.now_source} />
              </div>
              {data.now?.start ? (
                <span className="wp-tabular inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--wp-ink-muted))]">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {data.now.start}
                  {data.now.end ? ` – ${data.now.end}` : ""}
                </span>
              ) : null}
            </div>

            {data.now ? (
              <div className="mt-[var(--wp-card-pad)] flex flex-1 flex-col justify-center gap-5 sm:flex-row sm:items-center">
                <SymbolImage conceptKey={data.now.symbol_concept} size="hero" alt={data.now.title} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <h2 className="wp-display min-w-0 flex-1 text-3xl font-bold leading-[1.1] sm:text-[2.5rem]">
                      {data.now.title}
                    </h2>
                    <SpeakButton
                      text={nowLine}
                      size="lg"
                      label={`Say "${nowLine}" out loud`}
                      testId="today-speak-now"
                    />
                  </div>
                  {data.now.note ? (
                    <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--wp-ink-muted))]">
                      {data.now.note}
                    </p>
                  ) : null}
                  {can("timetable.edit") ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button
                        onClick={() =>
                          act(() => api.post("/timetable/day/advance"), "Moved on to the next activity")
                        }
                        disabled={busy}
                        className="min-h-[48px] gap-2 text-base"
                        data-testid="today-finish-and-next"
                      >
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        Finished — move on
                      </Button>
                      {data.now_source === "staff" ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            act(
                              () => api.post("/timetable/day/follow-clock"),
                              "Following the classroom clock again"
                            )
                          }
                          disabled={busy}
                          className="min-h-[48px] gap-2"
                          data-testid="today-follow-clock"
                        >
                          <Clock className="h-4 w-4" aria-hidden="true" />
                          Follow the clock
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-[var(--wp-card-pad)]">
                <EmptyState
                  icon={Clock}
                  title="Nothing is happening right now"
                  description="Either the timetable has no activity at this time of day, or today has not been set up yet. Activities with a start and end time light up automatically when the classroom clock reaches them."
                  action={
                    can("timetable.edit") ? (
                      <Button asChild data-testid="today-open-timetable" className="min-h-[44px]">
                        <Link to="/timetable">Open the timetable</Link>
                      </Button>
                    ) : null
                  }
                />
              </div>
            )}

            {data.progress?.total ? (
              <div className="mt-[var(--wp-card-pad)] border-t border-[hsl(var(--border))] pt-4">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--wp-ink-faint))]">
                  <span>Our day so far</span>
                  <span className="wp-tabular" data-testid="today-progress-label">
                    {data.progress.done} of {data.progress.total} finished
                  </span>
                </div>
                <Progress value={progressPct} className="h-2.5" />
              </div>
            ) : null}
          </div>
        </section>

        {/* NEXT + LATER */}
        <div className="wp-stack">
          <section className="wp-card wp-pad" data-testid="today-next-card">
            <StatusChip status="next" />
            {data.next ? (
              <div className="mt-4 flex items-center gap-4">
                <SymbolImage conceptKey={data.next.symbol_concept} size="lg" alt={data.next.title} />
                <div className="min-w-0">
                  <h3 className="wp-display text-xl font-bold leading-tight">{data.next.title}</h3>
                  {data.next.start ? (
                    <p className="wp-tabular mt-1 text-sm font-medium text-[hsl(var(--wp-ink-muted))]">
                      {data.next.start}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[hsl(var(--wp-ink-muted))]">
                Nothing scheduled after this.
              </p>
            )}
          </section>

          <section className="wp-card wp-pad" data-testid="today-later-card">
            <StatusChip status="later" />
            {data.later?.length ? (
              <ul className="mt-4 space-y-1.5">
                {data.later.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-1">
                    <SymbolImage conceptKey={item.symbol_concept} size="xs" alt={item.title} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.title}</span>
                    {item.start ? (
                      <span className="wp-tabular shrink-0 text-xs font-medium text-[hsl(var(--wp-ink-faint))]">
                        {item.start}
                      </span>
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
              className="wp-card wp-pad"
              style={{ backgroundColor: tint("butter") }}
              data-testid="today-sparks-card"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[hsl(var(--wp-warning))]" aria-hidden="true" />
                <h3 className="wp-display font-bold">{data.gamification?.currency_name || "Sparks"}</h3>
              </div>
              <p className="wp-display wp-tabular mt-3 text-3xl font-bold leading-none">
                {data.sparks?.class_total || 0}
              </p>
              <p className="mt-1.5 text-xs font-medium text-[hsl(var(--wp-ink-muted))]">
                {data.sparks?.today || 0} earned today by the whole class
              </p>
              {data.sparks?.goal ? (
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-semibold">{data.sparks.goal.title}</p>
                  <Progress
                    value={Math.min(
                      100,
                      Math.round(((data.sparks.class_total || 0) / (data.sparks.goal.target || 1)) * 100)
                    )}
                    className="h-2"
                  />
                </div>
              ) : null}
              <Button
                asChild
                variant="outline"
                className="mt-4 min-h-[44px] w-full bg-[hsl(var(--card))]"
                data-testid="today-open-sparks"
              >
                <Link to="/sparks">Award {data.gamification?.currency_name || "Sparks"}</Link>
              </Button>
            </section>
          ) : null}
        </div>
      </div>

      {/* quick actions */}
      <SectionCard title="Classroom tools" description="The same tools, always in the same place.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {QUICK_ACTIONS.filter(
            (a) => (!a.permission || can(a.permission)) && (!a.feature || features[a.feature] !== false)
          ).map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="rounded-[var(--wp-radius-xl)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wp-focus))]"
              data-testid={`quick-action-${action.to.replace(/\//g, "")}`}
            >
              <SymbolTile conceptKey={action.concept} label={action.label} size="md" showLabel />
            </Link>
          ))}
          {can("observation.create") ? (
            <button
              type="button"
              onClick={() => setObsOpen(true)}
              className="rounded-[var(--wp-radius-xl)]"
              data-testid="quick-action-observation"
            >
              <SymbolTile conceptKey="system.observation" label="Observation" size="md" showLabel />
            </button>
          ) : null}
        </div>
      </SectionCard>

      {/* today's videos */}
      {can("watch.view") && features.watch !== false && data.watch?.length ? (
        <SectionCard
          title="Today's videos"
          description="The short set chosen for today. Children see exactly these on their own screen."
          actions={
            can("watch.edit") ? (
              <Button asChild variant="outline" size="sm" className="min-h-[40px]" data-testid="today-manage-watch">
                <Link to="/watch">
                  Manage <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null
          }
          testId="today-watch"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {data.watch.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPlaying(item)}
                className="group wp-row overflow-hidden p-0 text-left transition-[box-shadow,border-color] duration-150 hover:border-[hsl(var(--wp-primary)/0.4)] hover:shadow-[var(--wp-shadow-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wp-focus))]"
                data-testid={`today-watch-${item.id}`}
              >
                <span className="relative block">
                  <VideoThumb item={item} className="rounded-none border-0 border-b" />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--card))]/92 text-[hsl(var(--wp-primary-700))] shadow-[var(--wp-shadow-sm)] transition-transform duration-150 group-hover:scale-105">
                      <Play className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </span>
                </span>
                <span className="block p-3">
                  <span className="block truncate text-sm font-semibold">{item.title}</span>
                  <span className="wp-tabular mt-0.5 block text-xs text-[hsl(var(--wp-ink-muted))]">
                    {collectionLabel(item.collection)}
                    {videoLength(item.duration_seconds) ? ` · ${videoLength(item.duration_seconds)}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-[var(--wp-gap)] lg:grid-cols-2">
        {can("jobs.view") && features.jobs !== false ? (
          <SectionCard
            title="Today's classroom jobs"
            actions={
              <Button asChild variant="outline" size="sm" className="min-h-[40px]" data-testid="today-manage-jobs">
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
                  <li
                    key={job.id}
                    className="wp-row flex items-center gap-3 p-[var(--wp-row-pad)]"
                  >
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
                icon={Briefcase}
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
              <Button asChild variant="outline" size="sm" className="min-h-[40px]" data-testid="today-all-observations">
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
                  <li key={o.id} className="wp-row flex items-center gap-3 p-[var(--wp-row-pad)]">
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
                    <span className="shrink-0 text-xs text-[hsl(var(--wp-ink-faint))]">
                      {formatTimeAgo(o.at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Eye}
                title="No observations recorded yet"
                description="Recording takes about ten seconds and builds the progress picture over time."
                action={
                  can("observation.create") ? (
                    <Button
                      onClick={() => setObsOpen(true)}
                      className="min-h-[44px]"
                      data-testid="today-empty-add-observation"
                    >
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
      {playing ? <VideoStage item={playing} onClose={() => setPlaying(null)} /> : null}
    </div>
  );
}
