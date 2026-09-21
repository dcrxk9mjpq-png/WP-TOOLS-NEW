import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Check,
  CircleDot,
  Inbox,
  Loader2,
  Lock,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";
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
import { FrithMark } from "@/components/Brand";

/* ------------------------------------------------------------------ *
 * The enumerated component vocabulary. Reused on every screen so the
 * whole platform changes shape in one place.
 * ------------------------------------------------------------------ */

export const PageHeader = ({ eyebrow, title, description, actions, children }) => (
  <header className="mb-[var(--wp-gap)] flex flex-col gap-4 border-b border-[hsl(var(--border))] pb-[var(--wp-gap)] sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow ? (
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--wp-ink-faint))]"
          data-testid="page-eyebrow"
        >
          {eyebrow}
        </p>
      ) : null}
      <h1
        className="wp-display mt-1.5 text-2xl font-bold leading-[1.12] text-[hsl(var(--wp-ink))] sm:text-[1.75rem]"
        data-testid="page-title"
      >
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[hsl(var(--wp-ink-muted))] sm:text-[0.9375rem]">
          {description}
        </p>
      ) : null}
      {children}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </header>
);

export const SectionCard = ({ title, description, symbol, actions, className, children, testId }) => (
  <section className={cn("wp-card wp-pad", className)} data-testid={testId}>
    {(title || actions) && (
      <div className="mb-[var(--wp-card-pad)] flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {symbol}
          <div className="min-w-0">
            {title ? (
              <h2 className="wp-display text-[1.0625rem] font-bold leading-tight text-[hsl(var(--wp-ink))]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-[hsl(var(--wp-ink-muted))]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    )}
    {children}
  </section>
);

/** A quiet label above a group of controls inside a card. */
export const FieldGroup = ({ label, hint, children, className }) => (
  <div className={cn("min-w-0", className)}>
    {label ? (
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[hsl(var(--wp-ink-faint))]">
        {label}
      </p>
    ) : null}
    {children}
    {hint ? <p className="mt-1.5 text-xs text-[hsl(var(--wp-ink-muted))]">{hint}</p> : null}
  </div>
);

export const ListRow = ({ children, className, testId = "list-row", interactive = false, ...rest }) => (
  <div
    className={cn(
      "wp-row flex min-h-[56px] items-center justify-between gap-4 p-[var(--wp-row-pad)]",
      interactive && "wp-row-interactive",
      className
    )}
    data-testid={testId}
    {...rest}
  >
    {children}
  </div>
);

export const EmptyState = ({
  title,
  description,
  action,
  icon: Icon = Inbox,
  testId = "empty-state",
}) => (
  <div
    className="flex flex-col items-start gap-3 rounded-[var(--wp-radius-xl)] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--wp-surface-sunken))] p-6"
    data-testid={testId}
  >
    <span className="flex h-11 w-11 items-center justify-center rounded-[var(--wp-radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--wp-ink-muted))]">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <h3 className="wp-display text-base font-bold text-[hsl(var(--wp-ink))]">{title}</h3>
    {description ? (
      <p className="max-w-lg text-sm leading-relaxed text-[hsl(var(--wp-ink-muted))]">{description}</p>
    ) : null}
    {action}
  </div>
);

export const SampleBadge = ({ className }) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center rounded-full border border-[hsl(var(--wp-warning)/0.35)] bg-[hsl(var(--wp-warning-soft))] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--wp-warning))]",
      className
    )}
    data-testid="sample-badge"
  >
    Sample
  </span>
);

/* ------------------------------------------------------------------ *
 * Timetable state. Colour plus an icon plus a word - never colour alone.
 * ------------------------------------------------------------------ */
const STATUS = {
  current: { label: "Happening now", icon: Play, token: "now" },
  next: { label: "Next", icon: ArrowRight, token: "next" },
  later: { label: "Later", icon: CircleDot, token: "later" },
  done: { label: "Finished", icon: Check, token: "done" },
  skipped: { label: "Skipped", icon: Ban, token: "skipped" },
};

