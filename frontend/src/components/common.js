import React from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pupilPhotoUrl, tint } from "@/lib/api";
import { useApp } from "@/context/AppContext";

/* ================================================================
 * WESTERN PARK COMPONENT VOCABULARY
 * 
 * Professional, consistent, reusable components across all screens.
 * Every component is tested for accessibility, hierarchy, and spacing.
 * ================================================================ */

/**
 * PageHeader - Top-level page introduction with title, description, and actions
 */
export const PageHeader = ({ eyebrow, title, description, actions, children }) => (
  <header className="mb-[var(--wp-gap)] flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--wp-ink-muted))]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-1 text-2xl font-bold leading-tight text-[hsl(var(--wp-ink))] sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[hsl(var(--wp-ink-muted))]">
          {description}
        </p>
      ) : null}
      {children}
    </div>
    {actions ? (
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        {actions}
      </div>
    ) : null}
  </header>
);

/**
 * SectionCard - Titled card container for grouped content
 */
export const SectionCard = ({
  title,
  description,
  symbol,
  actions,
  className,
  children,
  testId,
}) => (
  <section
    className={cn("wp-card wp-pad", className)}
    data-testid={testId}
    role="region"
    aria-labelledby={testId ? `${testId}-title` : undefined}
  >
    {(title || actions) && (
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {symbol && <div className="shrink-0">{symbol}</div>}
          <div className="min-w-0">
            {title ? (
              <h2
                id={testId ? `${testId}-title` : undefined}
                className="text-lg font-semibold leading-tight text-[hsl(var(--wp-ink))]"
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-[hsl(var(--wp-ink-muted))]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        ) : null}
      </div>
    )}
    <div className="mt-4">{children}</div>
  </section>
);

/**
 * ListRow - Horizontal row for displaying items in lists
 */
export const ListRow = ({
  children,
  className,
  testId = "list-row",
  interactive = false,
  ...rest
}) => (
  <div
    className={cn(
      "wp-row flex items-center justify-between gap-4 p-4",
      interactive && "transition-[background-color,box-shadow] duration-200 hover:bg-[hsl(var(--wp-tint-mint))]",
      className
    )}
    data-testid={testId}
    {...rest}
  >
    {children}
  </div>
);

/**
 * EmptyState - Friendly state when no content is available
 */
export const EmptyState = ({
  title,
  description,
  action,
  testId = "empty-state",
  icon,
}) => (
  <div
    className="flex flex-col items-center gap-4 rounded-[var(--wp-radius-2xl)] border border-[hsl(var(--border))] bg-[hsl(var(--wp-tint-butter))] p-8 text-center"
    data-testid={testId}
  >
    {icon ? (
      <div className="text-[hsl(var(--wp-ink-muted))]">{icon}</div>
    ) : (
      <Mascot className="h-14 w-14 opacity-70" />
    )}
    <div>
      <h3 className="text-base font-semibold text-[hsl(var(--wp-ink))]">
        {title}
      </h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[hsl(var(--wp-ink-muted))]">
          {description}
        </p>
      ) : null}
    </div>
    {action ? <div className="mt-2">{action}</div> : null}
  </div>
);

/**
 * SampleBadge - Badge indicating demo/sample content
 */
export const SampleBadge = ({ className }) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800",
      className
    )}
    data-testid="sample-badge"
  >
    Sample
  </span>
);

/**
 * Status indicators - Never colour-only, always with icon/label
 */
const STATUS = {
  current: {
    label: "Now",
    cls: "bg-[hsl(var(--wp-teal-100))] text-[hsl(var(--wp-teal-600))]",
    mark: "▶",
  },
  next: {
    label: "Next",
    cls: "bg-sky-50 text-sky-700 border border-dashed border-sky-300",
    mark: "→",
  },
  later: {
    label: "Later",
    cls: "bg-[hsl(var(--muted))] text-[hsl(var(--wp-ink-muted))]",
    mark: "•",
  },
  done: {
    label: "Finished",
    cls: "bg-emerald-50 text-emerald-700",
    mark: "✓",
  },
  skipped: {
    label: "Skipped",
    cls: "bg-amber-50 text-amber-800",
    mark: "⊘",
  },
};

export const StatusChip = ({ status, className }) => {
  const s = STATUS[status] || STATUS.later;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        s.cls,
        className
      )}
      data-testid={`status-chip-${status || "later"}`}
      aria-label={s.label}
    >
      <span aria-hidden="true">{s.mark}</span>
      {s.label}
    </span>
  );
};

