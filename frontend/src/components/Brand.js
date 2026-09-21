import React from "react";
import { cn } from "@/lib/utils";

/**
 * Frith Classroom identity.
 *
 * The name: Old English *friþ* - peace, sanctuary, the protection a place
 * gives the people inside it. It is also the middle of the school's own name,
 * Braunstone Frith.
 *
 * The mark: three stacked bars inside a soft square. They are Now, Next and
 * Later - the one idea the whole platform is built on - with the top bar lit.
 * Drawn as SVG so it stays sharp on a projector and needs no asset pipeline.
 */
export const FrithMark = ({ className, title = "Frith Classroom" }) => (
  <svg
    viewBox="0 0 64 64"
    className={cn("shrink-0", className)}
    role="img"
    aria-label={title}
    data-testid="frith-mark"
  >
    <rect
      x="3"
      y="3"
      width="58"
      height="58"
      rx="17"
      fill="hsl(var(--wp-primary-soft))"
      stroke="hsl(var(--wp-primary) / 0.28)"
      strokeWidth="1.5"
    />
    <rect x="15" y="16" width="34" height="8" rx="4" fill="hsl(var(--wp-primary))" />
    <rect
      x="15"
      y="28"
      width="26"
      height="8"
      rx="4"
      fill="hsl(var(--wp-primary))"
      opacity="0.52"
    />
    <rect
      x="15"
      y="40"
      width="17"
      height="8"
      rx="4"
      fill="hsl(var(--wp-primary))"
      opacity="0.26"
    />
  </svg>
);

/** Wordmark, optionally with the classroom it is running for. */
export const FrithWordmark = ({ subtitle, className, size = "md" }) => {
  const scale = {
    sm: { mark: "h-8 w-8", title: "text-[15px]", sub: "text-[11px]" },
    md: { mark: "h-9 w-9", title: "text-[17px]", sub: "text-[11px]" },
    lg: { mark: "h-14 w-14", title: "text-2xl", sub: "text-sm" },
  }[size];

  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <FrithMark className={scale.mark} />
      <span className="min-w-0">
        <span
          className={cn(
            "wp-display block whitespace-nowrap font-bold leading-tight text-[hsl(var(--wp-ink))]",
            scale.title
          )}
        >
          Frith <span className="font-semibold text-[hsl(var(--wp-primary))]">Classroom</span>
        </span>
        {subtitle ? (
          <span
            className={cn(
              "block truncate font-medium text-[hsl(var(--wp-ink-muted))]",
              scale.sub
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
};

/**
 * The school, in words. Replaces the cartoon mascot that used to sit here:
 * a school product should say whose school it is.
 */
export const SchoolIdentity = ({ className, align = "left" }) => (
  <span
    className={cn(
      "block text-[11px] font-semibold uppercase leading-snug tracking-[0.12em] text-[hsl(var(--wp-ink-faint))]",
      align === "center" && "text-center",
      className
    )}
    data-testid="school-identity"
  >
    Braunstone Frith Primary School, Leicester
  </span>
);
