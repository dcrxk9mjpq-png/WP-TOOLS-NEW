import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { say, stopSpeaking } from "@/lib/speech";
import { useApp } from "@/context/AppContext";
import { SymbolImage } from "@/components/Symbol";

export const formatClock = (totalSeconds) => {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Flatten a guided break into the exact list of steps that will be shown. */
export const buildTimeline = (item) => {
  const steps = item?.steps || [];
  const repeat = Math.max(1, Number(item?.repeat) || 1);
  const timeline = [];
  for (let round = 0; round < repeat; round += 1) {
    steps.forEach((step, index) => {
      timeline.push({
        ...step,
        key: `${round}-${step.id || index}`,
        round: round + 1,
        rounds: repeat,
      });
    });
  }
  return timeline;
};

/* Breathing circle scale per pattern, used when animation is switched off. */
const STATIC_SCALE = { in: 1, hold: 0.82, out: 0.62 };

const BreathingCircle = ({ pattern, seconds, running, motion }) => {
  const animation =
    motion && running && pattern
      ? `${pattern === "out" ? "wp-breathe-out" : pattern === "in" ? "wp-breathe-in" : "none"} ${seconds}s ease-in-out forwards`
      : "none";
  const staticScale = STATIC_SCALE[pattern] ?? 0.82;

  return (
    <div
      className="relative flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72"
      data-testid="brain-breaks-breathing-circle"
      data-pattern={pattern || "none"}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border-2 border-dashed border-[hsl(var(--wp-primary)/0.3)]"
      />
      <span
        aria-hidden="true"
        className="h-full w-full rounded-full bg-[hsl(var(--wp-primary-soft))] shadow-[inset_0_6px_0_0_hsl(0_0%_100%/0.7)]"
        style={
          animation !== "none"
            ? { animation, transform: `scale(${pattern === "out" ? 1 : 0.62})` }
            : { transform: `scale(${staticScale})`, transition: "transform 400ms ease-out" }
        }
      />
    </div>
  );
};

/**
 * Full-screen Brain Break runner. Shared by the staff screen and the
 * pupil-facing screen so a child always sees the identical thing whichever
 * device it is started from.
 *
 * Deliberately one thing at a time: the current step's symbol, the words, a
 * countdown, and nothing else. The narration is the classroom voice, so the
 * adult does not have to read the script aloud while also supporting a child.
 */
export const BrainBreakRunner = ({ item, pupilId, onClose, onFinished }) => {
  const { motion } = useApp();
  const timeline = useMemo(() => buildTimeline(item), [item]);
  const isGuided = timeline.length > 0;

  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(timeline[0]?.seconds || 0);
  const [running, setRunning] = useState(isGuided);
  const [narrate, setNarrate] = useState(true);
  const [finished, setFinished] = useState(false);
  const spokenFor = useRef(-1);
  const logged = useRef(false);

  const total = useMemo(
    () => timeline.reduce((sum, step) => sum + (step.seconds || 0), 0),
    [timeline]
  );
  const elapsed = useMemo(
    () =>
      timeline.slice(0, index).reduce((sum, step) => sum + (step.seconds || 0), 0) +
      ((timeline[index]?.seconds || 0) - remaining),
    [timeline, index, remaining]
  );

  const step = timeline[index];

  const logRun = useCallback(
    (completed) => {
      if (logged.current) return;
      logged.current = true;
      api
        .post("/brain-breaks/runs", { break_id: item.id, pupil_id: pupilId, completed })
        .catch(() => {});
    },
    [item.id, pupilId]
  );

  // Say the current step out loud, once, as it begins.
  useEffect(() => {
    if (!isGuided || !running || !narrate || !step) return;
    if (spokenFor.current === index) return;
    spokenFor.current = index;
    say(step.say || step.title, { pupilId });
  }, [index, isGuided, narrate, pupilId, running, step]);

  // The countdown. One interval that only ever ticks the clock down; a
  // separate effect decides what happens when it reaches zero. Keeping those
  // two jobs apart is what stops a step being skipped or repeated.
  useEffect(() => {
    if (!isGuided || !running || finished) return undefined;
    const timer = setInterval(() => setRemaining((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [finished, isGuided, running]);

  useEffect(() => {
    if (!isGuided || !running || finished || remaining > 0) return;
    if (index + 1 >= timeline.length) {
      setRunning(false);
      setFinished(true);
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setRemaining(timeline[nextIndex].seconds);
  }, [finished, index, isGuided, remaining, running, timeline]);

  useEffect(() => {
    if (!finished) return;
    stopSpeaking();
    if (narrate) say("Well done. That is the end of the break.", { pupilId });
    logRun(true);
    onFinished?.();
  }, [finished, logRun, narrate, onFinished, pupilId]);

  useEffect(() => () => stopSpeaking(), []);

  const restart = () => {
    stopSpeaking();
    spokenFor.current = -1;
    logged.current = false;
    setIndex(0);
    setRemaining(timeline[0]?.seconds || 0);
    setFinished(false);
    setRunning(true);
  };

  const close = () => {
    stopSpeaking();
    if (!finished) logRun(false);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-modal flex flex-col bg-[hsl(var(--wp-surface-cream))]"
      role="dialog"
      aria-modal="true"
      aria-label={`Brain break: ${item.title}`}
      data-testid="brain-breaks-runner"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] px-5 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <SymbolImage conceptKey={item.symbol_concept} size="sm" alt="" />
          <div className="min-w-0">
            <h2 className="wp-display truncate text-lg font-bold sm:text-xl">{item.title}</h2>
            <p className="wp-tabular text-xs font-medium text-[hsl(var(--wp-ink-muted))]">
              {formatClock(total)} · step {index + 1} of {timeline.length}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isGuided ? (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setNarrate((v) => !v);
                stopSpeaking();
              }}
              aria-label={narrate ? "Turn the voice off" : "Turn the voice on"}
              data-testid="brain-breaks-toggle-voice"
            >
              {narrate ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="icon"
            onClick={close}
            aria-label="Close the brain break"
            data-testid="brain-breaks-run-stop-button"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-5 py-8 text-center sm:px-8">
        {isGuided ? (
          <>
            {step?.pattern ? (
              <BreathingCircle
                pattern={step.pattern}
                seconds={step.seconds}
                running={running}
                motion={motion}
              />
            ) : (
              <SymbolImage conceptKey={step?.symbol_concept} size="hero" alt={step?.title} />
            )}

            <div>
              <p
                className="wp-display text-3xl font-bold leading-tight sm:text-5xl"
                data-testid="brain-breaks-step-title"
              >
                {finished ? "All finished. Well done." : step?.title}
              </p>
              {!finished && step?.rounds > 1 ? (
                <p className="mt-2 text-sm font-medium text-[hsl(var(--wp-ink-muted))]">
                  Round {step.round} of {step.rounds}
                </p>
              ) : null}
            </div>

            <p
              className="wp-display wp-tabular text-6xl font-bold leading-none text-[hsl(var(--wp-primary))] sm:text-7xl"
              data-testid="brain-breaks-timer"
              aria-live="off"
            >
              {finished ? formatClock(0) : formatClock(remaining)}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {finished ? (
                <Button size="xl" onClick={restart} className="gap-2" data-testid="brain-breaks-run-again">
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  Do it again
                </Button>
              ) : (
                <Button
                  size="xl"
                  onClick={() => {
                    if (running) stopSpeaking();
                    setRunning((v) => !v);
                  }}
                  className="gap-2"
                  data-testid="brain-breaks-run-start-button"
                >
                  {running ? (
                    <>
                      <Pause className="h-5 w-5" aria-hidden="true" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" aria-hidden="true" /> Start
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" size="xl" onClick={close} data-testid="brain-breaks-done">
                Done
              </Button>
            </div>
          </>
        ) : null}
      </div>

      {isGuided ? (
        <div className="border-t border-[hsl(var(--border))] px-5 py-4 sm:px-8">
          <Progress
            value={total ? Math.min(100, Math.round((elapsed / total) * 100)) : 0}
            className="h-2.5"
          />
        </div>
      ) : null}
    </div>
  );
};

/** Convenience hook: hold the break currently being run. */
export const useBrainBreakRunner = () => {
  const [active, setActive] = useState(null);
  const start = useCallback((item) => {
    if (!item?.steps?.length) {
      toast.error("This brain break has no steps yet.");
      return;
    }
    setActive(item);
  }, []);
  const stop = useCallback(() => setActive(null), []);
  return { active, start, stop };
};

export const purposeLabel = (purpose) =>
  ({ calm: "Calming", move: "Movement", focus: "Focus" }[purpose] || "Calming");

export const purposeTint = (purpose) =>
  ({ calm: "mint", move: "butter", focus: "sky" }[purpose] || "mint");

export const clayTone = (purpose) => ({ calm: 0, move: 3, focus: 1 }[purpose] ?? 0);

export const PURPOSES = ["calm", "move", "focus"];