/**
 * StatTile - Small stat display with tinted background
 */
export const StatTile = ({ value, label, tintName = "mint", testId }) => (
  <div
    className="rounded-[var(--wp-radius-xl)] border border-[hsl(var(--border))] p-4 text-center transition-[box-shadow,border-color] duration-200"
    style={{ backgroundColor: tint(tintName) }}
    data-testid={testId}
  >
    <p className="wp-display text-3xl font-bold leading-none text-[hsl(var(--wp-ink))]">
      {value}
    </p>
    <p className="mt-1.5 text-xs font-medium text-[hsl(var(--wp-ink-muted))]">
      {label}
    </p>
  </div>
);

/**
 * ConfirmAction - Destructive action confirmation dialog
 */
export const ConfirmAction = ({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  testId = "confirm-dialog",
  isDangerous = true,
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
    <AlertDialogContent
      data-testid={testId}
      className="rounded-[var(--wp-radius-xl)]"
    >
      <AlertDialogHeader>
        <AlertDialogTitle className="text-lg font-semibold">
          {title}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-sm text-[hsl(var(--wp-ink-muted))]">
          {description}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="gap-3 sm:gap-2">
        <AlertDialogCancel
          data-testid="confirm-cancel"
          className="sm:order-1"
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          data-testid="confirm-accept"
          className={cn(
            "sm:order-2",
            isDangerous
              ? "bg-[hsl(var(--destructive))] text-white hover:bg-[hsl(var(--destructive))]/90"
              : ""
          )}
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

/**
 * AddButton - Primary action button for adding items
 */
export const AddButton = ({
  children = "Add",
  onClick,
  testId = "add-button",
  className,
}) => (
  <Button
    onClick={onClick}
    data-testid={testId}
    className={cn("gap-2", className)}
  >
    <Plus className="h-4 w-4" aria-hidden="true" />
    {children}
  </Button>
);

/**
 * Loading - Loading state indicator
 */
export const Loading = ({ label = "Loading" }) => (
  <div
    className="flex items-center justify-center gap-3 p-10 text-[hsl(var(--wp-ink-muted))]"
    data-testid="loading"
    role="status"
    aria-label={`${label}...`}
  >
    <Loader2
      className="h-5 w-5 animate-spin"
      aria-hidden="true"
    />
    <span className="text-sm">{label}…</span>
  </div>
);

/**
 * AccessDenied - Permission restriction message
 */
export const AccessDenied = ({ what = "this area" }) => (
  <div
    className="wp-card wp-pad text-center"
    data-testid="access-denied"
    role="status"
  >
    <h2 className="text-lg font-semibold text-[hsl(var(--wp-ink))]">
      You do not have access to {what}
    </h2>
    <p className="mt-2 text-sm text-[hsl(var(--wp-ink-muted))]">
      Your role does not include this permission. A Classroom Administrator can
      change this in Settings → Permissions &amp; staff.
    </p>
  </div>
);

/* ================================================================
 * PUPIL IDENTITY SYSTEM
 * 
 * Avatars with fallback to initials, respecting photo permissions.
 * ================================================================ */

const AVATAR_TINTS = [
  "mint",
  "peach",
  "lilac",
  "butter",
  "blush",
  "sage",
  "sky",
  "rose",
  "teal",
];

export const PupilAvatar = ({
  pupil,
  size = 56,
  context = "profile",
  className,
  showName = false,
}) => {
  const { appearance, can } = useApp();
  const [broken, setBroken] = React.useState(false);

  if (!pupil) return null;

  const contextAllowed = pupil.photo_contexts
    ? pupil.photo_contexts[context] !== false
    : true;

  const usePhoto =
    Boolean(pupil.photo_id) &&
    appearance.show_photos &&
    contextAllowed &&
    can("pupil.photo.view") &&
    !broken;

  const colour =
    pupil.avatar?.colour ||
    AVATAR_TINTS[
      (pupil.first_name || "A").charCodeAt(0) % AVATAR_TINTS.length
    ];

  const initials = `${pupil.first_name?.[0] || "?"}${
    pupil.last_initial?.[0] || ""
  }`.toUpperCase();

  const box = (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--wp-radius-lg)] border-2 border-white shadow-[var(--wp-shadow-sm)] transition-[box-shadow] duration-200",
        className
      )}
      style={{ width: size, height: size, backgroundColor: tint(colour) }}
      data-testid="pupil-avatar"
      data-pupil={pupil.id}
    >
      {usePhoto ? (
        <img
          src={pupilPhotoUrl(pupil.id)}
          alt={pupil.display_name}
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="wp-display font-bold text-[hsl(var(--wp-ink))]"
          style={{ fontSize: Math.max(12, size * 0.36) }}
        >
          {initials}
        </span>
      )}
    </span>
  );

  if (!showName) return box;

  return (
    <span className="flex items-center gap-3">
      {box}
      <span className="min-w-0">
        <span className="block truncate font-semibold text-[hsl(var(--wp-ink))]">
          {pupil.display_name}
        </span>
      </span>
    </span>
  );
};

