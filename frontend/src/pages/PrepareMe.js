import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BookOpen, Plus, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errorMessage } from "@/lib/api";
import { useApp, speak } from "@/context/AppContext";
import { SymbolImage, SymbolTile } from "@/components/Symbol";
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

export default function PrepareMe() {
  const { can } = useApp();
  const [templates, setTemplates] = useState(null);
  const [stories, setStories] = useState([]);
  const [pupils, setPupils] = useState([]);
  const [builder, setBuilder] = useState(null);
  const [reading, setReading] = useState(null);

  const canEdit = can("prepare_me.edit");

  const load = useCallback(async () => {
    try {
      const [t, s, p] = await Promise.all([
        api.get("/prepare-me/templates"),
        api.get("/prepare-me/stories"),
        api.get("/pupils").catch(() => ({ data: [] })),
      ]);
      setTemplates(t.data);
      setStories(s.data);
      setPupils(p.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("prepare_me.view")) return <AccessDenied what="Prepare Me" />;
  if (!templates) return <Loading label="Loading Prepare Me" />;

  const startFromTemplate = (tpl) => {
    setBuilder({
      title: tpl.name,
      template_id: tpl.id,
      symbol_concept: tpl.symbol_concept,
      pupil_ids: [],
      event_date: "",
      sections: (tpl.sections || []).map((s) => ({
        key: s.key,
        prompt: s.prompt,
        text: "",
        symbol_concept: null,
        enabled: true,
      })),
    });
  };

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="We are doing this now because…"
        title="Prepare Me"
        description="A reusable way to prepare a pupil for something new, different or unexpected. Every section and every word is editable."
      />

      <SectionCard
        title="Start from a situation"
        description="These are examples. Add your own situations, or change the sections inside any of them."
        testId="prepare-templates"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {templates.map((tpl) => (
            <div key={tpl.id} className="relative">
              <SymbolTile
                conceptKey={tpl.symbol_concept}
                label={tpl.name}
                sublabel={`${(tpl.sections || []).length} sections`}
                size="lg"
                showLabel
                onClick={canEdit ? () => startFromTemplate(tpl) : undefined}
                testId="prepare-template-card"
              />
              {tpl.is_sample ? <SampleBadge className="absolute right-2 top-2" /> : null}
              {canEdit ? (
                <ConfirmAction
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-1 right-1"
                      aria-label="Delete template"
                      data-testid="prepare-template-delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[hsl(var(--destructive))]" />
                    </Button>
                  }
                  title={`Delete the ${tpl.name} template?`}
                  description="Stories already written from it are kept."
                  onConfirm={async () => {
                    await api.delete(`/prepare-me/templates/${tpl.id}`);
                    toast.success("Template deleted");
                    load();
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
        {canEdit ? <NewTemplate reload={load} /> : null}
      </SectionCard>

      <SectionCard
        title="Prepared stories"
        description="Open one with a pupil, one page at a time."
        testId="prepare-stories"
      >
        {stories.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {stories.map((story) => (
              <li key={story.id} className="wp-row flex items-center gap-3 p-4" data-testid="prepare-story-row">
                <SymbolImage conceptKey={story.symbol_concept} size="sm" alt="" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{story.title}</p>
                  <p className="truncate text-xs text-[hsl(var(--wp-ink-muted))]">
                    {story.pupils?.length
                      ? story.pupils.map((p) => p.display_name).join(", ")
                      : "For anyone"}
                    {story.event_date ? ` · ${story.event_date}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" onClick={() => setReading(story)} data-testid="prepare-story-read">
                    <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Read
                  </Button>
                  {canEdit ? (
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Delete story" data-testid="prepare-story-delete">
                          <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                        </Button>
                      }
                      title={`Delete "${story.title}"?`}
                      description="This cannot be undone."
                      onConfirm={async () => {
                        await api.delete(`/prepare-me/stories/${story.id}`);
                        toast.success("Story deleted");
                        load();
                      }}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No prepared stories yet"
            description="Choose a situation above to write one. You only fill in the sections that pupil needs."
          />
        )}
      </SectionCard>

      {builder ? (
        <Builder
          draft={builder}
          setDraft={setBuilder}
          pupils={pupils}
          onClose={() => setBuilder(null)}
          reload={load}
        />
      ) : null}
      {reading ? <Reader story={reading} onClose={() => setReading(null)} /> : null}
    </div>
  );
}

function NewTemplate({ reload }) {
  const [name, setName] = useState("");
  const [concept, setConcept] = useState("system.prepare_me");
  return (
    <div className="mt-4 flex flex-wrap items-end gap-3 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
      <div>
        <Label htmlFor="new-prep">New situation</Label>
        <Input
          id="new-prep"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Fire drill"
          className="mt-1.5 w-[200px]"
          data-testid="new-prepare-template-name"
        />
      </div>
      <SymbolField value={concept} onChange={setConcept} />
      <Button
        onClick={async () => {
          if (!name.trim()) return;
          await api.post("/prepare-me/templates", { name: name.trim(), symbol_concept: concept });
          toast.success("Situation added with the standard sections");
          setName("");
          reload();
        }}
        data-testid="add-prepare-template"
      >
        <Plus className="mr-1.5 h-4 w-4" /> Add
      </Button>
    </div>
  );
}

function Builder({ draft, setDraft, pupils, onClose, reload }) {
  const update = (index, patch) =>
    setDraft({
      ...draft,
      sections: draft.sections.map((s, n) => (n === index ? { ...s, ...patch } : s)),
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-[var(--wp-radius-xl)]"
        data-testid="prepare-builder"
      >
        <DialogHeader>
          <DialogTitle>Prepare a pupil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="story-title">Title</Label>
              <Input
                id="story-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="mt-1.5"
                data-testid="story-title-input"
              />
            </div>
            <div>
              <Label htmlFor="story-date">When is it happening?</Label>
              <Input
                id="story-date"
                type="date"
                value={draft.event_date || ""}
                onChange={(e) => setDraft({ ...draft, event_date: e.target.value })}
                className="mt-1.5"
                data-testid="story-date-input"
              />
            </div>
          </div>

          <div>
            <Label>Who is this for?</Label>
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
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                      on ? "border-[hsl(var(--wp-teal))] bg-[hsl(var(--wp-teal-100))]" : "border-[hsl(var(--border))]"
                    )}
                    data-testid="story-pupil-toggle"
                  >
                    <PupilAvatar pupil={p} size={24} context="picker" />
                    {p.first_name}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-[hsl(var(--wp-ink-muted))]">
              Leave empty for a whole-class version.
            </p>
          </div>

          <ol className="space-y-3">
            {draft.sections.map((section, index) => (
              <li
                key={section.key}
                className={cn("wp-row p-4", !section.enabled && "opacity-60")}
                data-testid="story-section"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{section.prompt}</p>
                  <div className="flex items-center gap-2">
                    <SymbolField
                      value={section.symbol_concept}
                      label=""
                      onChange={(c) => update(index, { symbol_concept: c })}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => update(index, { enabled: !section.enabled })}
                      data-testid="story-section-toggle"
                    >
                      {section.enabled ? "Not needed" : "Include"}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={section.text}
                  onChange={(e) => update(index, { text: e.target.value })}
                  rows={2}
                  placeholder="Write it in the words this pupil understands"
                  className="mt-3"
                  data-testid="story-section-text"
                />
                <Input
                  defaultValue={section.prompt}
                  onBlur={(e) => update(index, { prompt: e.target.value })}
                  className="mt-2 h-8 text-xs"
                  aria-label="Section wording"
                  data-testid="story-section-prompt"
                />
              </li>
            ))}
          </ol>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!draft.title.trim()) {
                toast.error("Give the story a title");
                return;
              }
              try {
                await api.post("/prepare-me/stories", {
                  ...draft,
                  sections: draft.sections.filter((s) => s.enabled),
                });
                toast.success("Story saved");
                onClose();
                reload();
              } catch (e) {
                toast.error(errorMessage(e));
              }
            }}
            data-testid="story-save"
          >
            Save story
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Reader({ story, onClose }) {
  const [page, setPage] = useState(0);
  const sections = (story.sections || []).filter((s) => s.enabled !== false);
  const section = sections[page];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl rounded-[var(--wp-radius-xl)]" data-testid="prepare-reader">
        <DialogHeader>
          <DialogTitle>{story.title}</DialogTitle>
        </DialogHeader>
        {section ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <SymbolImage
              conceptKey={section.symbol_concept || story.symbol_concept}
              size="hero"
              alt=""
            />
            <p className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
              {section.prompt}
            </p>
            <p className="wp-display max-w-xl text-2xl font-bold leading-snug">
              {section.text || "—"}
            </p>
            <Button
              variant="outline"
              onClick={() => speak(`${section.prompt}. ${section.text}`)}
              data-testid="reader-speak"
            >
              <Volume2 className="mr-1.5 h-4 w-4" /> Read it to me
            </Button>
            <p className="text-xs text-[hsl(var(--wp-ink-muted))]">
              Page {page + 1} of {sections.length}
            </p>
          </div>
        ) : (
          <p className="py-6 text-center text-sm">This story has no sections yet.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} data-testid="reader-back">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={() => setPage((p) => Math.min(sections.length - 1, p + 1))}
            disabled={page >= sections.length - 1}
            data-testid="reader-next"
          >
            Next <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
