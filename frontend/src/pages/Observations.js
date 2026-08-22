import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, errorMessage, formatTimeAgo } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import {
  AccessDenied,
  ConfirmAction,
  EmptyState,
  Loading,
  PageHeader,
  PupilAvatar,
  SectionCard,
  StatusChip,
} from "@/components/common";
import { QuickObservationSheet } from "@/components/QuickObservation";

const LEVEL_STYLES = {
  Independent: "bg-emerald-50 text-emerald-800",
  Prompted: "bg-amber-50 text-amber-800",
  Modelled: "bg-sky-50 text-sky-800",
};

export default function Observations() {
  const { can } = useApp();
  const [observations, setObservations] = useState(null);
  const [pupils, setPupils] = useState([]);
  const [pupilId, setPupilId] = useState("");
  const [area, setArea] = useState("");
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (pupilId) params.set("pupil_id", pupilId);
      if (area) params.set("area", area);
      const [o, p] = await Promise.all([
        api.get(`/observations?${params.toString()}`),
        api.get("/pupils").catch(() => ({ data: [] })),
      ]);
      setObservations(o.data);
      setPupils(p.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, [pupilId, area]);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("observation.view")) return <AccessDenied what="observations" />;
  if (!observations) return <Loading label="Loading observations" />;

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="Evidence, gathered in seconds"
        title="Observations"
        description="Short, frequent notes build a longitudinal picture. There is no score and no ranking."
        actions={
          can("observation.create") ? (
            <Button onClick={() => setOpen(true)} className="gap-2" data-testid="observations-add">
              <Plus className="h-4 w-4" /> Observation
            </Button>
          ) : null
        }
      />

      <SectionCard
        title={`${observations.length} recorded`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={pupilId} onValueChange={setPupilId}>
              <SelectTrigger className="h-9 w-[170px]" data-testid="observations-pupil-filter">
                <SelectValue placeholder="All pupils" />
              </SelectTrigger>
              <SelectContent>
                {pupils.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="h-9 w-[170px]" data-testid="observations-area-filter">
                <SelectValue placeholder="All areas" />
              </SelectTrigger>
              <SelectContent>
                {["Communication", "Interaction", "Regulation", "Independence", "Engagement"].map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pupilId || area ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPupilId("");
                  setArea("");
                }}
                data-testid="observations-clear-filters"
              >
                Clear
              </Button>
            ) : null}
          </div>
        }
        testId="observations-list"
      >
        {observations.length ? (
          <ul className="space-y-2">
            {observations.map((o) => (
              <li key={o.id} className="wp-row flex flex-wrap items-center gap-3 p-3" data-testid="observation-row">
                {o.pupil ? <PupilAvatar pupil={o.pupil} size={40} context="profile" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{o.pupil?.display_name || "Pupil"}</p>
                  <p className="truncate text-xs text-[hsl(var(--wp-ink-muted))]">
                    {o.area}
                    {o.blanks_level ? ` · Blank's Level ${o.blanks_level}` : ""}
                    {o.note ? ` · ${o.note}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    LEVEL_STYLES[o.support_level] || "bg-[hsl(var(--muted))]"
                  }`}
                >
                  {o.support_level}
                </span>
                <span className="text-xs text-[hsl(var(--wp-ink-muted))]">{formatTimeAgo(o.at)}</span>
                {can("observation.create") ? (
                  <ConfirmAction
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Delete observation" data-testid="observation-delete">
                        <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                      </Button>
                    }
                    title="Delete this observation?"
                    description="It will no longer count towards progress patterns."
                    onConfirm={async () => {
                      await api.delete(`/observations/${o.id}`);
                      load();
                    }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No observations yet"
            description="Tap Observation, choose a pupil, an area and a support level. That is all it takes."
            action={
              can("observation.create") ? (
                <Button onClick={() => setOpen(true)} data-testid="observations-empty-add">
                  Record the first one
                </Button>
              ) : null
            }
          />
        )}
      </SectionCard>

      <QuickObservationSheet open={open} onOpenChange={setOpen} onSaved={load} />
    </div>
  );
}
