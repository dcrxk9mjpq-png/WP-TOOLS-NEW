import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Film, Leaf, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, errorMessage, tint } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { SymbolImage } from "@/components/Symbol";
import { SymbolField } from "@/components/SymbolPicker";
import { SpeakButton } from "@/components/SpeakButton";
import {
  AccessDenied,
  AddButton,
  ConfirmAction,
  EmptyState,
  FieldGroup,
  Loading,
  PageHeader,
  SampleBadge,
  SectionCard,
} from "@/components/common";
import {
  BrainBreakRunner,
  PURPOSES,
  formatClock,
  purposeLabel,
  purposeTint,
  useBrainBreakRunner,
} from "@/components/BrainBreakRunner";

const blankStep = () => ({
  title: "",
  say: "",
  seconds: 20,
  pattern: null,
  symbol_concept: "regulation.calm",
});

const blankGuided = () => ({
  kind: "guided",
  title: "",
  description: "",
  purpose: "calm",
  symbol_concept: "regulation.deep_breaths",
  repeat: 1,
  enabled: true,
  steps: [blankStep()],
});

/* ------------------------------------------------------------------ */

const BreakCard = ({ item, canEdit, onRun, onEdit, onToggle, onDelete, onMove, first, last }) => (
  <article
    className="wp-card overflow-hidden"
    style={{ backgroundColor: tint(purposeTint(item.purpose)) }}
    data-testid={`brain-break-card-${item.id}`}
  >
    <div className="flex items-start gap-4 p-[var(--wp-card-pad)]">
      <SymbolImage conceptKey={item.symbol_concept} size="lg" alt={item.title} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="wp-display text-lg font-bold leading-tight">{item.title}</h3>
          {item.is_sample ? <SampleBadge /> : null}
          {!item.enabled ? (
            <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--wp-ink-muted))]">
              Hidden
            </span>
          ) : null}
        </div>
        <p className="wp-tabular mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--wp-ink-muted))]">
          {purposeLabel(item.purpose)} · {formatClock(item.duration_seconds)} ·{" "}
        {item.steps?.length || 0} step{item.steps?.length === 1 ? "" : "s"}
        {item.repeat > 1 ? ` × ${item.repeat}` : ""}
        </p>
        {item.description ? (
          <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--wp-ink-muted))]">
            {item.description}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => onRun(item)} className="gap-2" data-testid={`brain-break-run-${item.id}`}>
            <Play className="h-4 w-4" aria-hidden="true" />
            Run it
          </Button>
          {item.steps?.[0] ? (
            <SpeakButton
              text={item.steps[0].say || item.steps[0].title}
              label={`Hear the first line of ${item.title}`}
              testId={`brain-break-preview-voice-${item.id}`}
            />
          ) : null}
          {canEdit ? (
            <>
              <Button
                variant="outline"
                onClick={() => onEdit(item)}
                className="bg-[hsl(var(--card))]"
                data-testid={`brain-break-edit-${item.id}`}
              >
                Edit
              </Button>
              <div className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5">
                <Switch
                  checked={item.enabled}
                  onCheckedChange={(v) => onToggle(item, v)}
                  aria-label={`Show ${item.title} to pupils`}
                  data-testid={`brain-break-enabled-${item.id}`}
                />
                <span className="text-xs font-semibold">Shown to pupils</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                disabled={first}
                onClick={() => onMove(item, -1)}
                aria-label="Move up"
                className="bg-[hsl(var(--card))]"
                data-testid={`brain-break-up-${item.id}`}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={last}
                onClick={() => onMove(item, 1)}
                aria-label="Move down"
                className="bg-[hsl(var(--card))]"
                data-testid={`brain-break-down-${item.id}`}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <ConfirmAction
                trigger={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Delete ${item.title}`}
                    className="bg-[hsl(var(--card))] text-[hsl(var(--wp-danger))]"
                    data-testid={`brain-break-delete-${item.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
                title={`Delete "${item.title}"?`}
                description="This brain break will be removed from the classroom. This cannot be undone."
                onConfirm={() => onDelete(item)}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  </article>
);

/* ------------------------------------------------------------------ */

const StepEditor = ({ step, index, onChange, onRemove, canRemove }) => (
  <div className="wp-row p-[var(--wp-row-pad)]" data-testid={`brain-break-step-${index}`}>
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-start gap-3">
        <SymbolField
          value={step.symbol_concept}
          onChange={(concept) => onChange({ ...step, symbol_concept: concept })}
          label={`Symbol for step ${index + 1}`}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={step.title}
            onChange={(e) => onChange({ ...step, title: e.target.value })}
            placeholder="What the child sees, e.g. Breathe in"
            data-testid={`brain-break-step-title-${index}`}
          />
          <Input
            value={step.say}
            onChange={(e) => onChange({ ...step, say: e.target.value })}
            placeholder="What is said aloud (leave blank to say the title)"
            data-testid={`brain-break-step-say-${index}`}
          />
        </div>
        {canRemove ? (
          <Button
            variant="outline"
            size="icon"
            onClick={onRemove}
            aria-label={`Remove step ${index + 1}`}
            className="text-[hsl(var(--wp-danger))]"
            data-testid={`brain-break-step-remove-${index}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldGroup label="Seconds">
          <Input
            type="number"
            min={3}
            max={180}
            value={step.seconds}
            onChange={(e) => onChange({ ...step, seconds: Number(e.target.value) })}
            data-testid={`brain-break-step-seconds-${index}`}
          />
        </FieldGroup>
        <FieldGroup label="Breathing" hint="Only for breathing steps.">
          <Select
            value={step.pattern || "none"}
            onValueChange={(v) => onChange({ ...step, pattern: v === "none" ? null : v })}
          >
            <SelectTrigger data-testid={`brain-break-step-pattern-${index}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not a breathing step</SelectItem>
              <SelectItem value="in">Breathe in — circle grows</SelectItem>
              <SelectItem value="hold">Hold — circle still</SelectItem>
              <SelectItem value="out">Breathe out — circle shrinks</SelectItem>
            </SelectContent>
          </Select>
        </FieldGroup>
      </div>
    </div>
  </div>
);

const BreakDialog = ({ open, onOpenChange, draft, setDraft, onSave, saving }) => {
  if (!draft) return null;
  const totalSeconds =
    (draft.steps || []).reduce((sum, st) => sum + (Number(st.seconds) || 0), 0) *
    Math.max(1, Number(draft.repeat) || 1);

  const setStep = (index, next) => {
    const steps = [...draft.steps];
    steps[index] = next;
    setDraft({ ...draft, steps });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-[var(--wp-radius-xl)]"
        data-testid="brain-break-dialog"
      >
        <DialogHeader>
          <DialogTitle className="wp-display text-xl font-bold">
            {draft.id ? "Edit brain break" : "New guided break"}
          </DialogTitle>
          <DialogDescription>
            Each step shows one symbol, says one sentence in the classroom voice, and lasts a set
            number of seconds. Repeat the whole sequence to make it longer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <SymbolField
              value={draft.symbol_concept}
              onChange={(concept) => setDraft({ ...draft, symbol_concept: concept })}
              label="Symbol"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <FieldGroup label="Name">
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Square breathing"
                  data-testid="brain-break-title-input"
                />
              </FieldGroup>
              <FieldGroup label="What it is for">
                <Select
                  value={draft.purpose}
                  onValueChange={(v) => setDraft({ ...draft, purpose: v })}
                >
                  <SelectTrigger data-testid="brain-break-purpose-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {purposeLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>
          </div>

          <FieldGroup label="Note for staff" hint="Optional. When to reach for this one.">
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              data-testid="brain-break-description-input"
            />
          </FieldGroup>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <FieldGroup
              label="Repeat the whole sequence"
              hint={`Total length: ${formatClock(totalSeconds)}`}
              className="w-40"
            >
              <Input
                type="number"
                min={1}
                max={20}
                value={draft.repeat}
                onChange={(e) => setDraft({ ...draft, repeat: Number(e.target.value) })}
                data-testid="brain-break-repeat-input"
              />
            </FieldGroup>
            <Button
              variant="outline"
              onClick={() => setDraft({ ...draft, steps: [...draft.steps, blankStep()] })}
              className="gap-2"
              data-testid="brain-break-add-step"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add a step
            </Button>
          </div>
          <div className="space-y-2">
            {(draft.steps || []).map((step, index) => (
              <StepEditor
                key={index}
                step={step}
                index={index}
                onChange={(next) => setStep(index, next)}
                canRemove={(draft.steps || []).length > 1}
                onRemove={() =>
                  setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) })
                }
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="brain-break-cancel">
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving} data-testid="brain-break-save">
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ------------------------------------------------------------------ */

export default function BrainBreaks() {
  const { can } = useApp();
  const canEdit = can("brain_breaks.edit");
  const [items, setItems] = useState(null);
  const [draft, setDraft] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { active, start, stop } = useBrainBreakRunner();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/brain-breaks");
      setItems(data);
    } catch (e) {
      toast.error(errorMessage(e));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("brain_breaks.view")) return <AccessDenied what="Brain Breaks" />;
  if (!items) return <Loading label="Loading brain breaks" />;

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...draft };
      body.steps = (body.steps || [])
        .filter((s) => s.title.trim())
        .map((s) => ({ ...s, say: s.say?.trim() || s.title.trim() }));
      if (draft.id) await api.patch(`/brain-breaks/${draft.id}`, body);
      else await api.post("/brain-breaks", body);
      await load();
      setDialogOpen(false);
      toast.success(draft.id ? "Brain break updated" : "Brain break added");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const act = async (request, message) => {
    try {
      await request();
      await load();
      if (message) toast.success(message);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const move = (item, direction) => {
    const list = [...items];
    const from = list.findIndex((i) => i.id === item.id);
    const to = from + direction;
    if (to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]];
    setItems(list);
    act(() => api.post("/brain-breaks/reorder", { ids: list.map((i) => i.id) }));
  };

  const openNew = () => {
    setDraft(blankGuided());
    setDialogOpen(true);
  };

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="Communication & regulation"
        title="Brain Breaks"
        description="One to two minute guided activities to calm a body down, wake a body up, or bring attention back. Run one on the classroom screen and the platform reads each step aloud in the classroom voice, so the adult can stay with the child instead of reading a script."
        actions={
          canEdit ? (
            <>
              <AddButton onClick={openNew} testId="brain-break-new-guided">
                New guided break
              </AddButton>
              <Button asChild variant="outline" className="gap-2" data-testid="brain-break-open-watch">
                <Link to="/watch">
                  <Film className="h-4 w-4" aria-hidden="true" />
                  Video breaks
                </Link>
              </Button>
            </>
          ) : null
        }
      >
        <p className="mt-3 max-w-2xl rounded-[var(--wp-radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--wp-surface-sunken))] p-3 text-sm leading-relaxed text-[hsl(var(--wp-ink-muted))]">
          These are the platform's own activities: no internet video, no adverts, nothing that can
          trail off into something nobody chose. Video breaks — movement clips, calming clips, the
          morning song, Alphablocks and Numberblocks — all live together in{" "}
          <Link to="/watch" className="font-semibold text-[hsl(var(--wp-primary))] underline">
            Watch
          </Link>
          .
        </p>
      </PageHeader>

      {items.length ? (
        <div className="grid gap-[var(--wp-gap)] xl:grid-cols-2">
          {items.map((item, index) => (
            <BreakCard
              key={item.id}
              item={item}
              canEdit={canEdit}
              first={index === 0}
              last={index === items.length - 1}
              onRun={start}
              onEdit={(i) => {
                setDraft({ ...i, steps: i.steps?.length ? i.steps : [blankStep()] });
                setDialogOpen(true);
              }}
              onToggle={(i, v) => act(() => api.patch(`/brain-breaks/${i.id}`, { enabled: v }))}
              onDelete={(i) => act(() => api.delete(`/brain-breaks/${i.id}`), "Brain break deleted")}
              onMove={move}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Leaf}
          title="No guided breaks yet"
          description="A guided break is a list of steps. Each one shows a symbol, says a sentence aloud and lasts a set number of seconds."
          action={
            canEdit ? (
              <AddButton onClick={openNew} testId="brain-break-empty-guided">
                Create the first one
              </AddButton>
            ) : null
          }
        />
      )}

      <BreakDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        draft={draft}
        setDraft={setDraft}
        onSave={save}
        saving={saving}
      />

      {active ? <BrainBreakRunner item={active} onClose={stop} /> : null}
    </div>
  );
}
