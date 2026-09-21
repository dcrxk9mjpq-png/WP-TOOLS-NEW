import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Dices, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errorMessage, formatTimeAgo } from "@/lib/api";
import { useApp, speak } from "@/context/AppContext";
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

export default function Pickers() {
  const { can, appearance } = useApp();
  const [pickers, setPickers] = useState(null);
  const [pupils, setPupils] = useState([]);
  const [active, setActive] = useState(null);
  const [result, setResult] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState([]);
  const [editing, setEditing] = useState(null);

  const canEdit = can("pickers.edit");

  const load = useCallback(async () => {
    try {
      const [pk, pu] = await Promise.all([
        api.get("/pickers"),
        api.get("/pupils").catch(() => ({ data: [] })),
      ]);
      setPickers(pk.data);
      setPupils(pu.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("pickers.use")) return <AccessDenied what="random pickers" />;
  if (!pickers) return <Loading label="Loading pickers" />;

  const spin = async (picker) => {
    setActive(picker);
    setResult(null);
    setSpinning(true);
    const delay = appearance.animation === "none" ? 0 : appearance.animation === "full" ? 900 : 400;
    try {
      const { data } = await api.post(`/pickers/${picker.id}/spin`);
      setTimeout(() => {
        setResult(data.chosen);
        setSpinning(false);
        speak(data.chosen.label);
      }, delay);
      const h = await api.get(`/pickers/${picker.id}/history`);
      setHistory(h.data);
    } catch (e) {
      setSpinning(false);
      toast.error(errorMessage(e));
    }
  };

  const chosenPupil = result ? pupils.find((p) => p.id === result.id) : null;

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="Fair, predictable choosing"
        title="Random pickers"
        description="Create any picker your classroom needs. Rules such as no immediate repeat keep it feeling fair."
        actions={canEdit ? <NewPicker reload={load} /> : null}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pickers.map((picker) => (
          <div key={picker.id} className="wp-card p-4" data-testid="picker-card">
            <div className="flex items-start gap-3">
              <SymbolImage conceptKey={picker.symbol_concept} size="md" alt="" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{picker.name}</p>
                  {picker.is_sample ? <SampleBadge /> : null}
                </div>
                <p className="text-xs text-[hsl(var(--wp-ink-muted))]">
                  {picker.kind === "pupil"
                    ? `${pupils.length} pupils`
                    : `${(picker.options || []).length} options`}
                  {picker.rules?.no_immediate_repeat ? " · no immediate repeat" : ""}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => spin(picker)} className="flex-1 gap-2" data-testid="picker-spin">
                <Dices className="h-4 w-4" /> Pick
              </Button>
              {canEdit ? (
                <>
                  <Button variant="outline" size="icon" aria-label="Edit picker" onClick={() => setEditing(picker)} data-testid="picker-edit">
                    <Plus className="h-4 w-4 rotate-45" />
                  </Button>
                  <ConfirmAction
                    trigger={
                      <Button variant="outline" size="icon" aria-label="Delete picker" data-testid="picker-delete">
                        <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                      </Button>
                    }
                    title={`Delete the "${picker.name}" picker?`}
                    description="Its history is removed too."
                    onConfirm={async () => {
                      await api.delete(`/pickers/${picker.id}`);
                      toast.success("Picker deleted");
                      load();
                    }}
                  />
                </>
              ) : null}
            </div>
          </div>
        ))}
        {!pickers.length ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState title="No pickers yet" description="Create your first picker to get started." />
          </div>
        ) : null}
      </div>

      {/* result */}
      <Dialog open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg rounded-[var(--wp-radius-xl)]" data-testid="picker-result-dialog">
          <DialogHeader>
            <DialogTitle>{active?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            {spinning ? (
              <>
                <Dices className="h-20 w-20 animate-spin text-[hsl(var(--wp-primary))]" aria-hidden="true" />
                <p className="text-sm text-[hsl(var(--wp-ink-muted))]">Choosing…</p>
              </>
            ) : result ? (
              <>
                {chosenPupil ? (
                  <PupilAvatar pupil={chosenPupil} size={140} context="picker" />
                ) : (
                  <SymbolImage conceptKey={result.symbol_concept} size="hero" alt="" />
                )}
                <p className="wp-display text-3xl font-bold" data-testid="picker-result-label">
                  {result.label}
                </p>
              </>
            ) : null}
            <div className="flex gap-2">
              <Button onClick={() => active && spin(active)} data-testid="picker-again">
                Pick again
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await api.post(`/pickers/${active.id}/reset`);
                  setHistory([]);
                  toast.success("History cleared");
                }}
                data-testid="picker-reset-history"
              >
                <RotateCcw className="mr-1.5 h-4 w-4" /> Clear history
              </Button>
            </div>
            {history.length ? (
              <div className="w-full text-left">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
                  Chosen recently
                </p>
                <ul className="space-y-1">
                  {history.slice(0, 6).map((h) => (
                    <li key={h.id} className="flex justify-between text-sm" data-testid="picker-history-row">
                      <span>{h.result_label}</span>
                      <span className="text-xs text-[hsl(var(--wp-ink-muted))]">{formatTimeAgo(h.at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {editing ? (
        <PickerEditor picker={editing} pupils={pupils} onClose={() => setEditing(null)} reload={load} />
      ) : null}
    </div>
  );
}

function NewPicker({ reload }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("pupil");
  const [concept, setConcept] = useState("system.picker");

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2" data-testid="new-picker-open">
        <Plus className="h-4 w-4" /> New picker
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
      <div>
        <Label htmlFor="picker-name" className="text-xs">
          Name
        </Label>
        <Input
          id="picker-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 h-9 w-[170px]"
          data-testid="new-picker-name"
        />
      </div>
      <div>
        <Label className="text-xs">Type</Label>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="mt-1 h-9 w-[130px]" data-testid="new-picker-kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pupil">Pupils</SelectItem>
            <SelectItem value="option">Options</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <SymbolField value={concept} onChange={setConcept} label="" />
      <Button
        onClick={async () => {
          if (!name.trim()) return;
          await api.post("/pickers", { name: name.trim(), kind, symbol_concept: concept, options: [] });
          toast.success("Picker created");
          setName("");
          setOpen(false);
          reload();
        }}
        data-testid="create-picker"
      >
        Create
      </Button>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

function PickerEditor({ picker, pupils, onClose, reload }) {
  const [options, setOptions] = useState(picker.options || []);
  const [rules, setRules] = useState(picker.rules || {});
  const [name, setName] = useState(picker.name);
  const [newOption, setNewOption] = useState("");

  const save = async () => {
    await api.patch(`/pickers/${picker.id}`, { name, options, rules });
    toast.success("Picker updated");
    onClose();
    reload();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-[var(--wp-radius-xl)]"
        data-testid="picker-editor"
      >
        <DialogHeader>
          <DialogTitle>Configure picker</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <Label htmlFor="picker-edit-name">Name</Label>
            <Input
              id="picker-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              data-testid="picker-edit-name"
            />
          </div>

          <div className="space-y-3 rounded-[var(--wp-radius-lg)] border border-[hsl(var(--border))] p-4">
            <p className="text-sm font-semibold">Selection rules</p>
            <div className="flex items-center justify-between">
              <Label htmlFor="rule-repeat" className="text-sm font-normal">
                Never choose the same one twice in a row
              </Label>
              <Switch
                id="rule-repeat"
                checked={Boolean(rules.no_immediate_repeat)}
                onCheckedChange={(v) => setRules({ ...rules, no_immediate_repeat: v })}
                data-testid="rule-no-repeat"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="rule-recent" className="text-sm font-normal">
                Avoid the last N chosen
              </Label>
              <Input
                id="rule-recent"
                type="number"
                min={0}
                max={10}
                value={rules.avoid_recent ?? 0}
                onChange={(e) => setRules({ ...rules, avoid_recent: Number(e.target.value) })}
                className="h-9 w-20"
                data-testid="rule-avoid-recent"
              />
            </div>
            {picker.kind === "pupil" ? (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="rule-photos" className="text-sm font-normal">
                    Show photographs in this picker
                  </Label>
                  <Switch
                    id="rule-photos"
                    checked={Boolean(rules.show_photos)}
                    onCheckedChange={(v) => setRules({ ...rules, show_photos: v })}
                    data-testid="rule-show-photos"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-normal">Leave these pupils out</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pupils.map((p) => {
                      const off = (rules.excluded_ids || []).includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setRules({
                              ...rules,
                              excluded_ids: off
                                ? (rules.excluded_ids || []).filter((x) => x !== p.id)
                                : [...(rules.excluded_ids || []), p.id],
                            })
                          }
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                            off
                              ? "border-[hsl(var(--destructive))] bg-red-50 text-[hsl(var(--destructive))]"
                              : "border-[hsl(var(--border))] bg-white"
                          )}
                          data-testid="picker-exclude-toggle"
                        >
                          {p.first_name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {picker.kind !== "pupil" ? (
            <div>
              <p className="mb-2 text-sm font-semibold">Options</p>
              <ul className="space-y-2">
                {options.map((o, index) => (
                  <li key={o.id || index} className="flex items-center gap-2">
                    <SymbolField
                      value={o.symbol_concept}
                      label=""
                      onChange={(c) =>
                        setOptions(options.map((x, n) => (n === index ? { ...x, symbol_concept: c } : x)))
                      }
                    />
                    <Input
                      value={o.label}
                      onChange={(e) =>
                        setOptions(options.map((x, n) => (n === index ? { ...x, label: e.target.value } : x)))
                      }
                      className="h-9"
                      data-testid="picker-option-input"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove option"
                      onClick={() => setOptions(options.filter((_, n) => n !== index))}
                    >
                      <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="New option"
                  className="h-9"
                  data-testid="picker-new-option"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!newOption.trim()) return;
                    setOptions([
                      ...options,
                      {
                        id: `o-${Date.now()}`,
                        label: newOption.trim(),
                        symbol_concept: "system.picker",
                      },
                    ]);
                    setNewOption("");
                  }}
                  data-testid="picker-add-option"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} data-testid="picker-editor-save">
              Save picker
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
