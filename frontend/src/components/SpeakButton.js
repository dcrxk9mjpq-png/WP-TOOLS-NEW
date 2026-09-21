import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { say, stopSpeaking } from "@/lib/speech";
import { useApp } from "@/context/AppContext";

/**
 * The one way anything in this platform is spoken aloud.
 *
 * Three states, always visible: ready, fetching the voice, speaking. A member
 * of staff or a child needs to know whether the tap worked before the sound
 * arrives, otherwise they tap again.
 */
export const useSpeaker = (defaults = {}) => {
  const { pupilVoice } = useApp();
  const [state, setState] = useState("idle"); // idle | loading | speaking
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const speak = useCallback(
    async (text, options = {}) => {
      const phrase = String(text || "").trim();
      if (!phrase) return;
      setState("loading");
      const voice = options.voice ?? defaults.voice;
      const pupilId = options.pupilId ?? defaults.pupilId;
      const resolvedVoice = voice ?? (pupilId ? undefined : pupilVoice);
      const started = Date.now();
      try {
        // "loading" covers the fetch; once audio starts we show "speaking".
        const promise = say(phrase, { voice: resolvedVoice, pupilId });
        const timer = setTimeout(() => {
          if (alive.current) setState("speaking");
        }, 120);
        await promise;
        clearTimeout(timer);
      } finally {
        if (alive.current) {
          const elapsed = Date.now() - started;
          // Hold the visible state briefly so a very short clip still registers.
          setTimeout(() => alive.current && setState("idle"), elapsed < 250 ? 250 : 0);
        }
      }
    },
    [defaults.pupilId, defaults.voice, pupilVoice]
  );

  const stop = useCallback(() => {
    stopSpeaking();
    if (alive.current) setState("idle");
  }, []);

  return { speak, stop, state, busy: state !== "idle" };
};

const SIZES = {
  sm: { box: "h-9 w-9", icon: "h-4 w-4" },
  md: { box: "h-11 w-11", icon: "h-5 w-5" },
  lg: { box: "h-14 w-14", icon: "h-7 w-7" },
  xl: { box: "h-20 w-20", icon: "h-10 w-10" },
};

/**
 * Round speak button. Put it next to anything that has words a pupil might
 * need read to them.
 */
export const SpeakButton = ({
  text,
  voice,
  pupilId,
  size = "md",
  label,
  className,
  testId = "speak-button",
  onSpoken,
}) => {
  const { speak, state } = useSpeaker({ voice, pupilId });
  const s = SIZES[size] || SIZES.md;
  const { motion } = useApp();

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        speak(text).then(() => onSpoken?.());
      }}
      aria-label={label || `Say "${text}" out loud`}
      data-testid={testId}
      data-state={state}
      className={cn(
        s.box,
        "inline-flex shrink-0 items-center justify-center rounded-full border",
        "border-[hsl(var(--wp-primary)/0.25)] bg-[hsl(var(--wp-primary-soft))]",
        "text-[hsl(var(--wp-primary-700))]",
        "transition-[background-color,border-color,transform] duration-150 ease-out",
        "hover:bg-[hsl(var(--wp-primary)/0.22)] active:scale-95",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wp-focus))]",
        "disabled:opacity-50",
        state === "speaking" && motion && "wp-speaking",
        className
      )}
    >
      {state === "loading" ? (
        <Loader2 className={cn(s.icon, "animate-spin")} aria-hidden="true" />
      ) : (
        <Volume2 className={s.icon} aria-hidden="true" />
      )}
    </button>
  );
};

/** Wide labelled variant, for a sentence rather than a single word. */
export const SpeakPill = ({ text, voice, pupilId, children, className, testId = "speak-pill" }) => {
  const { speak, state } = useSpeaker({ voice, pupilId });
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      data-testid={testId}
      data-state={state}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2",
        "border-[hsl(var(--wp-primary)/0.25)] bg-[hsl(var(--wp-primary-soft))]",
        "text-sm font-semibold text-[hsl(var(--wp-primary-700))]",
        "transition-[background-color,transform] duration-150 ease-out",
        "hover:bg-[hsl(var(--wp-primary)/0.22)] active:scale-[0.98]",
        className
      )}
    >
      {state === "loading" ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Volume2 className="h-4 w-4" aria-hidden="true" />
      )}
      {children || "Say it"}
    </button>
  );
};
