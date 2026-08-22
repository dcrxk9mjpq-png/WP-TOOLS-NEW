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
 */

const SIZES = {
  xs: { box: "h-10 w-10", pad: "p-1" },
  sm: { box: "h-14 w-14", pad: "p-1.5" },
  md: { box: "h-20 w-20", pad: "p-2" },
  lg: { box: "h-28 w-28", pad: "p-2.5" },
  xl: { box: "h-36 w-36", pad: "p-3" },
  hero: { box: "h-44 w-44 sm:h-52 sm:w-52", pad: "p-4" },
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
          "flex shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--wp-radius-lg)] border-2 border-dashed border-amber-300 bg-amber-50 text-amber-800",
          className
        )}
      >
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <span className="px-1 text-[9px] font-medium leading-tight text-center">Needs symbol</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        s.box,
        s.pad,
        "flex shrink-0 items-center justify-center overflow-hidden",
        framed && "rounded-[var(--wp-radius-lg)] border border-[hsl(var(--border))] bg-white",
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
      className={cn(
        "group flex min-h-[44px] flex-col items-center justify-start gap-2 rounded-[var(--wp-radius-2xl)] border bg-white p-3 text-center",
        "transition-[box-shadow,border-color,background-color] duration-200 ease-out",
        onClick && "hover:shadow-[var(--wp-shadow-md)]",
        selected
          ? "border-[hsl(var(--wp-teal))] ring-2 ring-[hsl(var(--wp-teal))]"
          : "border-[hsl(var(--border))]",
        disabled && "opacity-50",
        className
      )}
      style={bg ? { backgroundColor: bg } : undefined}
      {...rest}
    >
      <SymbolImage conceptKey={conceptKey} size={size} alt={label} />
      {withLabel && label ? (
        <span className="px-1 text-sm font-semibold leading-tight text-[hsl(var(--wp-ink))]">{label}</span>
      ) : null}
      {sublabel ? (
        <span className="px-1 text-xs leading-tight text-[hsl(var(--wp-ink-muted))]">{sublabel}</span>
      ) : null}
      {children}
    </Tag>
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
        "wp-row flex items-center gap-4 p-4",
        selected && "border-[hsl(var(--wp-teal))] ring-2 ring-[hsl(var(--wp-teal))]",
        className
      )}
      style={tintColour ? { backgroundColor: tintColour } : undefined}
      data-testid={testId}
    >
      <Tag
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-4 text-left",
          onClick && "cursor-pointer"
        )}
        data-testid={onClick ? `${testId}-button` : undefined}
      >
        <SymbolImage conceptKey={conceptKey} size={size} alt={title} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-[hsl(var(--wp-ink))]">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 block truncate text-sm text-[hsl(var(--wp-ink-muted))]">{subtitle}</span>
          ) : null}
          {children}
        </span>
      </Tag>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
};