export const StatusChip = ({ status, className, short = false }) => {
  const s = STATUS[status] || STATUS.later;
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        className
      )}
      style={{
        backgroundColor: `hsl(var(--wp-state-${s.token}-bg))`,
        color: `hsl(var(--wp-state-${s.token}))`,
        borderColor: `hsl(var(--wp-state-${s.token}-border))`,
      }}
      data-testid={`status-chip-${status || "later"}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {short && s.token === "now" ? "Now" : s.label}
    </span>
  );
};

/** Says where "happening now" came from: the wall clock, or a member of staff. */
export const NowSourceNote = ({ source, className }) => {
  if (!source || source === "none") return null;
  const copy =
    source === "clock"
      ? "Following the classroom clock"
      : "Set by a member of staff";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--wp-ink-faint))]",
        className
      )}
      data-testid={`now-source-${source}`}
    >
      <CircleDot className="h-3 w-3" aria-hidden="true" />
      {copy}
    </span>
  );
};

export const StatTile = ({ value, label, tintName = "mint", testId }) => (
  <div
    className="rounded-[var(--wp-radius-lg)] border border-[hsl(var(--border))] p-4"
    style={{ backgroundColor: tint(tintName) }}
    data-testid={testId}
  >
    <p className="wp-display wp-tabular text-[1.75rem] font-bold leading-none text-[hsl(var(--wp-ink))]">
      {value}
    </p>
    <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--wp-ink-muted))]">
      {label}
    </p>
  </div>
);

export const ConfirmAction = ({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  testId = "confirm-dialog",
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
    <AlertDialogContent
      data-testid={testId}
      className="rounded-[var(--wp-radius-xl)] border-[hsl(var(--border))]"
    >
      <AlertDialogHeader>
        <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--wp-danger-soft))] text-[hsl(var(--wp-danger))]">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <AlertDialogTitle className="wp-display text-lg font-bold">{title}</AlertDialogTitle>
        <AlertDialogDescription className="text-sm leading-relaxed">
          {description}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-testid="confirm-cancel" className="min-h-[44px]">
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          data-testid="confirm-accept"
          className="min-h-[44px] bg-[hsl(var(--wp-danger))] text-white hover:bg-[hsl(var(--wp-danger))]/90"
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const AddButton = ({ children = "Add", onClick, testId = "add-button", className }) => (
  <Button onClick={onClick} data-testid={testId} className={cn("min-h-[44px] gap-2", className)}>
    <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
    {children}
  </Button>
);

export const Loading = ({ label = "Loading" }) => (
  <div
    className="flex items-center justify-center gap-3 p-10 text-[hsl(var(--wp-ink-muted))]"
    data-testid="loading"
  >
    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
    <span className="text-sm font-medium">{label}…</span>
  </div>
);

export const AccessDenied = ({ what = "this area" }) => (
  <div className="wp-card wp-pad max-w-xl" data-testid="access-denied">
    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-[var(--wp-radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--wp-surface-sunken))] text-[hsl(var(--wp-ink-muted))]">
      <Lock className="h-5 w-5" aria-hidden="true" />
    </span>
    <h2 className="wp-display text-lg font-bold">You do not have access to {what}</h2>
    <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--wp-ink-muted))]">
      Your role does not include this permission. A Classroom Administrator can change this in
      Settings → Permissions &amp; staff.
    </p>
  </div>
);

/* ------------------------------------------------------------------ *
 * Pupil identity: avatar by default, photograph only where allowed.
 * ------------------------------------------------------------------ */
const AVATAR_TINTS = ["mint", "peach", "lilac", "butter", "blush", "sage", "sky", "rose", "teal"];

export const PupilAvatar = ({ pupil, size = 56, context = "profile", className, showName = false }) => {
  const { appearance, can } = useApp();
  const [broken, setBroken] = React.useState(false);
  if (!pupil) return null;
  const contextAllowed = pupil.photo_contexts ? pupil.photo_contexts[context] !== false : true;
  const usePhoto =
    Boolean(pupil.photo_id) &&
    appearance.show_photos &&
    contextAllowed &&
    can("pupil.photo.view") &&
    !broken;
  const colour =
    pupil.avatar?.colour || AVATAR_TINTS[(pupil.first_name || "A").charCodeAt(0) % AVATAR_TINTS.length];
  const initials = `${pupil.first_name?.[0] || "?"}${pupil.last_initial?.[0] || ""}`.toUpperCase();

  const box = (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--wp-radius-md)] border border-[hsl(var(--border))] shadow-[var(--wp-shadow-sm)]",
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
          style={{ fontSize: Math.max(11, size * 0.34) }}
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

/**
 * The platform mark, used where a small piece of identity belongs.
 * (This replaced a cartoon face: a school product should look like a school
 * product, not a toy.)
 */
export const Mascot = ({ className }) => <FrithMark className={className} />;

export const SparkPill = ({ value, label = "Sparks" }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--wp-warning)/0.3)] bg-[hsl(var(--wp-warning-soft))] px-3 py-1 text-sm font-semibold text-[hsl(var(--wp-warning))]"
    data-testid="spark-pill"
  >
    <Sparkles className="h-4 w-4" aria-hidden="true" />
    <span className="wp-tabular">{value}</span> {label}
  </span>
);

export const SampleDataBanner = () => {
  const { settings } = useApp();
  if (!settings?.sample_data) return null;
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-[var(--wp-radius-lg)] border border-[hsl(var(--wp-warning)/0.3)] bg-[hsl(var(--wp-warning-soft))] px-4 py-3 text-sm text-[hsl(var(--wp-ink))]"
      data-testid="sample-data-banner"
    >
      <SampleBadge />
      <span className="leading-relaxed">
        Demonstration classroom. Everything here is <strong>sample content</strong> and can be
        renamed or deleted. Do not enter live pupil information yet.
      </span>
    </div>
  );
};