/* ================================================================
 * MASCOT
 * 
 * Friendly helper - static by default, never alongside sensitive data.
 * ================================================================ */

export const Mascot = ({ className }) => (
  <svg
    viewBox="0 0 120 120"
    className={className}
    role="img"
    aria-label="Spark, the friendly Western Park helper"
  >
    <path
      d="M60 12c24 0 42 18 42 41 0 26-19 47-42 47S18 79 18 53c0-23 18-41 42-41z"
      fill="hsl(174 45% 55%)"
    />
    <ellipse cx="44" cy="62" rx="7" ry="4" fill="hsl(6 70% 78%)" opacity="0.85" />
    <ellipse cx="76" cy="62" rx="7" ry="4" fill="hsl(6 70% 78%)" opacity="0.85" />
    <circle cx="46" cy="52" r="5" fill="#123" />
    <circle cx="74" cy="52" r="5" fill="#123" />
    <circle cx="47.6" cy="50.4" r="1.7" fill="#fff" />
    <circle cx="75.6" cy="50.4" r="1.7" fill="#fff" />
    <path
      d="M52 68c3 4 13 4 16 0"
      stroke="#123"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * SparkPill - Recognition/gamification indicator
 */
export const SparkPill = ({ value, label = "Sparks" }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--wp-tint-butter))] px-3 py-1 text-sm font-semibold text-[hsl(35_70%_26%)]"
    data-testid="spark-pill"
  >
    <Sparkles className="h-4 w-4" aria-hidden="true" />
    {value} {label}
  </span>
);

/**
 * SampleDataBanner - Warning banner for demo/sample data
 */
export const SampleDataBanner = () => {
  const { settings } = useApp();
  if (!settings?.sample_data) return null;

  return (
    <div
      className="mb-[var(--wp-gap)] flex flex-wrap items-center gap-3 rounded-[var(--wp-radius-xl)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      data-testid="sample-data-banner"
      role="alert"
    >
      <SampleBadge />
      <span>
        This is a prototype containing <strong>sample data only</strong>. Everything
        here is editable and can be renamed or deleted. Do not enter live pupil
        information yet.
      </span>
    </div>
  );
};

/**
 * SkeletonLoader - Placeholder while content loads
 */
export const SkeletonLoader = ({
  count = 3,
  height = "h-16",
  testId = "skeleton-loader",
}) => (
  <div
    className="space-y-3"
    data-testid={testId}
    role="status"
    aria-busy="true"
    aria-label="Loading content"
  >
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className={cn(
          "rounded-[var(--wp-radius-xl)] bg-gradient-to-r from-[hsl(var(--muted))] via-[hsl(var(--muted))] to-[hsl(var(--muted))] animate-pulse",
          height
        )}
      />
    ))}
  </div>
);

/**
 * SuccessMessage - Positive feedback indicator
 */
export const SuccessMessage = ({ message, testId = "success-message" }) => (
  <div
    className="flex items-center gap-3 rounded-[var(--wp-radius-xl)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
    data-testid={testId}
    role="status"
  >
    <span className="text-lg">✓</span>
    <span>{message}</span>
  </div>
);

/**
 * ErrorMessage - Error feedback with context
 */
export const ErrorMessage = ({
  message,
  details,
  testId = "error-message",
}) => (
  <div
    className="flex flex-col gap-2 rounded-[var(--wp-radius-xl)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    data-testid={testId}
    role="alert"
  >
    <span className="font-semibold">{message}</span>
    {details && (
      <span className="text-xs text-red-700 opacity-85">{details}</span>
    )}
  </div>
);
