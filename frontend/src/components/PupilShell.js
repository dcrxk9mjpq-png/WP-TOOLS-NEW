import React from "react";
import { NavLink } from "react-router-dom";
import { ArrowLeftRight, Heart, MessageCircle, Sparkles, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/lib/api";

/**
 * Pupil-facing shell (spec s5 + s27): calmer, larger, fewer controls.
 * No pupil records, no editing, minimal chrome.
 */
export const PupilShell = ({ children }) => {
  const { settings, togglePupilMode, can, signOut } = useApp();
  const pf = settings?.pupil_facing || {};
  const today = new Date().toISOString().slice(0, 10);

  const tabs = [
    { to: "/pupil", label: "Now", icon: Sun, show: true },
    { to: "/pupil/day", label: "My day", icon: ArrowLeftRight, show: pf.show_timetable !== false },
    { to: "/pupil/talk", label: "I can say", icon: MessageCircle, show: pf.show_communication !== false },
    { to: "/pupil/feel", label: "How I feel", icon: Heart, show: pf.show_regulation !== false },
    { to: "/pupil/sparks", label: "My Sparks", icon: Sparkles, show: pf.show_sparks !== false },
  ].filter((t) => t.show);

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--wp-surface-ivory))]">
      <header className="flex items-center justify-between gap-3 px-5 pt-5">
        <p className="wp-display text-base font-bold text-[hsl(var(--wp-ink))] sm:text-lg">
          {formatLongDate(today)}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (can("timetable.edit") ? togglePupilMode(false) : signOut())}
          data-testid="exit-pupil-mode"
        >
          {can("timetable.edit") ? "Staff view" : "Sign out"}
        </Button>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pb-32 pt-5">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 border-t border-[hsl(var(--border))] bg-white"
        aria-label="Pupil navigation"
        data-testid="pupil-tabs"
      >
        <div className="mx-auto flex max-w-4xl items-stretch justify-around px-2 py-2">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end
              className={({ isActive }) =>
                cn(
                  "flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-[var(--wp-radius-lg)] px-2 text-xs font-semibold",
                  isActive
                    ? "bg-[hsl(var(--wp-teal-100))] text-[hsl(var(--wp-teal-600))]"
                    : "text-[hsl(var(--wp-ink-muted))]"
                )
              }
              data-testid={`pupil-tab-${t.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            >
              <t.icon className="h-6 w-6" aria-hidden="true" />
              <span>{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
