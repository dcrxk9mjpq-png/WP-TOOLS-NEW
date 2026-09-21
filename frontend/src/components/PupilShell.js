import React from "react";
import { NavLink } from "react-router-dom";
import { CalendarDays, Film, Heart, Leaf, MessageCircle, Sparkles, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { formatLongDate, todayIso } from "@/lib/api";
import { FrithMark } from "@/components/Brand";

/**
 * The pupil-facing shell.
 *
 * Different rules from the staff side on purpose: five destinations, nothing
 * else. Tabs are 96px tall so they can be hit with the side of a hand, labels
 * are large, and there is no editing, no pupil data and no navigation the child
 * has to read carefully. Leaving the mode is deliberately a small, plain button
 * in the corner where a child is unlikely to wander into it.
 */
export const PupilShell = ({ children }) => {
  const { settings, togglePupilMode, can, signOut, features } = useApp();
  const pf = settings?.pupil_facing || {};
  const today = todayIso();

  const tabs = [
    { to: "/pupil", label: "Now", icon: Sun, show: true },
    { to: "/pupil/day", label: "My day", icon: CalendarDays, show: pf.show_timetable !== false },
    { to: "/pupil/talk", label: "I can say", icon: MessageCircle, show: pf.show_communication !== false },
    { to: "/pupil/feel", label: "How I feel", icon: Heart, show: pf.show_regulation !== false },
    {
      to: "/pupil/watch",
      label: "Watch",
      icon: Film,
      show: pf.show_watch !== false && features.watch !== false,
    },
    {
      to: "/pupil/breaks",
      label: "Brain break",
      icon: Leaf,
      show: pf.show_brain_breaks !== false && features.brain_breaks !== false,
    },
    { to: "/pupil/sparks", label: "My Sparks", icon: Sparkles, show: pf.show_sparks !== false },
  ].filter((t) => t.show);

  return (
    <div className="wp-grain flex min-h-screen flex-col bg-[hsl(var(--wp-surface-cream))]">
      <header className="relative z-sticky flex items-center justify-between gap-3 px-5 pt-5 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <FrithMark className="h-9 w-9" />
          <p className="wp-display truncate text-lg font-semibold text-[hsl(var(--wp-ink))] sm:text-2xl">
            {formatLongDate(today)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] shrink-0 bg-[hsl(var(--card))]"
          onClick={() => (can("timetable.edit") ? togglePupilMode(false) : signOut())}
          data-testid="exit-pupil-mode"
        >
          {can("timetable.edit") ? "Staff view" : "Sign out"}
        </Button>
      </header>

      <main className="relative z-0 mx-auto w-full max-w-5xl flex-1 px-5 pb-40 pt-5 sm:px-7">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-sidebar border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]"
        aria-label="Pupil navigation"
        data-testid="pupil-tabs"
      >
        <div className="wp-scroll-x mx-auto flex max-w-5xl items-stretch justify-around gap-1 px-2 py-2">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end
              className={({ isActive }) =>
                cn(
                  "flex min-h-[88px] min-w-[84px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[var(--wp-radius-lg)] px-2 text-base font-semibold",
                  "transition-[background-color,transform] duration-150 ease-out active:scale-[0.97]",
                  isActive
                    ? "bg-[hsl(var(--wp-primary-soft))] text-[hsl(var(--wp-primary-700))] shadow-[inset_0_2px_0_0_hsl(0_0%_100%/0.8)]"
                    : "text-[hsl(var(--wp-ink-muted))] hover:bg-[hsl(var(--wp-surface-sunken))]"
                )
              }
              data-testid={`pupil-tab-${t.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            >
              <t.icon className="h-8 w-8" aria-hidden="true" />
              <span className="text-center leading-tight">{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
