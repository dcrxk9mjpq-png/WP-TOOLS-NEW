import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, errorMessage } from "@/lib/api";
import { useApp, speak } from "@/context/AppContext";
import { SymbolImage } from "@/components/Symbol";
import { SymbolField } from "@/components/SymbolPicker";
import {
  AccessDenied,
  ConfirmAction,
  EmptyState,
  Loading,
  PageHeader,
  SampleBadge,
  SectionCard,
} from "@/components/common";
import { cn } from "@/lib/utils";

const LEVEL_NOTES = {
  1: "Naming and matching what is here and now",
  2: "Describing, selecting by function, listening for detail",
  3: "Retelling, predicting, comparing, defining",
  4: "Reasoning, explaining, solving and taking another view",
};

export default function Interaction() {
  const { can } = useApp();
  const [areas, setAreas] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [pupils, setPupils] = useState([]);
  const [options, setOptions] = useState(null);

  const canEdit = can("interaction.edit");

  const load = useCallback(async () => {
    try {
      const [a, b, p, o] = await Promise.all([
        api.get("/interaction/areas"),
        api.get("/interaction/blanks"),
        api.get("/pupils").catch(() => ({ data: [] })),
        api.get("/observations/options").catch(() => ({ data: null })),
      ]);
      setAreas(a.data);
      setPrompts(b.data);
      setPupils(p.data);
      setOptions(o.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("interaction.view")) return <AccessDenied what="the Interaction Centre" />;
  if (!areas) return <Loading label="Loading interaction areas" />;

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="How can I participate?"
        title="Interaction Centre"
        description="Teaching and noticing interaction, plus Blank's Levels of questioning for planning and recording."
      />

      <Tabs defaultValue="areas">
        <TabsList>
          <TabsTrigger value="areas" data-testid="tab-interaction-areas">Interaction areas</TabsTrigger>
          <TabsTrigger value="blanks" data-testid="tab-blanks">Blank&rsquo;s Levels</TabsTrigger>
        </TabsList>

        <TabsContent value="areas" className="mt-[var(--wp-gap)]">
          <SectionCard
            title="Areas we are working on"
            description="These are examples, not a fixed curriculum. Rename, remove or add your own."
            testId="interaction-areas"
          >
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {areas.map((area) => (
                <li key={area.id} className="wp-row p-4" data-testid="interaction-area-card">
                  <div className="flex items-center gap-3">
                    <SymbolImage conceptKey={area.symbol_concept} size="sm" alt="" />
                    {canEdit ? (
                      <Input
                        defaultValue={area.title}
                        onBlur={async (e) => {
                          if (e.target.value === area.title) return;
                          await api.patch(`/interaction/areas/${area.id}`, { title: e.target.value });
                          toast.success("Renamed");
                          load();
                        }}
                        className="h-9"
                        data-testid="interaction-area-title"
                      />
                    ) : (
                      <p className="flex-1 font-semibold">{area.title}</p>
                    )}
                    {area.is_sample ? <SampleBadge /> : null}
                    {canEdit ? (
                      <ConfirmAction
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Delete area" data-testid="interaction-area-delete">
                            <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                          </Button>
                        }
                        title={`Delete ${area.title}?`}
                        description="This removes the area and its prompts."
                        onConfirm={async () => {
                          await api.delete(`/interaction/areas/${area.id}`);
                          load();
                        }}
                      />
                    ) : null}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {(area.prompts || []).map((p) => (
                      <li key={p}>
                        <button
                          type="button"
                          onClick={() => speak(p)}
                          className="w-full rounded-[var(--wp-radius-sm)] bg-[hsl(var(--wp-tint-mint))] px-3 py-1.5 text-left text-sm"
                          data-testid="interaction-prompt"
                        >
                          {p}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {canEdit ? (
                    <Textarea
                      defaultValue={(area.prompts || []).join("\n")}
                      rows={3}
                      placeholder="One teaching prompt per line"
                      className="mt-3"
                      onBlur={async (e) => {
                        const list = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
                        await api.patch(`/interaction/areas/${area.id}`, { prompts: list });
                        toast.success("Prompts updated");
                        load();
                      }}
                      data-testid="interaction-area-prompts"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
            {canEdit ? <NewArea reload={load} /> : null}
          </SectionCard>
        </TabsContent>

        <TabsContent value="blanks" className="mt-[var(--wp-gap)]">
          <Blanks prompts={prompts} pupils={pupils} options={options} canEdit={canEdit} reload={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NewArea({ reload }) {
  const [title, setTitle] = useState("");
  const [concept, setConcept] = useState("interaction.interaction");
  return (
    <div className="mt-4 flex flex-wrap items-end gap-3 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
      <div>
        <Label htmlFor="new-area">New interaction area</Label>
        <Input
          id="new-area"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1.5 w-[210px]"
          data-testid="new-interaction-area-title"
        />
      </div>
      <SymbolField value={concept} onChange={setConcept} />
      <Button
        onClick={async () => {
          if (!title.trim()) return;
          await api.post("/interaction/areas", { title: title.trim(), symbol_concept: concept, prompts: [] });
          toast.success("Area added");
          setTitle("");
          reload();
        }}
        data-testid="add-interaction-area"
      >
        <Plus className="mr-1.5 h-4 w-4" /> Add
      </Button>
    </div>
  );
}

function Blanks({ prompts, pupils, options, canEdit, reload }) {
  const [level, setLevel] = useState(1);
  const [pupilId, setPupilId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const list = prompts.filter((p) => p.level === level);

  const record = async (response) => {
    if (!pupilId) {
      toast.error("Choose a pupil first");
      return;
    }
    try {
      await api.post("/observations", {
        pupil_id: pupilId,
        area: "Communication",
        support_level:
          response === "Independent response"
            ? "Independent"
            : response === "Modelled response"
            ? "Modelled"
            : "Prompted",
        note: prompt ? `Blank's Level ${level}: ${prompt}` : `Blank's Level ${level}`,
        blanks_level: level,
        blanks_response: response,
      });
      toast.success("Response recorded");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="wp-stack">
      <SectionCard
        title="Blank's Levels of questioning"
        description="Choose a level to plan or record with. This supports teaching and shows patterns — it is never reduced to a score."
        testId="blanks-panel"
      >
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={cn(
                "rounded-[var(--wp-radius-lg)] border p-3 text-left transition-shadow duration-200",
                level === l
                  ? "border-[hsl(var(--wp-teal))] bg-[hsl(var(--wp-teal-100))]"
                  : "border-[hsl(var(--border))] bg-white"
              )}
              data-testid="blanks-level-button"
            >
              <p className="wp-display text-lg font-bold">Level {l}</p>
              <p className="max-w-[220px] text-xs text-[hsl(var(--wp-ink-muted))]">{LEVEL_NOTES[l]}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {list.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPrompt(p.text);
                speak(p.text);
              }}
              className={cn(
                "flex items-center justify-between gap-3 rounded-[var(--wp-radius-lg)] border p-3 text-left",
                prompt === p.text
                  ? "border-[hsl(var(--wp-teal))] bg-[hsl(var(--wp-teal-100))]"
                  : "border-[hsl(var(--border))] bg-white"
              )}
              data-testid="blanks-prompt"
            >
              <span className="font-medium">{p.text}</span>
              {canEdit ? (
                <ConfirmAction
                  trigger={
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded p-1 text-[hsl(var(--destructive))]"
                      data-testid="blanks-prompt-delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </span>
                  }
                  title="Delete this question prompt?"
                  description="You can add your own prompts at any time."
                  onConfirm={async () => {
                    await api.delete(`/interaction/blanks/${p.id}`);
                    reload();
                  }}
                />
              ) : null}
            </button>
          ))}
          {!list.length ? (
            <p className="text-sm text-[hsl(var(--wp-ink-muted))]">No prompts at this level yet.</p>
          ) : null}
        </div>

        {canEdit ? (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
            <div className="flex-1">
              <Label htmlFor="new-blanks">Add a Level {level} prompt</Label>
              <Input
                id="new-blanks"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                className="mt-1.5"
                data-testid="new-blanks-prompt"
              />
            </div>
            <Button
              onClick={async () => {
                if (!newPrompt.trim()) return;
                await api.post("/interaction/blanks", { level, text: newPrompt.trim() });
                toast.success("Prompt added");
                setNewPrompt("");
                reload();
              }}
              data-testid="add-blanks-prompt"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add
            </Button>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Record how they responded"
        description="What kind of support did the response need? Nothing here is scored or ranked."
        testId="blanks-record"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Pupil</Label>
            <Select value={pupilId} onValueChange={setPupilId}>
              <SelectTrigger className="mt-1.5 w-[200px]" data-testid="blanks-pupil-select">
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
          {prompt ? (
            <p className="rounded-[var(--wp-radius-sm)] bg-[hsl(var(--wp-tint-butter))] px-3 py-2 text-sm">
              Question: <strong>{prompt}</strong>
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(options?.blanks_responses || []).map((r) => (
            <Button key={r} variant="outline" onClick={() => record(r)} data-testid="blanks-response-button">
              {r}
            </Button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
