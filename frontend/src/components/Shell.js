import React, { useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Dices,
  Eye,
  Hand,
  Home,
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
  Lightbulb,
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
import { formatLongDate } from "@/lib/api";
import { Mascot } from "@/components/common";
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

const Brand = ({ compact = false }) => (
  <Link to="/" className="flex items-center gap-3" data-testid="brand-link">
    <span className="flex h-10 w-10 items-center justify-center rounded-[var(--wp-radius-md)] bg-white/10">
      <Mascot className="h-8 w-8" />
    </span>
    {!compact ? (
      <span className="min-w-0">
        <span className="wp-display block text-sm font-bold leading-tight text-white">Western Park</span>
        <span className="block truncate text-[11px] text-white/70">Classroom Platform</span>
      </span>
    ) : null}
  </Link>
);

const NavList = ({ onNavigate }) => {
  const { can, features } = useApp();
  const groups = useMemo(
    () =>
      NAV.map((g) => ({
        ...g,
        items: g.items.filter(
          (i) =>
            (!i.permission || can(i.permission)) &&
            (!i.feature || features[i.feature] !== false)
        ),
      })).filter((g) => g.items.length),
    [can, features]
  );

  return (
    <nav className="flex flex-col gap-5" aria-label="Main">
      {groups.map((group) => (
        <div key={group.group}>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
            {group.group}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  data-testid={`nav-${item.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-[40px] items-center gap-3 rounded-[var(--wp-radius-md)] px-3 py-2 text-sm font-medium transition-colors duration-200",
                      isActive
                        ? "bg-white text-[hsl(var(--wp-aubergine))]"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )
                  }
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
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
  const { user, signOut, can, togglePupilMode } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const location = useLocation();
  const today = new Date().toISOString().slice(0, 10);

  const mobileItems = NAV.flatMap((g) => g.items).filter(
    (i) => MOBILE_PRIMARY.includes(i.to) && (!i.permission || can(i.permission))
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--wp-surface-cream))]">
      {/* desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col overflow-y-auto bg-[hsl(var(--wp-aubergine))] px-4 py-5 lg:flex"
        data-testid="sidebar"
      >
        <div className="mb-6 px-1">
          <Brand />
        </div>
        <NavList />
        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={() => togglePupilMode(true)}
            className="flex w-full items-center gap-3 rounded-[var(--wp-radius-md)] bg-white/10 px-3 py-2.5 text-left text-sm font-medium text-white transition-colors duration-200 hover:bg-white/20"
            data-testid="start-pupil-mode"
          >
            <Monitor className="h-[18px] w-[18px]" aria-hidden="true" />
            Pupil-facing mode
          </button>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        {/* header */}
        <header className="sticky top-0 z-20 border-b border-[hsl(var(--border))] bg-[hsl(var(--wp-surface-cream))]/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open menu"
                  data-testid="open-menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] overflow-y-auto border-none bg-[hsl(var(--wp-aubergine))] p-5"
                data-testid="mobile-menu"
              >
                <SheetHeader className="mb-5 text-left">
                  <SheetTitle className="text-white">
                    <Brand />
                  </SheetTitle>
                </SheetHeader>
                <NavList onNavigate={() => setMenuOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[hsl(var(--wp-ink-muted))]">
                {formatLongDate(today)}
              </p>
              <p className="wp-display truncate text-sm font-bold text-[hsl(var(--wp-ink))]">
                {user?.role?.name}
              </p>
            </div>

            {can("observation.create") ? (
              <Button onClick={() => setObsOpen(true)} className="gap-2" data-testid="header-add-observation">
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Observation</span>
              </Button>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="user-menu">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--wp-teal-100))] text-[11px] font-bold text-[hsl(var(--wp-teal-600))]">
                    {(user?.name || "?").slice(0, 1)}
                  </span>
                  <span className="hidden max-w-[120px] truncate sm:inline">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
          className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10"
        >
          {children}
        </main>
      </div>

      {/* mobile bottom tabs */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[hsl(var(--border))] bg-white/95 backdrop-blur lg:hidden"
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
                  "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--wp-radius-md)] px-1 text-[10px] font-medium",
                  isActive ? "text-[hsl(var(--wp-teal))]" : "text-[hsl(var(--wp-ink-muted))]"
                )
              }
              data-testid={`tab-${item.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-[hsl(var(--wp-ink-muted))]"
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
