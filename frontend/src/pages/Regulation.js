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
import { api, errorMessage, ZONE_INK, ZONE_TINTS } from "@/lib/api";
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

const KINDS = [
  { key: "calming", label: "Calming" },
  { key: "movement", label: "Movement" },
  { key: "sensory", label: "Sensory" },
  { key: "adult", label: "Adult support" },
];

export default function Regulation() {
  const { can } = useApp();
  const [board, setBoard] = useState(null);
  const [pupils, setPupils] = useState([]);
  const [pupilId, setPupilId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [supports, setSupports] = useState([]);

  const canEdit = can("regulation.edit");

  const load = useCallback(
    async (pid) => {
      try {
        const [b, p] = await Promise.all([
          api.get(`/regulation/board${pid ? `?pupil_id=${pid}` : ""}`),
          api.get("/pupils").catch(() => ({ data: [] })),
        ]);
        setBoard(b.data);
        setPupils(p.data);
        setSupports(b.data.supports?.strategy_ids || []);
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    []
  );

  useEffect(() => {
    load(pupilId);
  }, [pupilId, load]);

  if (!can("regulation.view")) return <AccessDenied what="the Regulation Centre" />;
  if (!board) return <Loading label="Loading regulation supports" />;

  const zone = board.zones.find((z) => z.id === zoneId);
  const shownStrategies = zone
    ? board.strategies.filter((s) => !s.zone_ids?.length || s.zone_ids.includes(zone.id))
    : board.strategies;

  const logIt = async (strategy) => {
    speak(strategy.title);
    if (!pupilId) return;
    try {
      await api.post("/regulation/log", {
        pupil_id: pupilId,
        zone_id: zoneId || null,
        strategy_id: strategy.id,
      });
      toast.success("Recorded");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="How can I regulate?"
        title="Regulation Centre"
        description="Built on the Zones of Regulation already used in the classroom. Zones, feelings and strategies are all yours to configure."
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="reg-pupil" className="text-xs">
              For
            </Label>
            <Select value={pupilId} onValueChange={setPupilId}>
              <SelectTrigger id="reg-pupil" className="h-9 w-[180px]" data-testid="regulation-pupil-select">
                <SelectValue placeholder="Whole class" />
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
        }
      />

      <Tabs defaultValue="use">
        <TabsList>
          <TabsTrigger value="use" data-testid="tab-reg-use">Use it now</TabsTrigger>
          {canEdit ? <TabsTrigger value="configure" data-testid="tab-reg-configure">Configure</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="use" className="mt-[var(--wp-gap)] space-y-[var(--wp-gap)]">
          <SectionCard
            title="How am I feeling?"
            description="Choose a zone. Each zone has its own name, feelings and what might be noticed."
            testId="regulation-zone-selector"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {board.zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setZoneId(zoneId === z.id ? "" : z.id)}
                  className={cn(
                    "rounded-[var(--wp-radius-xl)] border-2 p-4 text-left transition-shadow duration-200",
                    zoneId === z.id
                      ? "border-[hsl(var(--wp-ink))] shadow-[var(--wp-shadow-md)]"
                      : "border-[hsl(var(--border))]"
                  )}
                  style={{ backgroundColor: ZONE_TINTS[z.colour] || "#fff" }}
                  data-testid="regulation-zone-option"
                >
                  <p
                    className="wp-display text-lg font-bold"
                    style={{ color: ZONE_INK[z.colour] || "inherit" }}
                  >
                    {z.name}
                  </p>
                  <ul className="mt-2 space-y-0.5 text-sm">
                    {(z.feelings || []).slice(0, 5).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  {z.indicators?.length ? (
                    <p className="mt-2 text-xs text-[hsl(var(--wp-ink-muted))]">
                      Might look like: {z.indicators.join(", ")}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          </SectionCard>

          {KINDS.map((kind) => {
            const list = shownStrategies.filter((s) => s.kind === kind.key);
            if (!list.length) return null;
            return (
              <SectionCard
                key={kind.key}
                title={kind.label}
                description={
                  pupilId
                    ? "Highlighted cards are this pupil's chosen supports."
                    : "Tap a card to say it aloud."
                }
                testId={`regulation-${kind.key}`}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {list.map((s) => (
                    <SymbolTile
                      key={s.id}
                      conceptKey={s.symbol_concept}
                      label={s.title}
                      size="lg"
                      showLabel
                      selected={pupilId ? supports.includes(s.id) : false}
                      onClick={() => logIt(s)}
                      testId="regulation-strategy-tile"
                    />
                  ))}
                </div>
              </SectionCard>
            );
          })}

          {pupilId && canEdit ? (
            <SectionCard
              title="This pupil's own supports"
              description="Choose the strategies that work for this pupil. This does not change anyone else."
              testId="regulation-pupil-supports"
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {board.strategies.map((s) => (
                  <label
                    key={s.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-[var(--wp-radius-lg)] border p-2 text-sm",
                      supports.includes(s.id)
                        ? "border-[hsl(var(--wp-primary))] bg-[hsl(var(--wp-primary-soft))]"
                        : "border-[hsl(var(--border))] bg-white"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={supports.includes(s.id)}
                      onChange={(e) =>
                        setSupports((prev) =>
                          e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)
                        )
                      }
                      data-testid="pupil-support-checkbox"
                    />
                    <SymbolImage conceptKey={s.symbol_concept} size="xs" alt="" />
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  </label>
                ))}
              </div>
              <Button
                className="mt-4"
                onClick={async () => {
                  await api.put(`/pupils/${pupilId}/supports`, { strategy_ids: supports, notes: "" });
                  toast.success("Saved for this pupil only");
                  load(pupilId);
                }}
                data-testid="save-pupil-supports"
              >
                Save this pupil&rsquo;s supports
              </Button>
            </SectionCard>
          ) : null}
        </TabsContent>

        {canEdit ? (
          <TabsContent value="configure" className="mt-[var(--wp-gap)] space-y-[var(--wp-gap)]">
            <ZoneConfig zones={board.zones} reload={() => load(pupilId)} />
            <StrategyConfig strategies={board.strategies} zones={board.zones} reload={() => load(pupilId)} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

function ZoneConfig({ zones, reload }) {
  const [name, setName] = useState("");
  const [colour, setColour] = useState("green");
  return (
    <SectionCard
      title="Regulation states"
      description="The Zones of Regulation are the default. Rename them, change the feelings, or use a different framework entirely."
      testId="zone-config"
    >
      <ul className="grid gap-3 md:grid-cols-2">
        {zones.map((z) => (
          <li
            key={z.id}
            className="rounded-[var(--wp-radius-xl)] border border-[hsl(var(--border))] p-4"
            style={{ backgroundColor: ZONE_TINTS[z.colour] || "#fff" }}
            data-testid="zone-config-row"
          >
            <div className="flex items-center gap-2">
              <Input
                defaultValue={z.name}
                onBlur={async (e) => {
                  if (e.target.value === z.name) return;
                  await api.patch(`/regulation/zones/${z.id}`, { name: e.target.value });
                  toast.success("Zone renamed");
                  reload();
                }}
                className="h-9 bg-white"
                data-testid="zone-name-input"
              />
              {z.is_sample ? <SampleBadge /> : null}
              <ConfirmAction
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Delete zone" data-testid="zone-delete">
                    <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                  </Button>
                }
                title={`Delete ${z.name}?`}
                description="Strategies linked to it stay, but lose this link."
                onConfirm={async () => {
                  await api.delete(`/regulation/zones/${z.id}`);
                  reload();
                }}
              />
            </div>
            <Label className="mt-3 block text-xs">Feelings (one per line)</Label>
            <Textarea
              defaultValue={(z.feelings || []).join("\n")}
              rows={4}
              className="mt-1 bg-white"
              onBlur={async (e) => {
                const feelings = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
                await api.patch(`/regulation/zones/${z.id}`, { feelings });
                toast.success("Feelings updated");
                reload();
              }}
              data-testid="zone-feelings"
            />
            <Label className="mt-3 block text-xs">What adults might notice (one per line)</Label>
            <Textarea
              defaultValue={(z.indicators || []).join("\n")}
              rows={3}
              className="mt-1 bg-white"
              onBlur={async (e) => {
                const indicators = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
                await api.patch(`/regulation/zones/${z.id}`, { indicators });
                reload();
              }}
              data-testid="zone-indicators"
            />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
        <div>
          <Label htmlFor="new-zone">New state</Label>
          <Input
            id="new-zone"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-[180px]"
            data-testid="new-zone-name"
          />
        </div>
        <div>
          <Label>Colour</Label>
          <Select value={colour} onValueChange={setColour}>
            <SelectTrigger className="mt-1.5 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["blue", "green", "yellow", "red"].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={async () => {
            if (!name.trim()) return;
            await api.post("/regulation/zones", { name: name.trim(), colour, feelings: [], indicators: [] });
            toast.success("State added");
            setName("");
            reload();
          }}
          data-testid="add-zone"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add
        </Button>
      </div>
    </SectionCard>
  );
}

function StrategyConfig({ strategies, zones, reload }) {
  const [draft, setDraft] = useState({
    title: "",
    symbol_concept: "routine.calming",
    kind: "calming",
    zone_ids: [],
  });

  return (
    <SectionCard
      title="Strategies, activities and supports"
      description="Calming, movement, sensory and adult support options. Add whatever your classroom actually uses."
      testId="strategy-config"
    >
      <ul className="space-y-2">
        {strategies.map((s) => (
          <li key={s.id} className="wp-row flex flex-wrap items-center gap-3 p-3" data-testid="strategy-config-row">
            <SymbolField
              value={s.symbol_concept}
              label=""
              onChange={async (concept) => {
                await api.patch(`/regulation/strategies/${s.id}`, { symbol_concept: concept });
                reload();
              }}
            />
            <Input
              defaultValue={s.title}
              onBlur={async (e) => {
                if (e.target.value === s.title) return;
                await api.patch(`/regulation/strategies/${s.id}`, { title: e.target.value });
                toast.success("Strategy renamed");
                reload();
              }}
              className="h-9 min-w-[180px] flex-1"
              data-testid="strategy-title-input"
            />
            <Select
              value={s.kind}
              onValueChange={async (kind) => {
                await api.patch(`/regulation/strategies/${s.id}`, { kind });
                reload();
              }}
            >
              <SelectTrigger className="h-9 w-[150px]" data-testid="strategy-kind-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.key} value={k.key}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {s.is_sample ? <SampleBadge /> : null}
            <ConfirmAction
              trigger={
                <Button variant="ghost" size="icon" aria-label="Delete strategy" data-testid="strategy-delete">
                  <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                </Button>
              }
              title={`Delete "${s.title}"?`}
              description="Pupils who have this as a chosen support will lose it."
              onConfirm={async () => {
                await api.delete(`/regulation/strategies/${s.id}`);
                reload();
              }}
            />
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
        <div>
          <Label htmlFor="new-strategy">New strategy</Label>
          <Input
            id="new-strategy"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="mt-1.5 w-[220px]"
            data-testid="new-strategy-title"
          />
        </div>
        <SymbolField value={draft.symbol_concept} onChange={(c) => setDraft({ ...draft, symbol_concept: c })} />
        <div>
          <Label>Kind</Label>
          <Select value={draft.kind} onValueChange={(kind) => setDraft({ ...draft, kind })}>
            <SelectTrigger className="mt-1.5 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => (
                <SelectItem key={k.key} value={k.key}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={async () => {
            if (!draft.title.trim()) return;
            await api.post("/regulation/strategies", { ...draft, title: draft.title.trim() });
            toast.success("Strategy added");
            setDraft({ title: "", symbol_concept: "routine.calming", kind: "calming", zone_ids: [] });
            reload();
          }}
          data-testid="add-strategy"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add
        </Button>
      </div>
    </SectionCard>
  );
}
