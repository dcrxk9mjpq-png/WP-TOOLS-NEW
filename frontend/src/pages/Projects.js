import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress as Bar } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errorMessage, formatTimeAgo } from "@/lib/api";
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
import { cn } from "@/lib/utils";

export default function Projects() {
  const { can } = useApp();
  const [projects, setProjects] = useState(null);
  const [pupils, setPupils] = useState([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    symbol_concept: "system.project",
    pupil_ids: [],
    skills: [],
    steps: [],
  });
  const [evidence, setEvidence] = useState({});

  const canEdit = can("projects.edit");

  const load = useCallback(async () => {
    try {
      const [p, pu] = await Promise.all([
        api.get("/projects"),
        api.get("/pupils").catch(() => ({ data: [] })),
      ]);
      setProjects(p.data);
      setPupils(pu.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("projects.view")) return <AccessDenied what="Project Spark" />;
  if (!projects) return <Loading label="Loading projects" />;

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="Interests, skills and real things made"
        title="Project Spark"
        description="Build whatever projects suit your pupils. Skills, steps and evidence are all yours to define."
        actions={
          canEdit ? (
            <Button onClick={() => setCreating(true)} className="gap-2" data-testid="new-project">
              <Plus className="h-4 w-4" /> New project
            </Button>
          ) : null
        }
      />

      {projects.length ? (
        <div className="grid gap-[var(--wp-gap)] lg:grid-cols-2">
          {projects.map((project) => (
            <SectionCard
              key={project.id}
              title={project.title}
              description={project.description}
              symbol={<SymbolImage conceptKey={project.symbol_concept} size="md" alt="" />}
              actions={
                <div className="flex items-center gap-2">
                  {project.is_sample ? <SampleBadge /> : null}
                  {canEdit ? (
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Delete project" data-testid="project-delete">
                          <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                        </Button>
                      }
                      title={`Delete "${project.title}"?`}
                      description="Its steps and evidence are deleted too."
                      onConfirm={async () => {
                        await api.delete(`/projects/${project.id}`);
                        toast.success("Project deleted");
                        load();
                      }}
                    />
                  ) : null}
                </div>
              }
              testId="project-card"
            >
              <div className="flex flex-wrap items-center gap-2">
                {(project.pupils || []).map((p) => (
                  <PupilAvatar key={p.id} pupil={p} size={32} context="profile" />
                ))}
                {(project.skills || []).map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-[hsl(var(--wp-tint-mint))] px-2.5 py-1 text-[11px] font-semibold"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-[hsl(var(--wp-ink-muted))]">
                  <span>Steps</span>
                  <span>
                    {project.progress?.done || 0} of {project.progress?.total || 0}
                  </span>
                </div>
                <Bar
                  value={
                    project.progress?.total
                      ? Math.round((project.progress.done / project.progress.total) * 100)
                      : 0
                  }
                  className="h-2"
                />
                <ul className="mt-3 space-y-1.5">
                  {(project.steps || []).map((step) => (
                    <li key={step.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={async () => {
                          const steps = project.steps.map((s) =>
                            s.id === step.id ? { ...s, done: !s.done } : s
                          );
                          await api.patch(`/projects/${project.id}`, { steps });
                          load();
                        }}
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                          step.done
                            ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                            : "border-[hsl(var(--border))] bg-white"
                        )}
                        aria-label={step.done ? "Mark not done" : "Mark done"}
                        data-testid="project-step-toggle"
                      >
                        {step.done ? <Check className="h-3.5 w-3.5" /> : null}
                      </button>
                      <span className={cn("text-sm", step.done && "line-through opacity-70")}>
                        {step.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
                  Evidence portfolio
                </p>
                <ul className="space-y-1.5">
                  {(project.evidence || []).map((e) => (
                    <li key={e.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--wp-teal))]" />
                      <span className="min-w-0 flex-1">{e.text}</span>
                      <span className="shrink-0 text-xs text-[hsl(var(--wp-ink-muted))]">
                        {formatTimeAgo(e.at)}
                      </span>
                      {canEdit ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove evidence"
                          onClick={async () => {
                            await api.delete(`/projects/${project.id}/evidence/${e.id}`);
                            load();
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-[hsl(var(--destructive))]" />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                  {!(project.evidence || []).length ? (
                    <li className="text-sm text-[hsl(var(--wp-ink-muted))]">Nothing recorded yet.</li>
                  ) : null}
                </ul>
                {canEdit ? (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={evidence[project.id] || ""}
                      onChange={(e) => setEvidence({ ...evidence, [project.id]: e.target.value })}
                      placeholder="What did they do or say?"
                      className="h-9"
                      data-testid="project-evidence-input"
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        const text = (evidence[project.id] || "").trim();
                        if (!text) return;
                        await api.post(`/projects/${project.id}/evidence`, { text });
                        setEvidence({ ...evidence, [project.id]: "" });
                        toast.success("Evidence added");
                        load();
                      }}
                      data-testid="project-add-evidence"
                    >
                      Add
                    </Button>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Create a project around something a pupil is genuinely interested in."
          action={
            canEdit ? (
              <Button onClick={() => setCreating(true)} data-testid="projects-empty-add">
                Create the first project
              </Button>
            ) : null
          }
        />
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-[var(--wp-radius-xl)]" data-testid="project-dialog">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-title">Title</Label>
              <Input
                id="project-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="mt-1.5"
                data-testid="project-title-input"
              />
            </div>
            <div>
              <Label htmlFor="project-desc">What is it about?</Label>
              <Textarea
                id="project-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={2}
                className="mt-1.5"
              />
            </div>
            <SymbolField value={draft.symbol_concept} onChange={(c) => setDraft({ ...draft, symbol_concept: c })} />
            <div>
              <Label>Who is taking part?</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {pupils.map((p) => {
                  const on = draft.pupil_ids.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          pupil_ids: on
                            ? draft.pupil_ids.filter((x) => x !== p.id)
                            : [...draft.pupil_ids, p.id],
                        })
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm",
                        on ? "border-[hsl(var(--wp-teal))] bg-[hsl(var(--wp-teal-100))]" : "border-[hsl(var(--border))]"
                      )}
                      data-testid="project-pupil-toggle"
                    >
                      {p.first_name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="project-skills">Skills (comma separated)</Label>
              <Input
                id="project-skills"
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Communication, Independence"
                className="mt-1.5"
                data-testid="project-skills-input"
              />
            </div>
            <div>
              <Label htmlFor="project-steps">Steps (one per line)</Label>
              <Textarea
                id="project-steps"
                rows={4}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    steps: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((title) => ({ title, done: false })),
                  })
                }
                className="mt-1.5"
                data-testid="project-steps-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!draft.title.trim()) {
                  toast.error("Give the project a title");
                  return;
                }
                await api.post("/projects", draft);
                toast.success("Project created");
                setCreating(false);
                setDraft({
                  title: "",
                  description: "",
                  symbol_concept: "system.project",
                  pupil_ids: [],
                  skills: [],
                  steps: [],
                });
                load();
              }}
              data-testid="project-save"
            >
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
