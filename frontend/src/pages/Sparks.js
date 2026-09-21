import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress as Bar } from "@/components/ui/progress";
import { api, errorMessage, formatTimeAgo } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { SymbolImage } from "@/components/Symbol";
import {
  AccessDenied,
  ConfirmAction,
  EmptyState,
  Loading,
  PageHeader,
  PupilAvatar,
  SampleBadge,
  SectionCard,
  StatTile,
} from "@/components/common";
import { cn } from "@/lib/utils";

export default function Sparks() {
  const { can } = useApp();
  const [board, setBoard] = useState(null);
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [note, setNote] = useState("");

  const canAward = can("sparks.award");

  const load = useCallback(async () => {
    try {
      const [b, e] = await Promise.all([
        api.get("/sparks/board"),
        api.get("/sparks/events?limit=20").catch(() => ({ data: [] })),
      ]);
      setBoard(b.data);
      setEvents(e.data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("pupil.view")) return <AccessDenied what="recognition" />;
  if (!board) return <Loading label="Loading recognition" />;

  if (!board.enabled) {
    return (
      <div className="wp-stack">
        <PageHeader eyebrow="Recognition" title={board.currency_name} />
        <EmptyState
          title="Recognition is switched off"
          description="A Classroom Administrator can turn it on in Settings if you want to use it."
        />
      </div>
    );
  }

  const award = async (rule) => {
    if (!selected.length) {
      toast.error("Choose at least one pupil first");
      return;
    }
    try {
      await api.post("/sparks/award", { pupil_ids: selected, rule_id: rule.id, note });
      toast.success(`${rule.title} recognised`);
      setNote("");
      setSelected([]);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const goalPct = board.goal
    ? Math.min(100, Math.round((board.class_total / (board.goal.target || 1)) * 100))
    : 0;

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="Skills, not behaviour"
        title={board.currency_name}
        description="Recognition for communication, interaction, regulation, independence and participation. No child is ever labelled good or bad."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile value={board.class_total} label={`${board.currency_name} as a class`} tintName="butter" testId="sparks-class-total" />
        <StatTile value={board.rules.length} label="Ways to earn them" tintName="mint" />
        <StatTile value={board.badges.length} label="Achievements available" tintName="lilac" />
      </div>

      {board.goal ? (
        <SectionCard title={board.goal.title} description={`Reward: ${board.goal.reward}`} testId="sparks-goal">
          <Bar value={goalPct} className="h-3" />
          <p className="mt-2 text-sm text-[hsl(var(--wp-ink-muted))]">
            {board.class_total} of {board.goal.target}
          </p>
        </SectionCard>
      ) : null}

      {canAward ? (
        <SectionCard
          title="Recognise something"
          description="Choose the pupils, then the skill you noticed."
          testId="sparks-award-panel"
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {board.pupils.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setSelected((prev) =>
                    prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                  )
                }
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-[var(--wp-radius-lg)] border p-2",
                  selected.includes(p.id)
                    ? "border-[hsl(var(--wp-primary))] ring-2 ring-[hsl(var(--wp-primary))]"
                    : "border-[hsl(var(--border))] bg-white"
                )}
                data-testid="spark-pupil-toggle"
              >
                <PupilAvatar pupil={p} size={44} context="picker" />
                <span className="w-full truncate text-[11px] font-medium">{p.first_name}</span>
                <span className="text-[10px] text-[hsl(var(--wp-ink-muted))]">{p.sparks}</span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <Label htmlFor="spark-note">Optional note</Label>
            <Input
              id="spark-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1.5"
              data-testid="spark-note"
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {board.rules.map((rule) => (
              <button
                key={rule.id}
                type="button"
                onClick={() => award(rule)}
                className="wp-row flex items-center gap-3 p-3 text-left transition-shadow duration-200 hover:shadow-[var(--wp-shadow-md)]"
                data-testid="spark-rule-button"
              >
                <SymbolImage conceptKey={rule.symbol_concept} size="sm" alt="" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{rule.title}</span>
                  <span className="block text-xs text-[hsl(var(--wp-ink-muted))]">
                    {rule.area} · {rule.points} {board.currency_name.toLowerCase()}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-[var(--wp-gap)] lg:grid-cols-2">
        <SectionCard title="Achievements" testId="sparks-badges">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {board.badges.map((badge) => {
              const earned = board.pupils.filter((p) => (p.badges || []).includes(badge.id)).length;
              return (
                <li key={badge.id} className="wp-row flex flex-col items-center gap-2 p-3 text-center">
                  <SymbolImage conceptKey={badge.symbol_concept} size="md" alt="" />
                  <p className="text-sm font-semibold leading-tight">{badge.title}</p>
                  <p className="text-xs text-[hsl(var(--wp-ink-muted))]">
                    {badge.threshold} {board.currency_name.toLowerCase()} · {earned} earned
                  </p>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <SectionCard title="Recently recognised" testId="sparks-recent">
          {events.length ? (
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="wp-row flex items-center gap-3 p-3">
                  {e.pupil ? <PupilAvatar pupil={e.pupil} size={36} context="profile" /> : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.pupil?.display_name}</p>
                    <p className="truncate text-xs text-[hsl(var(--wp-ink-muted))]">{e.rule_title}</p>
                  </div>
                  <span className="text-xs text-[hsl(var(--wp-ink-muted))]">{formatTimeAgo(e.at)}</span>
                  {canAward ? (
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Remove" data-testid="spark-event-delete">
                          <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                        </Button>
                      }
                      title="Remove this recognition?"
                      description="It will no longer count towards totals."
                      onConfirm={async () => {
                        await api.delete(`/sparks/events/${e.id}`);
                        load();
                      }}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[hsl(var(--wp-ink-muted))]">Nothing recognised yet.</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
