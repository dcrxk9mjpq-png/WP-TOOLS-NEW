import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  Copy,
  FastForward,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, errorMessage, formatLongDate } from "@/lib/api";
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
  StatusChip,
} from "@/components/common";

const COLOURS = ["teal", "mint", "peach", "lilac", "butter", "blush", "sage", "sky", "rose"];
const VISIBILITY = [
  { value: "now", label: "Now only" },
  { value: "now_next", label: "Now and Next" },
  { value: "now_next_later", label: "Now, Next and one Later" },
  { value: "full", label: "The whole day" },
];

const emptyItem = {
  title: "",
  symbol_concept: "routine.timetable",
  start: "",
  end: "",
  colour: "teal",
  note: "",
};

export default function Timetable() {
  const { can } = useApp();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [day, setDay] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [activities, setActivities] = useState([]);
  const [pupils, setPupils] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");

  const canEdit = can("timetable.edit");
  const canTemplates = can("template.edit");

  const loadDay = useCallback(async (d) => {
    const { data } = await api.get(`/timetable/day?date=${d}`);
    setDay(data);
  }, []);

  const loadAll = useCallback(
    async (d) => {
      try {
        const [dayRes, tplRes, actRes, pupilRes] = await Promise.all([
          api.get(`/timetable/day?date=${d}`),
          api.get("/timetable/templates"),
          api.get("/timetable/activities"),
          api.get("/pupils").catch(() => ({ data: [] })),
        ]);
        setDay(dayRes.data);
        setTemplates(tplRes.data);
        setActivities(actRes.data);
        setPupils(pupilRes.data);
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    []
  );

  useEffect(() => {
    loadAll(date);
  }, [date, loadAll]);

  if (!can("timetable.view")) return <AccessDenied what="the timetable" />;
  if (!day) return <Loading label="Loading the timetable" />;

  const items = day.items || [];

  const mutate = async (fn, message) => {
    try {
      const data = await fn();
      if (data) setDay(data);
      else await loadDay(date);
      if (message) toast.success(message);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const move = (index, delta) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    mutate(
      async () =>
        (await api.post(`/timetable/day/reorder?date=${date}`, { item_ids: next.map((i) => i.id) })).data,
      "Order updated"
    );
  };

  const saveItem = async () => {
    if (!editing?.title?.trim()) {
      toast.error("Give the activity a name");
      return;
    }
    const payload = {
      title: editing.title.trim(),
      symbol_concept: editing.symbol_concept,
      start: editing.start,
      end: editing.end,
      colour: editing.colour,
      note: editing.note,
    };
    try {
      if (editing.id) {
        const { data } = await api.patch(`/timetable/day/items/${editing.id}?date=${date}`, payload);
        setDay(data);
        toast.success("Activity updated for this day only");
      } else {
        const { data } = await api.post(`/timetable/day/items?date=${date}`, payload);
        setDay(data);
        toast.success("Activity added to today");
      }
      setEditing(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="Classroom day"
        title="Visual timetable"
        description="Change today freely. Templates and other days are never affected by what you do here."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-[168px]"
              data-testid="timetable-date"
            />
            {canEdit ? (
              <Button onClick={() => setEditing({ ...emptyItem })} className="gap-2" data-testid="timetable-add-activity">
                <Plus className="h-4 w-4" /> Add activity
              </Button>
            ) : null}
          </div>
        }
      />

      <Tabs defaultValue="today">
        <TabsList data-testid="timetable-tabs">
          <TabsTrigger value="today" data-testid="tab-today">Today</TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
          <TabsTrigger value="activities" data-testid="tab-activities">Activity library</TabsTrigger>
          <TabsTrigger value="pupils" data-testid="tab-pupil-adaptations">Pupil adaptations</TabsTrigger>
        </TabsList>

        {/* ------------------------------- TODAY ------------------------------ */}
        <TabsContent value="today" className="mt-[var(--wp-gap)] space-y-[var(--wp-gap)]">
          <SectionCard
            title={formatLongDate(date)}
            description={`${day.progress?.done || 0} of ${day.progress?.total || 0} activities finished`}
            actions={
              canEdit ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => mutate(async () => (await api.post(`/timetable/day/advance?date=${date}`)).data, "Moved on")} className="gap-1.5" data-testid="timetable-advance">
                    <FastForward className="h-3.5 w-3.5" /> Move on
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => mutate(async () => (await api.post(`/timetable/day/reset`, { date })).data, "Day reset")} className="gap-1.5" data-testid="timetable-reset">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </Button>
                  {canTemplates ? (
                    <Button variant="outline" size="sm" onClick={() => setSaveTplOpen(true)} className="gap-1.5" data-testid="timetable-save-as-template">
                      <Save className="h-3.5 w-3.5" /> Save as template
                    </Button>
                  ) : null}
                </>
              ) : null
            }
            testId="timetable-today"
          >
            {canEdit ? (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
                  Load a template into this day
                </span>
                {templates.map((tpl) => (
                  <Button
                    key={tpl.id}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      mutate(
                        async () =>
                          (await api.post("/timetable/day/load-template", { template_id: tpl.id, date, replace: true })).data,
                        `${tpl.name} loaded into ${date}`
                      )
                    }
                    data-testid="timetable-load-template"
                  >
                    {tpl.name}
                  </Button>
                ))}
              </div>
            ) : null}

            {items.length ? (
              <ol className="space-y-2" data-testid="timetable-list">
                {items.map((item, index) => {
                  const status =
                    item.status === "current"
                      ? "current"
                      : item.id === day.next?.id
                      ? "next"
                      : item.status;
                  return (
                    <li
                      key={item.id}
                      className={`wp-row flex flex-wrap items-center gap-3 p-3 ${
                        item.status === "done" ? "opacity-65" : ""
                      } ${item.status === "skipped" ? "wp-hatch" : ""}`}
                      data-testid="timetable-item"
                    >
                      <SymbolImage conceptKey={item.symbol_concept} size="sm" alt={item.title} />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-semibold ${
                            item.status === "done" ? "line-through decoration-1" : ""
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-[hsl(var(--wp-ink-muted))]">
                          {item.start || "--:--"}
                          {item.end ? ` – ${item.end}` : ""}
                          {item.note ? ` · ${item.note}` : ""}
                        </p>
                      </div>
                      <StatusChip status={status} />
                      {canEdit ? (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" aria-label="Move up" onClick={() => move(index, -1)} data-testid="timetable-move-up">
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Move down" onClick={() => move(index, 1)} data-testid="timetable-move-down">
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Mark as now"
                            onClick={() =>
                              mutate(
                                async () =>
                                  (await api.post(`/timetable/day/items/${item.id}/status?date=${date}`, { status: "current" })).data,
                                `${item.title} is now`
                              )
                            }
                            data-testid="timetable-mark-now"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Duplicate"
                            onClick={() =>
                              mutate(
                                async () => (await api.post(`/timetable/day/items/${item.id}/duplicate?date=${date}`)).data,
                                "Activity duplicated"
                              )
                            }
                            data-testid="timetable-duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing({ ...item })} data-testid="timetable-edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmAction
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="Delete" data-testid="timetable-delete">
                                <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                              </Button>
                            }
                            title={`Remove ${item.title} from this day?`}
                            description="This only changes this day. Templates and other days stay exactly as they are."
                            confirmLabel="Remove"
                            onConfirm={() =>
                              mutate(
                                async () => (await api.delete(`/timetable/day/items/${item.id}?date=${date}`)).data,
                                "Removed from this day"
                              )
                            }
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState
                title="This day is empty"
                description="Load one of your templates, or build the day from scratch."
                action={
                  canEdit ? (
                    <Button onClick={() => setEditing({ ...emptyItem })} data-testid="timetable-empty-add">
                      Add the first activity
                    </Button>
                  ) : null
                }
              />
            )}
          </SectionCard>
        </TabsContent>

        {/* ----------------------------- TEMPLATES ---------------------------- */}
        <TabsContent value="templates" className="mt-[var(--wp-gap)]">
          <TemplatesPanel
            templates={templates}
            canEdit={canTemplates}
            reload={() => loadAll(date)}
            activities={activities}
          />
        </TabsContent>

        {/* ---------------------------- ACTIVITIES ---------------------------- */}
        <TabsContent value="activities" className="mt-[var(--wp-gap)]">
          <ActivityLibrary activities={activities} canEdit={canTemplates} reload={() => loadAll(date)} />
        </TabsContent>

        {/* -------------------------- PUPIL ADAPTATIONS ----------------------- */}
        <TabsContent value="pupils" className="mt-[var(--wp-gap)]">
          <PupilAdaptations pupils={pupils} day={day} date={date} canEdit={canEdit} />
        </TabsContent>
      </Tabs>

      {/* edit / add dialog */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-[var(--wp-radius-xl)]" data-testid="timetable-item-dialog">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit this activity" : "Add an activity to today"}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="activity-title">Name</Label>
                <Input
                  id="activity-title"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="mt-1.5"
                  data-testid="activity-title-input"
                />
              </div>
              {activities.length && !editing.id ? (
                <div>
                  <Label>Or pick from your activity library</Label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {activities.slice(0, 12).map((a) => (
                      <Button
                        key={a.id}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            title: a.title,
                            symbol_concept: a.symbol_concept,
                            colour: a.colour,
                          })
                        }
                        data-testid="activity-library-pick"
                      >
                        {a.title}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              <SymbolField
                value={editing.symbol_concept}
                onChange={(concept) => setEditing({ ...editing, symbol_concept: concept })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start">Starts</Label>
                  <Input
                    id="start"
                    type="time"
                    value={editing.start || ""}
                    onChange={(e) => setEditing({ ...editing, start: e.target.value })}
                    className="mt-1.5"
                    data-testid="activity-start"
                  />
                </div>
                <div>
                  <Label htmlFor="end">Ends</Label>
                  <Input
                    id="end"
                    type="time"
                    value={editing.end || ""}
                    onChange={(e) => setEditing({ ...editing, end: e.target.value })}
                    className="mt-1.5"
                    data-testid="activity-end"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="note">Note for staff (optional)</Label>
                <Textarea
                  id="note"
                  value={editing.note || ""}
                  onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                  rows={2}
                  className="mt-1.5"
                  data-testid="activity-note"
                />
              </div>
              <div>
                <Label>Card colour</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {COLOURS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditing({ ...editing, colour: c })}
                      className={`h-8 w-8 rounded-full border-2 ${
                        editing.colour === c ? "border-[hsl(var(--wp-teal))]" : "border-white"
                      }`}
                      style={{ backgroundColor: `hsl(var(--wp-tint-${c === "teal" ? "mint" : c}))` }}
                      aria-label={c}
                      data-testid={`activity-colour-${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveItem} data-testid="activity-save">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* save as template */}
      <Dialog open={saveTplOpen} onOpenChange={setSaveTplOpen}>
        <DialogContent className="rounded-[var(--wp-radius-xl)]" data-testid="save-template-dialog">
          <DialogHeader>
            <DialogTitle>Save this day as a new template</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="tpl-name">Template name</Label>
            <Input
              id="tpl-name"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="e.g. Sports day"
              className="mt-1.5"
              data-testid="template-name-input"
            />
            <p className="mt-2 text-xs text-[hsl(var(--wp-ink-muted))]">
              This creates a brand new template. Nothing existing is overwritten.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTplOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!tplName.trim()) {
                  toast.error("Give the template a name");
                  return;
                }
                try {
                  await api.post("/timetable/day/save-as-template", { name: tplName.trim(), date });
                  toast.success("Template saved");
                  setSaveTplOpen(false);
                  setTplName("");
                  await loadAll(date);
                } catch (e) {
                  toast.error(errorMessage(e));
                }
              }}
              data-testid="template-save"
            >
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------------------------------------------------------- */
function TemplatesPanel({ templates, canEdit, reload, activities }) {
  const [open, setOpen] = useState(null);
  const [name, setName] = useState("");

  const createTemplate = async () => {
    if (!name.trim()) {
      toast.error("Give the template a name");
      return;
    }
    try {
      await api.post("/timetable/templates", { name: name.trim(), items: [] });
      toast.success("Template created");
      setName("");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="wp-stack">
      <SectionCard
        title="Timetable templates"
        description="Save the shapes your week actually takes. Loading a template never changes it."
        actions={
          canEdit ? (
            <div className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New template name"
                className="h-9 w-[190px]"
                data-testid="new-template-name"
              />
              <Button size="sm" onClick={createTemplate} className="gap-1.5" data-testid="create-template">
                <CalendarPlus className="h-3.5 w-3.5" /> Create
              </Button>
            </div>
          ) : null
        }
        testId="templates-panel"
      >
        {templates.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {templates.map((tpl) => (
              <li key={tpl.id} className="wp-row p-4" data-testid="template-card">
                <div className="flex items-start gap-3">
                  <SymbolImage conceptKey={tpl.symbol_concept} size="sm" alt="" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{tpl.name}</p>
                      {tpl.is_sample ? <SampleBadge /> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-[hsl(var(--wp-ink-muted))]">
                      {tpl.items?.length || 0} activities
                      {tpl.description ? ` · ${tpl.description}` : ""}
                    </p>
                    <p className="mt-2 truncate text-xs text-[hsl(var(--wp-ink-muted))]">
                      {(tpl.items || []).map((i) => i.title).join(" → ")}
                    </p>
                  </div>
                </div>
                {canEdit ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setOpen(tpl)} data-testid="template-edit">
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await api.post(`/timetable/templates/${tpl.id}/duplicate`);
                        toast.success("Template duplicated");
                        reload();
                      }}
                      data-testid="template-duplicate"
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Duplicate
                    </Button>
                    <ConfirmAction
                      trigger={
                        <Button size="sm" variant="outline" data-testid="template-delete">
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                        </Button>
                      }
                      title={`Delete the ${tpl.name} template?`}
                      description="Days already built from this template are not affected."
                      onConfirm={async () => {
                        await api.delete(`/timetable/templates/${tpl.id}`);
                        toast.success("Template deleted");
                        reload();
                      }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No templates yet" description="Create the day shapes your classroom uses." />
        )}
      </SectionCard>

      <TemplateEditor template={open} onClose={() => setOpen(null)} reload={reload} activities={activities} />
    </div>
  );
}

function TemplateEditor({ template, onClose, reload, activities }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    setItems(template?.items ? template.items.map((i) => ({ ...i })) : []);
    setName(template?.name || "");
  }, [template]);

  if (!template) return null;

  const update = (index, patch) =>
    setItems((prev) => prev.map((it, n) => (n === index ? { ...it, ...patch } : it)));

  const save = async () => {
    try {
      await api.patch(`/timetable/templates/${template.id}`, { name, items });
      toast.success("Template updated");
      onClose();
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[88vh] max-w-3xl overflow-y-auto rounded-[var(--wp-radius-xl)]"
        data-testid="template-editor"
      >
        <DialogHeader>
          <DialogTitle>Edit template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="tpl-edit-name">Template name</Label>
            <Input
              id="tpl-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              data-testid="template-edit-name"
            />
          </div>
          <ol className="space-y-2">
            {items.map((item, index) => (
              <li key={item.id || index} className="wp-row flex flex-wrap items-center gap-2 p-3">
                <SymbolField
                  value={item.symbol_concept}
                  onChange={(c) => update(index, { symbol_concept: c })}
                  label=""
                />
                <Input
                  value={item.title}
                  onChange={(e) => update(index, { title: e.target.value })}
                  className="h-9 min-w-[140px] flex-1"
                  data-testid="template-item-title"
                />
                <Input
                  type="time"
                  value={item.start || ""}
                  onChange={(e) => update(index, { start: e.target.value })}
                  className="h-9 w-[110px]"
                />
                <Input
                  type="time"
                  value={item.end || ""}
                  onChange={(e) => update(index, { end: e.target.value })}
                  className="h-9 w-[110px]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move up"
                  onClick={() => {
                    if (index === 0) return;
                    const next = [...items];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    setItems(next);
                  }}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move down"
                  onClick={() => {
                    if (index === items.length - 1) return;
                    const next = [...items];
                    [next[index + 1], next[index]] = [next[index], next[index + 1]];
                    setItems(next);
                  }}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove"
                  onClick={() => setItems(items.filter((_, n) => n !== index))}
                  data-testid="template-item-remove"
                >
                  <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                </Button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setItems([
                  ...items,
                  { id: `new-${items.length}-${Date.now()}`, title: "New activity", symbol_concept: "routine.timetable", start: "", end: "", colour: "teal", note: "" },
                ])
              }
              data-testid="template-add-item"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add row
            </Button>
            {activities.slice(0, 8).map((a) => (
              <Button
                key={a.id}
                variant="outline"
                size="sm"
                onClick={() =>
                  setItems([
                    ...items,
                    {
                      id: `lib-${a.id}-${Date.now()}`,
                      title: a.title,
                      symbol_concept: a.symbol_concept,
                      start: "",
                      end: "",
                      colour: a.colour,
                      note: "",
                      activity_id: a.id,
                    },
                  ])
                }
              >
                + {a.title}
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} data-testid="template-editor-save">
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- */
function ActivityLibrary({ activities, canEdit, reload }) {
  const [draft, setDraft] = useState({ title: "", symbol_concept: "routine.timetable", colour: "teal", default_minutes: 30 });

  return (
    <SectionCard
      title="Activity library"
      description="The activities your classroom uses. Add, rename or remove anything — none of this is fixed."
      testId="activity-library"
    >
      {canEdit ? (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
          <div>
            <Label htmlFor="new-activity">New activity</Label>
            <Input
              id="new-activity"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="mt-1.5 w-[200px]"
              data-testid="new-activity-title"
            />
          </div>
          <SymbolField value={draft.symbol_concept} onChange={(c) => setDraft({ ...draft, symbol_concept: c })} />
          <Button
            onClick={async () => {
              if (!draft.title.trim()) {
                toast.error("Give the activity a name");
                return;
              }
              await api.post("/timetable/activities", { ...draft, title: draft.title.trim() });
              toast.success("Activity added to the library");
              setDraft({ title: "", symbol_concept: "routine.timetable", colour: "teal", default_minutes: 30 });
              reload();
            }}
            data-testid="add-activity-to-library"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </div>
      ) : null}

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {activities.map((a) => (
          <li key={a.id} className="wp-row flex items-center gap-3 p-3" data-testid="library-activity">
            <SymbolImage conceptKey={a.symbol_concept} size="sm" alt="" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{a.title}</p>
                {a.is_sample ? <SampleBadge /> : null}
              </div>
              <p className="text-xs text-[hsl(var(--wp-ink-muted))]">{a.default_minutes} min · {a.kind}</p>
            </div>
            {canEdit ? (
              <ConfirmAction
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Delete" data-testid="library-activity-delete">
                    <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                  </Button>
                }
                title={`Delete ${a.title} from the library?`}
                description="Days and templates already using it keep their copy."
                onConfirm={async () => {
                  await api.delete(`/timetable/activities/${a.id}`);
                  toast.success("Removed from the library");
                  reload();
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/* ---------------------------------------------------------------- */
function PupilAdaptations({ pupils, day, date, canEdit }) {
  const [pupilId, setPupilId] = useState("");
  const [view, setView] = useState(null);
  const [pupilDay, setPupilDay] = useState(null);
  const [parentId, setParentId] = useState("");
  const [steps, setSteps] = useState([]);

  const load = useCallback(async (id) => {
    if (!id) return;
    const [v, d] = await Promise.all([
      api.get(`/timetable/pupil-view/${id}`),
      api.get(`/timetable/pupil-day/${id}?date=${date}`),
    ]);
    setView(v.data);
    setPupilDay(d.data);
  }, [date]);

  useEffect(() => {
    if (pupilId) load(pupilId);
  }, [pupilId, load]);

  const selectedPupil = useMemo(() => pupils.find((p) => p.id === pupilId), [pupils, pupilId]);

  return (
    <div className="wp-stack">
      <SectionCard
        title="Individual adaptations"
        description="The class timetable stays the same. This is what one pupil sees and the support steps inside an activity."
        testId="pupil-adaptations"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Pupil</Label>
            <Select value={pupilId} onValueChange={setPupilId}>
              <SelectTrigger className="mt-1.5 w-[220px]" data-testid="adaptation-pupil-select">
                <SelectValue placeholder="Choose a pupil" />
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
          {view ? (
            <div>
              <Label>How much of the day they see</Label>
              <Select
                value={view.timetable_visibility}
                onValueChange={async (value) => {
                  await api.put(`/timetable/pupil-view/${pupilId}`, {
                    pupil_id: pupilId,
                    timetable_visibility: value,
                    show_times: view.show_times,
                  });
                  toast.success("Saved for this pupil only");
                  load(pupilId);
                }}
              >
                <SelectTrigger className="mt-1.5 w-[240px]" data-testid="adaptation-visibility-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        {selectedPupil && pupilDay ? (
          <div className="mt-5 grid gap-[var(--wp-gap)] lg:grid-cols-2">
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <PupilAvatar pupil={selectedPupil} size={30} /> What {selectedPupil.first_name} sees
              </h3>
              <ul className="space-y-2">
                {pupilDay.items.map((item) => (
                  <li key={item.id} className="wp-row p-3" data-testid="pupil-day-item">
                    <div className="flex items-center gap-3">
                      <SymbolImage conceptKey={item.symbol_concept} size="sm" alt="" />
                      <p className="flex-1 truncate font-semibold">{item.title}</p>
                      <StatusChip status={item.status} />
                    </div>
                    {item.adaptation?.steps?.length ? (
                      <ol className="mt-3 space-y-1.5 border-l-2 border-[hsl(var(--wp-teal-100))] pl-3">
                        {item.adaptation.steps.map((s) => (
                          <li key={s.id} className="flex items-center gap-2 text-sm">
                            <SymbolImage conceptKey={s.symbol_concept} size="xs" alt="" />
                            {s.title}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </li>
                ))}
                {!pupilDay.items.length ? (
                  <li className="text-sm text-[hsl(var(--wp-ink-muted))]">
                    Nothing visible yet — mark an activity as Now.
                  </li>
                ) : null}
              </ul>
            </div>

            {canEdit ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Build a support sequence</h3>
                <div className="wp-row space-y-3 p-4">
                  <div>
                    <Label>Inside which activity?</Label>
                    <Select value={parentId} onValueChange={setParentId}>
                      <SelectTrigger className="mt-1.5" data-testid="adaptation-parent-select">
                        <SelectValue placeholder="Choose an activity from today" />
                      </SelectTrigger>
                      <SelectContent>
                        {(day.items || []).map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {steps.map((s, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <SymbolField
                        value={s.symbol_concept}
                        onChange={(c) =>
                          setSteps(steps.map((x, n) => (n === index ? { ...x, symbol_concept: c } : x)))
                        }
                        label=""
                      />
                      <Input
                        value={s.title}
                        onChange={(e) =>
                          setSteps(steps.map((x, n) => (n === index ? { ...x, title: e.target.value } : x)))
                        }
                        className="h-9"
                        data-testid="adaptation-step-title"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove step"
                        onClick={() => setSteps(steps.filter((_, n) => n !== index))}
                      >
                        <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSteps([...steps, { title: "", symbol_concept: "routine.timetable" }])}
                      data-testid="adaptation-add-step"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add step
                    </Button>
                    {[
                      ["Visual instruction", "system.symbol"],
                      ["Reduced task", "learning.learning"],
                      ["Movement break", "routine.movement"],
                      ["Return to task", "expectations.complete_tasks"],
                    ].map(([title, concept]) => (
                      <Button
                        key={title}
                        variant="outline"
                        size="sm"
                        onClick={() => setSteps([...steps, { title, symbol_concept: concept }])}
                      >
                        + {title}
                      </Button>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    onClick={async () => {
                      if (!parentId || !steps.length) {
                        toast.error("Choose an activity and add at least one step");
                        return;
                      }
                      const parent = (day.items || []).find((i) => i.id === parentId);
                      await api.post("/timetable/adaptations", {
                        pupil_id: pupilId,
                        date,
                        parent_item_id: parentId,
                        parent_title: parent?.title || "",
                        steps: steps.filter((s) => s.title.trim()),
                      });
                      toast.success("Saved. The whole-class timetable is unchanged.");
                      setSteps([]);
                      load(pupilId);
                    }}
                    data-testid="adaptation-save"
                  >
                    Save support sequence
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[hsl(var(--wp-ink-muted))]">
            Choose a pupil to see and adapt their view of the day.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
