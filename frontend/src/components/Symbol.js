import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { symbolUrl } from "@/lib/api";
import { useApp } from "@/context/AppContext";

/**
 * THE CANONICAL SYMBOL SYSTEM (spec s10 + s28).
 *
 * A screen may only ask for a conceptKey. It can never choose, recolour or
 * substitute artwork. If a concept has no symbol we show a loud placeholder
 * rather than quietly using something unrelated.
 *
 * Presentation rule: Widgit artwork is line drawing on white. It is always
 * placed on its own white plate with a hairline frame, so a symbol reads as a
 * deliberate object rather than clipart pasted onto a coloured card. The
 * artwork is never tinted; only the surface behind the plate changes.
 */

const SIZES = {
  xs: { box: "h-10 w-10", pad: "p-1" },
  sm: { box: "h-14 w-14", pad: "p-1.5" },
  md: { box: "h-20 w-20", pad: "p-2" },
  lg: { box: "h-28 w-28", pad: "p-2.5" },
  xl: { box: "h-36 w-36", pad: "p-3" },
  hero: { box: "h-44 w-44 sm:h-56 sm:w-56", pad: "p-4" },
};

export const SymbolImage = ({ conceptKey, size = "md", className, alt, framed = true }) => {
  const [failed, setFailed] = useState(false);
  const s = SIZES[size] || SIZES.md;
  const src = symbolUrl(conceptKey);

  if (!conceptKey || failed) {
    return (
      <div
        data-testid="symbol-missing"
        title={`No symbol assigned to ${conceptKey || "this concept"}`}
        className={cn(
          s.box,
          "flex shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--wp-radius-md)] border-2 border-dashed border-[hsl(var(--wp-warning)/0.45)] bg-[hsl(var(--wp-warning-soft))] text-center text-[hsl(var(--wp-warning))]",
          className
        )}
      >
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <span className="px-1 text-[9px] font-semibold leading-tight">Needs symbol</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        s.box,
        s.pad,
        "flex shrink-0 items-center justify-center overflow-hidden",
        framed && "wp-symbol-plate",
        className
      )}
    >
      <img
        src={src}
        alt={alt || ""}
        aria-hidden={alt ? undefined : "true"}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
        data-testid="symbol-image"
        data-concept={conceptKey}
      />
    </div>
  );
};

/** Square tile used in grids: symbol above a label. */
export const SymbolTile = ({
  conceptKey,
  label,
  sublabel,
  size = "md",
  selected = false,
  disabled = false,
  onClick,
  bg,
  className,
  testId = "symbol-tile",
  showLabel,
  children,
  ...rest
}) => {
  const { appearance } = useApp();
  const withLabel = showLabel === undefined ? appearance.show_symbol_labels : showLabel;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={onClick ? disabled : undefined}
      data-testid={testId}
      data-concept={conceptKey}
      aria-label={label}
      aria-pressed={onClick && selected ? true : undefined}
      className={cn(
        "wp-tile group flex min-h-[44px] w-full flex-col items-center justify-start gap-2 rounded-[var(--wp-radius-xl)] border bg-[hsl(var(--card))] p-3 text-center",
        "transition-[box-shadow,border-color,background-color,transform] duration-150 ease-out",
        onClick && "hover:border-[hsl(var(--wp-primary)/0.4)] hover:shadow-[var(--wp-shadow-md)] active:scale-[0.99]",
        selected
          ? "border-[hsl(var(--wp-primary))] ring-2 ring-[hsl(var(--wp-primary)/0.35)]"
          : "border-[hsl(var(--border))]",
        disabled && "opacity-50",
        className
      )}
      style={bg ? { backgroundColor: bg } : undefined}
      {...rest}
    >
      <SymbolImage conceptKey={conceptKey} size={size} alt={label} />
      {withLabel && label ? (
        <span className="px-1 text-sm font-semibold leading-tight text-[hsl(var(--wp-ink))]">
          {label}
        </span>
      ) : null}
      {sublabel ? (
        <span className="px-1 text-xs leading-tight text-[hsl(var(--wp-ink-muted))]">{sublabel}</span>
      ) : null}
      {children}
    </Tag>
  );
};

const CLAY_TILES = ["1", "2", "3", "4", "5", "6"];

/**
 * The pupil-mode tile. Same canonical symbol, very different object: a large
 * clay button in a pastel from the chosen pupil palette, with the symbol on a
 * white sticker plate so the line art stays crisp against the colour.
 *
 * `tone` is a stable number (usually the index in the grid) so the same tile
 * keeps the same colour every single day. Predictability matters more than
 * variety here.
 */
export const PupilSymbolTile = ({
  conceptKey,
  label,
  tone = 0,
  size = "xl",
  selected = false,
  onClick,
  className,
  testId = "pupil-symbol-tile",
  trailing,
}) => {
  const token = CLAY_TILES[Math.abs(tone) % CLAY_TILES.length];
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      data-concept={conceptKey}
      aria-label={label}
      className={cn(
        "wp-clay group relative flex min-h-[168px] w-full flex-col items-center justify-center gap-3 p-4 text-center",
        selected && "ring-4 ring-[hsl(var(--wp-primary)/0.55)]",
        className
      )}
      style={{ backgroundColor: `hsl(var(--wp-tile-${token}))` }}
    >
      <SymbolImage
        conceptKey={conceptKey}
        size={size}
        alt={label}
        className="rounded-[var(--wp-radius-lg)] shadow-[0_2px_8px_-2px_hsl(var(--wp-clay-shade)/0.55)]"
      />
      {label ? (
        <span
          className="wp-display px-1 text-xl font-semibold leading-tight sm:text-2xl"
          style={{ color: "hsl(var(--wp-tile-ink))" }}
        >
          {label}
        </span>
      ) : null}
      {trailing}
    </button>
  );
};

/** Horizontal card: symbol on the left, text on the right, actions at the end. */
export const SymbolCard = ({
  conceptKey,
  title,
  subtitle,
  size = "md",
  onClick,
  actions,
  selected,
  className,
  tintColour,
  testId = "symbol-card",
  children,
}) => {
  const Tag = onClick ? "button" : "div";
  return (
    <div
      className={cn(
        "wp-row flex items-center gap-4 p-[var(--wp-row-pad)]",
        onClick && "wp-row-interactive",
        selected && "border-[hsl(var(--wp-primary))] ring-2 ring-[hsl(var(--wp-primary)/0.3)]",
        className
      )}
      style={tintColour ? { backgroundColor: tintColour } : undefined}
      data-testid={testId}
    >
      <Tag
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={cn("flex min-w-0 flex-1 items-center gap-4 text-left", onClick && "cursor-pointer")}
        data-testid={onClick ? `${testId}-button` : undefined}
      >
        <SymbolImage conceptKey={conceptKey} size={size} alt={title} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-[hsl(var(--wp-ink))]">
            {title}
          </span>
          {subtitle ? (
            <span className="mt-0.5 block truncate text-sm text-[hsl(var(--wp-ink-muted))]">
              {subtitle}
            </span>
          ) : null}
          {children}
        </span>
      </Tag>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
};
