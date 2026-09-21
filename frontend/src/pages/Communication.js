import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Volume2 } from "lucide-react";
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
import { api, errorMessage, formatTimeAgo, tint } from "@/lib/api";
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

export default function Communication() {
  const { can } = useApp();
  const [board, setBoard] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [pupils, setPupils] = useState([]);
  const [pupilId, setPupilId] = useState("");
  const [recent, setRecent] = useState([]);
  const [spoken, setSpoken] = useState(null);

  const canEdit = can("comm.edit");

  const load = useCallback(async () => {
    try {
      const [b, p, r] = await Promise.all([
        api.get("/communication/board"),
        api.get("/pupils").catch(() => ({ data: [] })),
        api.get("/communication/recent?limit=12").catch(() => ({ data: [] })),
      ]);
      setBoard(b.data);
      setPupils(p.data);
      setRecent(r.data);
      setActiveId((prev) => prev || b.data[0]?.id || null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("comm.view")) return <AccessDenied what="the Communication Centre" />;
  if (!board) return <Loading label="Loading communication choices" />;

  const active = board.find((c) => c.id === activeId) || board[0];

  const speakOption = async (option) => {
    speak(option.speech_text || option.text);
    setSpoken(option.id);
    setTimeout(() => setSpoken(null), 900);
    try {
      await api.post("/communication/used", {
        option_id: option.id,
        pupil_id: pupilId || null,
        independent: true,
      });
      const { data } = await api.get("/communication/recent?limit=12");
      setRecent(data);
    } catch (e) {
      /* speaking still worked */
    }
  };

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="Communication runs through everything"
        title="Communication Centre"
        description="Tap a card to say it out loud. Every category, choice and symbol here is yours to change."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="comm-pupil" className="text-xs">
                Recording for
              </Label>
              <Select value={pupilId} onValueChange={setPupilId}>
                <SelectTrigger id="comm-pupil" className="h-9 w-[170px]" data-testid="comm-pupil-select">
                  <SelectValue placeholder="Nobody in particular" />
                </SelectTrigger>
                <SelectContent>
                  {pupils.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canEdit ? (
              <div className="flex items-center gap-2">
                <Label htmlFor="comm-edit" className="text-xs">
                  Edit mode
                </Label>
                <Switch id="comm-edit" checked={editMode} onCheckedChange={setEditMode} data-testid="comm-edit-toggle" />
              </div>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-[var(--wp-gap)] lg:grid-cols-[240px_1fr]">
        {/* category rail */}
        <aside className="wp-card p-3" data-testid="comm-categories">
          <ul className="space-y-2">
            {board.map((cat, index) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(cat.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--wp-radius-lg)] border p-2.5 text-left transition-shadow duration-200",
                    active?.id === cat.id
                      ? "border-[hsl(var(--wp-primary))] ring-2 ring-[hsl(var(--wp-primary))]"
                      : "border-[hsl(var(--border))]"
                  )}
                  style={{ backgroundColor: tint(cat.colour) }}
                  data-testid="comm-category-button"
                >
                  <SymbolImage conceptKey={cat.symbol_concept} size="sm" alt="" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{cat.title}</span>
                    <span className="block text-xs text-[hsl(var(--wp-ink-muted))]">
                      {cat.options?.length || 0} choices
                    </span>
                  </span>
                </button>
                {editMode ? (
                  <div className="mt-1 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Move up"
                      onClick={async () => {
                        if (index === 0) return;
                        const ids = board.map((c) => c.id);
                        [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                        await api.post("/communication/categories/reorder", { ids });
                        load();
                      }}
                      data-testid="comm-category-up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Move down"
                      onClick={async () => {
                        if (index === board.length - 1) return;
                        const ids = board.map((c) => c.id);
                        [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
                        await api.post("/communication/categories/reorder", { ids });
                        load();
                      }}
                      data-testid="comm-category-down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Delete category" data-testid="comm-category-delete">
                          <Trash2 className="h-3.5 w-3.5 text-[hsl(var(--destructive))]" />
                        </Button>
                      }
                      title={`Delete the ${cat.title} category?`}
                      description="Its choices are deleted too. This cannot be undone."
                      onConfirm={async () => {
                        await api.delete(`/communication/categories/${cat.id}`);
                        toast.success("Category deleted");
                        setActiveId(null);
                        load();
                      }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {editMode ? <NewCategory reload={load} /> : null}
        </aside>

        {/* options */}
        <section className="wp-card wp-pad" data-testid="comm-board">
          {active ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <SymbolImage conceptKey={active.symbol_concept} size="md" alt="" />
                  <div>
                    <h2 className="wp-display text-2xl font-bold">{active.title}</h2>
                    {active.is_sample ? <SampleBadge /> : null}
                  </div>
                </div>
                {editMode ? (
                  <div className="flex items-center gap-2">
                    <Input
                      defaultValue={active.title}
                      onBlur={async (e) => {
                        if (e.target.value === active.title) return;
                        await api.patch(`/communication/categories/${active.id}`, { title: e.target.value });
                        toast.success("Category renamed");
                        load();
                      }}
                      className="h-9 w-[170px]"
                      data-testid="comm-category-rename"
                    />
                    <SymbolField
                      value={active.symbol_concept}
                      label=""
                      onChange={async (concept) => {
                        await api.patch(`/communication/categories/${active.id}`, { symbol_concept: concept });
                        load();
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {(active.options || []).map((option, index) => (
                  <div key={option.id} className="relative">
                    <SymbolTile
                      conceptKey={option.symbol_concept}
                      label={option.text}
                      size="lg"
                      showLabel
                      onClick={() => speakOption(option)}
                      className={cn(spoken === option.id && "ring-4 ring-[hsl(var(--wp-primary))]")}
                      testId="communication-option-tile"
                    />
                    {editMode ? (
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Move up"
                          onClick={async () => {
                            if (index === 0) return;
                            const ids = active.options.map((o) => o.id);
                            [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                            await api.post("/communication/options/reorder", { ids });
                            load();
                          }}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <OptionEditor option={option} reload={load} />
                        <ConfirmAction
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Delete choice" data-testid="comm-option-delete">
                              <Trash2 className="h-3.5 w-3.5 text-[hsl(var(--destructive))]" />
                            </Button>
                          }
                          title={`Delete "${option.text}"?`}
                          description="This choice will be removed from the board."
                          onConfirm={async () => {
                            await api.delete(`/communication/options/${option.id}`);
                            toast.success("Choice deleted");
                            load();
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
                {editMode ? <NewOption categoryId={active.id} reload={load} /> : null}
              </div>

              {!active.options?.length && !editMode ? (
                <EmptyState
                  title="No choices in this category yet"
                  description="Turn on edit mode to add the words and symbols your pupils need."
                />
              ) : null}

              <p className="mt-5 flex items-center gap-2 text-xs text-[hsl(var(--wp-ink-muted))]">
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                Tapping a card speaks it aloud and allows at least ten seconds of wait time before
                anything else changes.
              </p>
            </>
          ) : (
            <EmptyState title="No categories yet" description="Add the categories your classroom uses." />
          )}
        </section>
      </div>

      <SectionCard title="Recently used" description="A light record so communication feeds into progress." testId="comm-recent">
        {recent.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((entry) => (
              <li key={entry.id} className="wp-row flex items-center gap-3 p-3">
                <SymbolImage conceptKey={entry.option?.symbol_concept} size="xs" alt="" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{entry.option?.text || "Choice"}</p>
                  <p className="truncate text-xs text-[hsl(var(--wp-ink-muted))]">
                    {entry.pupil?.display_name || "Whole class"}
                  </p>
                </div>
                <span className="text-xs text-[hsl(var(--wp-ink-muted))]">{formatTimeAgo(entry.at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[hsl(var(--wp-ink-muted))]">Nothing used yet today.</p>
        )}
      </SectionCard>
    </div>
  );
}

function NewCategory({ reload }) {
  const [title, setTitle] = useState("");
  const [concept, setConcept] = useState("comm.communication");
  return (
    <div className="mt-3 space-y-2 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
      <Label htmlFor="new-cat" className="text-xs">
        New category
      </Label>
      <Input
        id="new-cat"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-9"
        data-testid="comm-new-category-title"
      />
      <SymbolField value={concept} onChange={setConcept} label="" />
      <Button
        size="sm"
        className="w-full"
        onClick={async () => {
          if (!title.trim()) return;
          await api.post("/communication/categories", { title: title.trim(), symbol_concept: concept });
          toast.success("Category added");
          setTitle("");
          reload();
        }}
        data-testid="comm-add-category"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add category
      </Button>
    </div>
  );
}

function NewOption({ categoryId, reload }) {
  const [text, setText] = useState("");
  const [concept, setConcept] = useState("comm.communication");
  return (
    <div className="flex flex-col gap-2 rounded-[var(--wp-radius-2xl)] border border-dashed border-[hsl(var(--border))] p-3">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="New choice"
        className="h-9"
        data-testid="comm-new-option-text"
      />
      <SymbolField value={concept} onChange={setConcept} label="" />
      <Button
        size="sm"
        onClick={async () => {
          if (!text.trim()) return;
          await api.post("/communication/options", {
            category_id: categoryId,
            text: text.trim(),
            speech_text: text.trim(),
            symbol_concept: concept,
          });
          toast.success("Choice added");
          setText("");
          reload();
        }}
        data-testid="comm-add-option"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
      </Button>
    </div>
  );
}

function OptionEditor({ option, reload }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="ghost" size="icon" aria-label="Edit choice" onClick={() => setOpen(true)} data-testid="comm-option-edit">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    );
  }
  return (
    <div className="absolute inset-x-0 top-0 z-10 space-y-2 rounded-[var(--wp-radius-lg)] border border-[hsl(var(--wp-primary))] bg-white p-2 shadow-[var(--wp-shadow-md)]">
      <Input
        defaultValue={option.text}
        onBlur={async (e) => {
          if (e.target.value === option.text) return;
          await api.patch(`/communication/options/${option.id}`, {
            text: e.target.value,
            speech_text: e.target.value,
          });
          reload();
        }}
        className="h-8 text-sm"
        data-testid="comm-option-rename"
      />
      <SymbolField
        value={option.symbol_concept}
        label=""
        onChange={async (concept) => {
          await api.patch(`/communication/options/${option.id}`, { symbol_concept: concept });
          reload();
        }}
      />
      <Button size="sm" variant="outline" className="w-full" onClick={() => setOpen(false)}>
        Close
      </Button>
    </div>
  );
}
