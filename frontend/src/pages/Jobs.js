import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Dices, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, errorMessage } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { SymbolImage } from "@/components/Symbol";
import { SymbolField } from "@/components/SymbolPicker";
import {
  AccessDenied,
  ConfirmAction,
  EmptyState,
  Loading,
  PageHeader,
  PupilAvatar,
  SampleBadge,
  SectionCard,
} from "@/components/common";

export default function Jobs() {
  const { can } = useApp();
  const [data, setData] = useState(null);
  const [pupils, setPupils] = useState([]);
  const canEdit = can("jobs.edit");

  const load = useCallback(async () => {
    try {
      const [j, p] = await Promise.all([api.get("/jobs"), api.get("/pupils").catch(() => ({ data: [] }))]);
      setData(j.data);
      setPupils(p.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("jobs.view")) return <AccessDenied what="classroom jobs" />;
  if (!data) return <Loading label="Loading classroom jobs" />;

  const act = async (fn, message) => {
    try {
      const { data: result } = await fn();
      if (result?.jobs) setData(result);
      else await load();
      if (message) toast.success(message);
      if (result?.chosen) toast.success(`${result.chosen.display_name} was chosen`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="What can I do independently?"
        title="Classroom jobs"
        description="Create whatever jobs your classroom actually needs. Nothing here is fixed by the application."
        actions={
          canEdit ? (
            <>
              <Button variant="outline" onClick={() => act(() => api.post("/jobs/rotate"), "Jobs rotated")} className="gap-2" data-testid="jobs-rotate">
                <RefreshCw className="h-4 w-4" /> Rotate all
              </Button>
              <ConfirmAction
                trigger={
                  <Button variant="outline" className="gap-2" data-testid="jobs-reset">
                    <RotateCcw className="h-4 w-4" /> Reset today
                  </Button>
                }
                title="Clear today's job assignments?"
                description="Jobs themselves are kept. Only today's assignments are cleared."
                confirmLabel="Clear"
                onConfirm={() => act(() => api.post("/jobs/reset"), "Assignments cleared")}
              />
            </>
          ) : null
        }
      />

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today" data-testid="tab-jobs-today">Today</TabsTrigger>
          {canEdit ? <TabsTrigger value="configure" data-testid="tab-jobs-configure">Configure jobs</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="today" className="mt-[var(--wp-gap)]">
          {data.jobs.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.jobs.map((job) => (
                <li key={job.id} className="wp-card p-4" data-testid="job-card">
                  <div className="flex items-start gap-3">
                    <SymbolImage conceptKey={job.symbol_concept} size="md" alt="" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{job.title}</p>
                        {job.is_sample ? <SampleBadge /> : null}
                      </div>
                      {job.description ? (
                        <p className="mt-0.5 text-xs text-[hsl(var(--wp-ink-muted))]">{job.description}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-[var(--wp-radius-lg)] bg-[hsl(var(--wp-tint-mint))] p-3">
                    {job.pupil ? (
                      <>
                        <PupilAvatar pupil={job.pupil} size={44} context="jobs" />
                        <p className="min-w-0 flex-1 truncate font-semibold">{job.pupil.display_name}</p>
                      </>
                    ) : (
                      <p className="flex-1 text-sm text-[hsl(var(--wp-ink-muted))]">Nobody assigned yet</p>
                    )}
                  </div>

                  {canEdit ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Select
                        value={job.pupil?.id || ""}
                        onValueChange={(pupilId) =>
                          act(() => api.post(`/jobs/${job.id}/assign`, { pupil_id: pupilId }), "Job assigned")
                        }
                      >
                        <SelectTrigger className="h-9 flex-1" data-testid="job-assign-select">
                          <SelectValue placeholder="Choose a pupil" />
                        </SelectTrigger>
                        <SelectContent>
                          {pupils
                            .filter((p) => !(job.excluded_pupil_ids || []).includes(p.id))
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.display_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => act(() => api.post(`/jobs/${job.id}/random`))}
                        className="gap-1.5"
                        data-testid="job-random"
                      >
                        <Dices className="h-3.5 w-3.5" /> Random
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No classroom jobs yet"
              description="Add the jobs your classroom uses — register helper, plant helper, or anything else."
            />
          )}
        </TabsContent>

        {canEdit ? (
          <TabsContent value="configure" className="mt-[var(--wp-gap)]">
            <JobConfig jobs={data.jobs} pupils={pupils} reload={load} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

function JobConfig({ jobs, pupils, reload }) {
  const [draft, setDraft] = useState({ title: "", symbol_concept: "job.job", description: "" });

  const reorder = async (index, delta) => {
    const ids = jobs.map((j) => j.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await api.post("/jobs/reorder", { ids });
    reload();
  };

  return (
    <SectionCard
      title="Jobs, symbols and rules"
      description="Rename, reorder, attach a symbol, add a description, exclude a pupil, or delete a job entirely."
      testId="job-config"
    >
      <ul className="space-y-2">
        {jobs.map((job, index) => (
          <li key={job.id} className="wp-row flex flex-wrap items-center gap-3 p-3" data-testid="job-config-row">
            <SymbolField
              value={job.symbol_concept}
              label=""
              onChange={async (concept) => {
                await api.patch(`/jobs/${job.id}`, { symbol_concept: concept });
                reload();
              }}
            />
            <Input
              defaultValue={job.title}
              onBlur={async (e) => {
                if (e.target.value === job.title) return;
                await api.patch(`/jobs/${job.id}`, { title: e.target.value });
                toast.success("Job renamed");
                reload();
              }}
              className="h-9 min-w-[150px] flex-1"
              data-testid="job-title-input"
            />
            <Input
              defaultValue={job.description || ""}
              placeholder="Description (optional)"
              onBlur={async (e) => {
                if (e.target.value === (job.description || "")) return;
                await api.patch(`/jobs/${job.id}`, { description: e.target.value });
                reload();
              }}
              className="h-9 min-w-[180px] flex-[1.3]"
              data-testid="job-description-input"
            />
            <Select
              value={job.frequency || "daily"}
              onValueChange={async (frequency) => {
                await api.patch(`/jobs/${job.id}`, { frequency });
                reload();
              }}
            >
              <SelectTrigger className="h-9 w-[120px]" data-testid="job-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["daily", "weekly", "half_term"].map((f) => (
                  <SelectItem key={f} value={f}>
                    {f.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label className="text-xs">On</Label>
              <Switch
                checked={job.enabled !== false}
                onCheckedChange={async (value) => {
                  await api.patch(`/jobs/${job.id}`, { enabled: value });
                  reload();
                }}
                data-testid="job-enabled"
              />
            </div>
            <Button variant="ghost" size="icon" aria-label="Move up" onClick={() => reorder(index, -1)} data-testid="job-up">
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Move down" onClick={() => reorder(index, 1)} data-testid="job-down">
              <ArrowDown className="h-4 w-4" />
            </Button>
            <ConfirmAction
              trigger={
                <Button variant="ghost" size="icon" aria-label="Delete job" data-testid="job-delete">
                  <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                </Button>
              }
              title={`Delete the ${job.title} job?`}
              description="All of its assignments are removed too."
              onConfirm={async () => {
                await api.delete(`/jobs/${job.id}`);
                toast.success("Job deleted");
                reload();
              }}
            />
            <div className="w-full">
              <p className="mb-1 text-xs font-medium text-[hsl(var(--wp-ink-muted))]">
                Pupils who should not be offered this job
              </p>
              <div className="flex flex-wrap gap-1.5">
                {pupils.map((p) => {
                  const excluded = (job.excluded_pupil_ids || []).includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={async () => {
                        const next = excluded
                          ? (job.excluded_pupil_ids || []).filter((x) => x !== p.id)
                          : [...(job.excluded_pupil_ids || []), p.id];
                        await api.patch(`/jobs/${job.id}`, { excluded_pupil_ids: next });
                        reload();
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        excluded
                          ? "border-[hsl(var(--destructive))] bg-red-50 text-[hsl(var(--destructive))]"
                          : "border-[hsl(var(--border))] bg-white"
                      }`}
                      data-testid="job-exclude-toggle"
                    >
                      {p.first_name}
                    </button>
                  );
                })}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
        <div>
          <Label htmlFor="new-job">New job</Label>
          <Input
            id="new-job"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="mt-1.5 w-[200px]"
            data-testid="new-job-title"
          />
        </div>
        <SymbolField value={draft.symbol_concept} onChange={(c) => setDraft({ ...draft, symbol_concept: c })} />
        <div>
          <Label htmlFor="new-job-desc">Description</Label>
          <Input
            id="new-job-desc"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="mt-1.5 w-[220px]"
          />
        </div>
        <Button
          onClick={async () => {
            if (!draft.title.trim()) {
              toast.error("Give the job a name");
              return;
            }
            await api.post("/jobs", { ...draft, title: draft.title.trim() });
            toast.success("Job created");
            setDraft({ title: "", symbol_concept: "job.job", description: "" });
            reload();
          }}
          data-testid="add-job"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add job
        </Button>
      </div>
    </SectionCard>
  );
}
