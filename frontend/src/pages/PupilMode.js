import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronLeft, Play, Sparkles } from "lucide-react";
import { Progress as Bar } from "@/components/ui/progress";
import { api, errorMessage, ZONE_INK, ZONE_TINTS } from "@/lib/api";
import { PupilSymbolTile, SymbolImage } from "@/components/Symbol";
import { useSpeaker } from "@/components/SpeakButton";
import { Loading } from "@/components/common";
import { VideoStage, videoLength } from "@/components/VideoPlayer";
import { BrainBreakRunner, formatClock } from "@/components/BrainBreakRunner";
import { cn } from "@/lib/utils";

/**
 * PUPIL-FACING MODE
 *
 * Built to a different set of rules from the staff side, on purpose:
 *
 * - One question per screen. Never two things competing for attention.
 * - Everything a child touches is a clay tile: big, soft, obviously pressable,
 *   at least 168px tall, with a colour it keeps every single day so it can be
 *   recognised before it can be read.
 * - Symbols first, words second. The canonical symbol is always the same
 *   symbol the adult is holding up on a card.
 * - Everything can be heard. Tapping a tile speaks it in the classroom voice.
 * - Nothing can be edited, nothing about any other child is shown, and there
 *   is no route into staff information.
 */

const Heading = ({ children, sub }) => (
  <header className="mb-[var(--wp-gap)]">
    <h1 className="wp-display text-3xl font-semibold leading-tight sm:text-4xl" data-testid="pupil-heading">
      {children}
    </h1>
    {sub ? (
      <p className="mt-1.5 text-lg text-[hsl(var(--wp-ink-muted))] sm:text-xl">{sub}</p>
    ) : null}
  </header>
);

/** A big clay panel. The building block of every pupil screen. */
const ClayPanel = ({ tone = 0, className, children, ...rest }) => (
  <section
    className={cn("wp-clay p-6 sm:p-7", className)}
    style={{ backgroundColor: `hsl(var(--wp-tile-${(Math.abs(tone) % 6) + 1}))` }}
    {...rest}
  >
    {children}
  </section>
);

/** The word "Now" / "Next" as a plain, calm label rather than a status chip. */
const ClayLabel = ({ children, testId }) => (
  <p
    className="wp-display text-base font-semibold uppercase tracking-[0.16em]"
    style={{ color: "hsl(var(--wp-tile-ink) / 0.72)" }}
    data-testid={testId}
  >
    {children}
  </p>
);

