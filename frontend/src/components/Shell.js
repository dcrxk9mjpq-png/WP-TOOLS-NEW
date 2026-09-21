import React, { useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Dices,
  Eye,
  Film,
  Hand,
  Home,
  Leaf,
  Lightbulb,
  LogOut,
  Menu,
  MessageCircle,
  Monitor,
  Plus,
  Settings as SettingsIcon,
  Share2,
  Sparkles,
  Sun,
  Users,
  Wand2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { formatLongDate, todayIso } from "@/lib/api";
import { FrithWordmark, SchoolIdentity } from "@/components/Brand";
import { QuickObservationSheet } from "@/components/QuickObservation";

export const NAV = [
  {
    group: "Classroom day",
    items: [
      { to: "/", label: "Today", icon: Home, permission: null },
      { to: "/timetable", label: "Timetable", icon: CalendarDays, permission: "timetable.view" },
      {
        to: "/morning-meeting",
        label: "Morning Meeting",
        icon: Sun,
        permission: "morning_meeting.run",
        feature: "morning_meeting",
      },
      { to: "/jobs", label: "Classroom jobs", icon: Briefcase, permission: "jobs.view", feature: "jobs" },
      { to: "/pickers", label: "Random pickers", icon: Dices, permission: "pickers.use", feature: "pickers" },
    ],
  },
  {
    group: "Communication & regulation",
    items: [
      {
        to: "/communication",
        label: "Communication",
        icon: MessageCircle,
        permission: "comm.view",
        feature: "communication",
      },
      {
        to: "/interaction",
        label: "Interaction",
        icon: Hand,
        permission: "interaction.view",
        feature: "interaction",
      },
      {
        to: "/regulation",
        label: "Regulation",
        icon: Lightbulb,
        permission: "regulation.view",
        feature: "regulation",
      },
      {
        to: "/brain-breaks",
        label: "Brain Breaks",
        icon: Leaf,
        permission: "brain_breaks.view",
        feature: "brain_breaks",
      },
      {
        to: "/watch",
        label: "Watch",
        icon: Film,
        permission: "watch.view",
        feature: "watch",
      },
      {
        to: "/prepare-me",
        label: "Prepare Me",
        icon: Wand2,
        permission: "prepare_me.view",
        feature: "prepare_me",
      },
    ],
  },
  {
    group: "Pupils & evidence",
    items: [
      { to: "/pupils", label: "Pupils", icon: Users, permission: "pupil.view" },
      {
        to: "/observations",
        label: "Observations",
        icon: Eye,
        permission: "observation.view",
        feature: "observations",
      },
      { to: "/progress", label: "Progress", icon: BarChart3, permission: "observation.view" },
      { to: "/sparks", label: "Sparks", icon: Sparkles, permission: "pupil.view" },
      {
        to: "/projects",
        label: "Project Spark",
        icon: Lightbulb,
        permission: "projects.view",
        feature: "projects",
      },
      {
        to: "/mainstream",
        label: "Mainstream Bridge",
        icon: Share2,
        permission: "mainstream.view",
        feature: "mainstream_bridge",
      },
    ],
  },
  {
    group: "Administration",
    items: [{ to: "/settings", label: "Settings", icon: SettingsIcon, permission: "settings.edit" }],
  },
];

const MOBILE_PRIMARY = ["/", "/timetable", "/communication", "/pupils"];

const testId = (label) => label.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

const NavList = ({ onNavigate }) => {
  const { can, features } = useApp();
  const groups = useMemo(
    () =>
      NAV.map((g) => ({
        ...g,
        items: g.items.filter(
          (i) => (!i.permission || can(i.permission)) && (!i.feature || features[i.feature] !== false)
        ),
      })).filter((g) => g.items.length),
    [can, features]
  );

  return (
    <nav className="flex flex-col gap-6" aria-label="Main">
      {groups.map((group) => (
        <div key={group.group}>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--wp-ink-faint))]">
            {group.group}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  data-testid={`nav-${testId(item.label)}`}
                  className={({ isActive }) =>
                    cn(
                      "relative flex min-h-[44px] items-center gap-3 rounded-[var(--wp-radius-md)] px-3 py-2 text-sm font-medium",
                      "transition-[background-color,color] duration-150 ease-out",
                      isActive
                        ? "bg-[hsl(var(--wp-primary-soft))] font-semibold text-[hsl(var(--wp-primary-700))]"
                        : "text-[hsl(var(--wp-ink-muted))] hover:bg-[hsl(var(--wp-surface-sunken))] hover:text-[hsl(var(--wp-ink))]"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full",
                          isActive ? "bg-[hsl(var(--wp-primary))]" : "bg-transparent"
                        )}
                      />
                      <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};

export const StaffShell = ({ children }) => {
  const { user, settings, signOut, can, togglePupilMode } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const location = useLocation();
  const today = todayIso();

  const mobileItems = NAV.flatMap((g) => g.items).filter(
    (i) => MOBILE_PRIMARY.includes(i.to) && (!i.permission || can(i.permission))
  );

  const brand = (
    <Link to="/" className="block" data-testid="brand-link">
      <FrithWordmark subtitle={settings?.classroom_name || "Western Park DSP"} size="md" />
    </Link>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--wp-surface-cream))]">
      {/* desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-sidebar hidden w-[252px] flex-col overflow-y-auto border-r border-[hsl(var(--border))] bg-[hsl(var(--wp-surface-ivory))] px-3 py-5 lg:flex"
        data-testid="sidebar"
      >
        <div className="mb-7 px-2">{brand}</div>
        <NavList />
        <div className="mt-auto space-y-3 px-1 pt-7">
          <button
            type="button"
            onClick={() => togglePupilMode(true)}
            className="flex w-full min-h-[44px] items-center gap-3 rounded-[var(--wp-radius-md)] border border-[hsl(var(--wp-primary)/0.25)] bg-[hsl(var(--card))] px-3 py-2.5 text-left text-sm font-semibold text-[hsl(var(--wp-primary-700))] transition-[background-color,border-color] duration-150 hover:bg-[hsl(var(--wp-primary-soft))]"
            data-testid="start-pupil-mode"
          >
            <Monitor className="h-[18px] w-[18px]" aria-hidden="true" />
            Pupil-facing mode
          </button>
          <SchoolIdentity className="px-2" />
        </div>
      </aside>

      <div className="lg:pl-[252px]">
        {/* header */}
        <header className="sticky top-0 z-sticky border-b border-[hsl(var(--border))] bg-[hsl(var(--wp-surface-cream))]/92 backdrop-blur">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 lg:hidden"
                  aria-label="Open menu"
                  data-testid="open-menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[290px] overflow-y-auto border-r border-[hsl(var(--border))] bg-[hsl(var(--wp-surface-ivory))] p-4"
                data-testid="mobile-menu"
              >
                <SheetHeader className="mb-6 text-left">
                  <SheetTitle asChild>
                    <div>{brand}</div>
                  </SheetTitle>
                </SheetHeader>
                <NavList onNavigate={() => setMenuOpen(false)} />
                <SchoolIdentity className="mt-8 px-2" />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--wp-ink-faint))]">
                {formatLongDate(today)}
              </p>
              <p className="wp-display truncate text-sm font-bold text-[hsl(var(--wp-ink))]">
                {user?.role?.name}
              </p>
            </div>

            {can("observation.create") ? (
              <Button
                onClick={() => setObsOpen(true)}
                className="min-h-[44px] gap-2"
                data-testid="header-add-observation"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Observation</span>
              </Button>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-h-[44px] gap-2" data-testid="user-menu">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--wp-primary-soft))] text-[11px] font-bold text-[hsl(var(--wp-primary-700))]">
                    {(user?.name || "?")
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span className="hidden max-w-[130px] truncate font-semibold sm:inline">
                    {user?.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-xs text-[hsl(var(--wp-ink-muted))]">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => togglePupilMode(true)} data-testid="menu-pupil-mode">
                  <Monitor className="mr-2 h-4 w-4" /> Pupil-facing mode
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} data-testid="sign-out">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          key={location.pathname}
          className="mx-auto max-w-[1440px] px-4 pb-28 pt-[var(--wp-gap)] sm:px-6 lg:px-8 lg:pb-12"
        >
          {children}
        </main>
      </div>

      {/* mobile bottom tabs */}
      <div
        className="fixed inset-x-0 bottom-0 z-sidebar border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]/96 backdrop-blur lg:hidden"
        data-testid="bottom-tabs"
      >
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {mobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex min-h-[48px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--wp-radius-md)] px-1 text-[10px] font-semibold",
                  isActive
                    ? "bg-[hsl(var(--wp-primary-soft))] text-[hsl(var(--wp-primary-700))]"
                    : "text-[hsl(var(--wp-ink-muted))]"
                )
              }
              data-testid={`tab-${testId(item.label)}`}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex min-h-[48px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold text-[hsl(var(--wp-ink-muted))]"
            data-testid="tab-more"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            More
          </button>
        </div>
      </div>

      <QuickObservationSheet open={obsOpen} onOpenChange={setObsOpen} />
    </div>
  );
};