export default function PupilMode({ view }) {
  const { speak } = useSpeaker();
  const [today, setToday] = useState(null);
  const [board, setBoard] = useState([]);
  const [regulation, setRegulation] = useState(null);
  const [breaks, setBreaks] = useState([]);
  const [videos, setVideos] = useState([]);
  const [spoken, setSpoken] = useState(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [openZone, setOpenZone] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [running, setRunning] = useState(null);

  const load = useCallback(async () => {
    try {
      const [t, c, r, b, w] = await Promise.all([
        api.get("/today"),
        api.get("/communication/board").catch(() => ({ data: [] })),
        api.get("/regulation/board").catch(() => ({ data: null })),
        api.get("/brain-breaks", { params: { enabled_only: true } }).catch(() => ({ data: [] })),
        api
          .get("/watch", { params: { enabled_only: true, featured_only: true } })
          .catch(() => ({ data: [] })),
      ]);
      setToday(t.data);
      setBoard(c.data);
      setRegulation(r.data);
      setBreaks(b.data);
      setVideos(w.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
    // The board must follow the classroom clock without an adult refreshing it.
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  // Moving between tabs should always land on the top level of that tab.
  useEffect(() => {
    setOpenCategory(null);
    setOpenZone(null);
  }, [view]);

  const sayIt = useCallback(
    (text, id) => {
      speak(text);
      setSpoken(id);
      setTimeout(() => setSpoken(null), 1400);
    },
    [speak]
  );

  const currency = today?.gamification?.currency_name || "Sparks";
  const category = useMemo(
    () => board.find((c) => c.id === openCategory) || null,
    [board, openCategory]
  );
  const zone = useMemo(
    () => (regulation?.zones || []).find((z) => z.id === openZone) || null,
    [regulation, openZone]
  );

  if (!today) return <Loading label="Getting ready" />;

  /* ---------------------------------------------------------------- NOW */
  if (view === "now") {
    const nowLine = today.now ? `It is time for ${today.now.title}.` : "We are getting ready.";
    return (
      <div className="wp-stack" data-testid="pupil-now">
        <ClayPanel tone={0} className="text-center" data-testid="pupil-now-panel">
          <ClayLabel testId="pupil-now-label">Now</ClayLabel>
          {today.now ? (
            <button
              type="button"
              onClick={() => sayIt(nowLine, "now")}
              className="mt-4 flex w-full flex-col items-center gap-5 rounded-[var(--wp-radius-xl)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--wp-focus))]"
              aria-label={`${today.now.title}. Tap to hear it.`}
              data-testid="pupil-now-tile"
            >
              <SymbolImage
                conceptKey={today.now.symbol_concept}
                size="hero"
                alt={today.now.title}
                className={cn(
                  "shadow-[0_6px_18px_-6px_hsl(var(--wp-clay-shade)/0.7)]",
                  spoken === "now" && "ring-4 ring-[hsl(var(--wp-primary)/0.5)]"
                )}
              />
              <span
                className="wp-display text-4xl font-semibold leading-tight sm:text-6xl"
                style={{ color: "hsl(var(--wp-tile-ink))" }}
              >
                {today.now.title}
              </span>
              {today.now.start ? (
                <span
                  className="wp-tabular text-xl font-medium"
                  style={{ color: "hsl(var(--wp-tile-ink) / 0.7)" }}
                >
                  {today.now.start}
                  {today.now.end ? ` – ${today.now.end}` : ""}
                </span>
              ) : null}
            </button>
          ) : (
            <p
              className="wp-display mt-6 text-3xl font-semibold"
              style={{ color: "hsl(var(--wp-tile-ink))" }}
            >
              We are getting ready.
            </p>
          )}
        </ClayPanel>

        <ClayPanel tone={1} className="text-center" data-testid="pupil-next-panel">
          <ClayLabel>Next</ClayLabel>
          {today.next ? (
            <button
              type="button"
              onClick={() => sayIt(`Next is ${today.next.title}.`, "next")}
              className="mt-3 flex w-full flex-col items-center gap-4 rounded-[var(--wp-radius-xl)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--wp-focus))]"
              aria-label={`Next is ${today.next.title}. Tap to hear it.`}
              data-testid="pupil-next-tile"
            >
              <SymbolImage conceptKey={today.next.symbol_concept} size="xl" alt={today.next.title} />
              <span
                className="wp-display text-3xl font-semibold leading-tight sm:text-4xl"
                style={{ color: "hsl(var(--wp-tile-ink))" }}
              >
                {today.next.title}
              </span>
            </button>
          ) : (
            <p
              className="wp-display mt-3 text-2xl font-semibold"
              style={{ color: "hsl(var(--wp-tile-ink))" }}
            >
              Nothing after this.
            </p>
          )}
        </ClayPanel>
      </div>
    );
  }

  /* ---------------------------------------------------------------- DAY */
  if (view === "day") {
    const items = today.items || [];
    return (
      <section data-testid="pupil-day">
        <Heading sub={`${today.progress?.done || 0} of ${today.progress?.total || 0} finished`}>
          My day
        </Heading>
        {items.length ? (
          <ul className="wp-stack">
            {items.map((item, index) => {
              const isNow = today.now && item.id === today.now.id;
              const isDone = item.status === "done";
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => sayIt(item.title, item.id)}
                    className={cn(
                      "wp-clay flex w-full items-center gap-5 p-4 text-left sm:gap-6 sm:p-5",
                      isDone && "opacity-55",
                      isNow && "ring-4 ring-[hsl(var(--wp-primary)/0.55)]"
                    )}
                    style={{
                      backgroundColor: isNow
                        ? "hsl(var(--wp-tile-1))"
                        : `hsl(var(--wp-tile-${(index % 6) + 1}) / ${isDone ? 0.5 : 1})`,
                    }}
                    aria-label={`${item.title}${isNow ? ", happening now" : ""}${
                      isDone ? ", finished" : ""
                    }`}
                    data-testid="pupil-day-row"
                  >
                    <SymbolImage conceptKey={item.symbol_concept} size="lg" alt="" />
                    <span className="min-w-0 flex-1">
                      {isNow ? <ClayLabel>Now</ClayLabel> : null}
                      <span
                        className={cn(
                          "wp-display block truncate text-2xl font-semibold sm:text-3xl",
                          isDone && "line-through"
                        )}
                        style={{ color: "hsl(var(--wp-tile-ink))" }}
                      >
                        {item.title}
                      </span>
                      {item.start ? (
                        <span
                          className="wp-tabular mt-0.5 block text-lg font-medium"
                          style={{ color: "hsl(var(--wp-tile-ink) / 0.7)" }}
                        >
                          {item.start}
                        </span>
                      ) : null}
                    </span>
                    {isDone ? (
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/80"
                        aria-hidden="true"
                      >
                        <Check className="h-7 w-7 text-[hsl(var(--wp-primary-700))]" />
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <ClayPanel tone={2}>
            <p className="wp-display text-2xl font-semibold" style={{ color: "hsl(var(--wp-tile-ink))" }}>
              Nothing planned yet.
            </p>
          </ClayPanel>
        )}
      </section>
    );
  }

  /* --------------------------------------------------------------- TALK */
  if (view === "talk") {
    // Two steps: choose what you want to talk about, then choose the words.
    // One decision at a time is the whole point.
    if (category) {
      return (
        <section data-testid="pupil-talk-options">
          <BackButton onClick={() => setOpenCategory(null)} label="All the things I can say" />
          <div className="mb-[var(--wp-gap)] flex items-center gap-4">
            <SymbolImage conceptKey={category.symbol_concept} size="lg" alt="" />
            <h1 className="wp-display text-3xl font-semibold sm:text-4xl">{category.title}</h1>
          </div>
          <div className="grid grid-cols-2 gap-[var(--wp-gap)] sm:grid-cols-3">
            {(category.options || []).map((option, index) => (
              <PupilSymbolTile
                key={option.id}
                conceptKey={option.symbol_concept}
                label={option.text}
                tone={index}
                selected={spoken === option.id}
                onClick={() => {
                  sayIt(option.speech_text || option.text, option.id);
                  api.post("/communication/used", { option_id: option.id }).catch(() => {});
                }}
                testId="pupil-communication-tile"
              />
            ))}
          </div>
        </section>
      );
    }
    return (
      <section data-testid="pupil-talk">
        <Heading sub="Choose what you want to say">I can say</Heading>
        <div className="grid grid-cols-2 gap-[var(--wp-gap)] sm:grid-cols-3">
          {board.map((cat, index) => (
            <PupilSymbolTile
              key={cat.id}
              conceptKey={cat.symbol_concept}
              label={cat.title}
              tone={index}
              onClick={() => {
                setOpenCategory(cat.id);
                speak(cat.title);
              }}
              testId="pupil-communication-category"
            />
          ))}
        </div>
      </section>
    );
  }

  /* --------------------------------------------------------------- FEEL */
  if (view === "feel") {
    if (zone) {
      const strategies = (regulation?.strategies || []).filter(
        (s) => !s.zone_id || s.zone_id === zone.id
      );
      return (
        <section data-testid="pupil-zone-detail">
          <BackButton onClick={() => setOpenZone(null)} label="All the feelings" />
          <div
            className="wp-clay mb-[var(--wp-gap)] p-6"
            style={{ backgroundColor: ZONE_TINTS[zone.colour] }}
          >
            <h1
              className="wp-display text-3xl font-semibold sm:text-4xl"
              style={{ color: ZONE_INK[zone.colour] }}
            >
              {zone.name}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {(zone.feelings || []).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => sayIt(`I feel ${f}.`, f)}
                  className={cn(
                    "min-h-[56px] rounded-full bg-white/85 px-5 text-xl font-semibold",
                    "transition-transform duration-150 active:scale-[0.97]",
                    spoken === f && "ring-4 ring-[hsl(var(--wp-primary)/0.5)]"
                  )}
                  style={{ color: ZONE_INK[zone.colour] }}
                  data-testid="pupil-feeling-chip"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <h2 className="wp-display mb-[var(--wp-gap)] text-2xl font-semibold sm:text-3xl">
            What can help me
          </h2>
          <div className="grid grid-cols-2 gap-[var(--wp-gap)] sm:grid-cols-3">
            {strategies.map((s, index) => (
              <PupilSymbolTile
                key={s.id}
                conceptKey={s.symbol_concept}
                label={s.title}
                tone={index}
                selected={spoken === s.id}
                onClick={() => sayIt(s.title, s.id)}
                testId="pupil-strategy-tile"
              />
            ))}
          </div>
        </section>
      );
    }
    return (
      <section data-testid="pupil-feel">
        <Heading sub="Choose the colour that matches you">How I feel</Heading>
        <div className="grid gap-[var(--wp-gap)] sm:grid-cols-2">
          {(regulation?.zones || []).map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => {
                setOpenZone(z.id);
                speak(z.name);
              }}
              className="wp-clay flex min-h-[168px] flex-col items-start justify-between gap-3 p-6 text-left"
              style={{ backgroundColor: ZONE_TINTS[z.colour] }}
              data-testid="pupil-zone-card"
            >
              <span
                className="wp-display text-3xl font-semibold sm:text-4xl"
                style={{ color: ZONE_INK[z.colour] }}
              >
                {z.name}
              </span>
              <span
                className="text-lg font-medium leading-snug"
                style={{ color: ZONE_INK[z.colour] }}
              >
                {(z.feelings || []).slice(0, 3).join(" · ")}
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  /* -------------------------------------------------------------- WATCH */
  if (view === "watch") {
    return (
      <section data-testid="pupil-watch">
        <Heading sub="Today's videos">Watch</Heading>
        {videos.length ? (
          <div className="grid gap-[var(--wp-gap)] sm:grid-cols-2">
            {videos.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPlaying(item)}
                className="wp-clay flex min-h-[168px] items-center gap-5 p-5 text-left"
                style={{ backgroundColor: `hsl(var(--wp-tile-${(index % 6) + 1}))` }}
                aria-label={`Watch ${item.title}`}
                data-testid="pupil-watch-tile"
              >
                <span className="relative block w-32 shrink-0 sm:w-40">
                  <span className="block aspect-video w-full overflow-hidden rounded-[var(--wp-radius-lg)] bg-white shadow-[0_3px_10px_-3px_hsl(var(--wp-clay-shade)/0.6)]">
                    {item.video?.thumbnail_url ? (
                      <img
                        src={item.video.thumbnail_url}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <SymbolImage
                        conceptKey={item.symbol_concept}
                        size="md"
                        alt=""
                        framed={false}
                        className="h-full w-full"
                      />
                    )}
                  </span>
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/92 text-[hsl(var(--wp-primary-700))]">
                      <Play className="h-6 w-6" aria-hidden="true" />
                    </span>
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="wp-display block text-2xl font-semibold leading-tight sm:text-3xl"
                    style={{ color: "hsl(var(--wp-tile-ink))" }}
                  >
                    {item.title}
                  </span>
                  {videoLength(item.duration_seconds) ? (
                    <span
                      className="wp-tabular mt-1 block text-lg font-medium"
                      style={{ color: "hsl(var(--wp-tile-ink) / 0.7)" }}
                    >
                      {videoLength(item.duration_seconds)}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <ClayPanel tone={2}>
            <p className="wp-display text-2xl font-semibold" style={{ color: "hsl(var(--wp-tile-ink))" }}>
              No videos today.
            </p>
          </ClayPanel>
        )}
        {playing ? <VideoStage item={playing} onClose={() => setPlaying(null)} /> : null}
      </section>
    );
  }

  /* ------------------------------------------------------------- BREAKS */
  if (view === "breaks") {
    return (
      <section data-testid="pupil-breaks">
        <Heading sub="A short break for my body">Brain break</Heading>
        {breaks.length ? (
          <div className="grid gap-[var(--wp-gap)] sm:grid-cols-2">
            {breaks.map((item, index) => (
              <PupilSymbolTile
                key={item.id}
                conceptKey={item.symbol_concept}
                label={item.title}
                tone={index}
                onClick={() => setRunning(item)}
                testId="pupil-brain-break-tile"
                trailing={
                  <span
                    className="wp-tabular rounded-full bg-white/80 px-3 py-1 text-base font-semibold"
                    style={{ color: "hsl(var(--wp-tile-ink))" }}
                  >
                    {formatClock(item.duration_seconds)}
                  </span>
                }
              />
            ))}
          </div>
        ) : (
          <ClayPanel tone={2}>
            <p className="wp-display text-2xl font-semibold" style={{ color: "hsl(var(--wp-tile-ink))" }}>
              No brain breaks yet.
            </p>
          </ClayPanel>
        )}
        {running ? <BrainBreakRunner item={running} onClose={() => setRunning(null)} /> : null}
      </section>
    );
  }

  /* ------------------------------------------------------------- SPARKS */
  const goal = today.sparks?.goal;
  return (
    <section data-testid="pupil-sparks">
      <Heading sub="What our class has earned">Our {currency}</Heading>
      <ClayPanel tone={3} className="flex flex-col items-center gap-3 text-center">
        <Sparkles className="h-14 w-14" style={{ color: "hsl(var(--wp-tile-ink) / 0.8)" }} aria-hidden="true" />
        <p
          className="wp-display wp-tabular text-7xl font-semibold leading-none"
          style={{ color: "hsl(var(--wp-tile-ink))" }}
          data-testid="pupil-sparks-total"
        >
          {today.sparks?.class_total || 0}
        </p>
        <p className="text-xl font-medium" style={{ color: "hsl(var(--wp-tile-ink) / 0.75)" }}>
          {today.sparks?.today || 0} today
        </p>
        {goal ? (
          <div className="mt-4 w-full max-w-md">
            <p
              className="wp-display mb-2 text-2xl font-semibold"
              style={{ color: "hsl(var(--wp-tile-ink))" }}
            >
              {goal.title}
            </p>
            <Bar
              value={Math.min(
                100,
                Math.round(((today.sparks?.class_total || 0) / (goal.target || 1)) * 100)
              )}
              className="h-5 bg-white/70"
            />
            <p className="mt-3 text-xl font-medium" style={{ color: "hsl(var(--wp-tile-ink))" }}>
              {goal.reward}
            </p>
          </div>
        ) : null}
      </ClayPanel>
    </section>
  );
}

const BackButton = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className="mb-5 inline-flex min-h-[64px] items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 text-xl font-semibold transition-transform duration-150 active:scale-[0.98]"
    data-testid="pupil-back"
  >
    <ChevronLeft className="h-7 w-7" aria-hidden="true" />
    Back
    <span className="sr-only"> to {label}</span>
  </button>
);
