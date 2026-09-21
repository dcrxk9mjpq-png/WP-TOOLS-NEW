import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Camera, Eye, Plus, Share2, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, errorMessage, formatTimeAgo } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { SymbolImage } from "@/components/Symbol";
import {
  AccessDenied,
  ConfirmAction,
  Loading,
  PageHeader,
  PupilAvatar,
  SampleBadge,
  SectionCard,
  SparkPill,
  StatTile,
} from "@/components/common";
import { QuickObservationSheet } from "@/components/QuickObservation";

const VISIBILITY = [
  { value: "now", label: "Now only" },
  { value: "now_next", label: "Now and Next" },
  { value: "now_next_later", label: "Now, Next and one Later" },
  { value: "full", label: "The whole day" },
];
const CONTEXTS = [
  ["today", "Today screen"],
  ["picker", "Random pickers"],
  ["jobs", "Classroom jobs"],
  ["profile", "Profile and staff lists"],
];

export default function PupilProfile() {
  const { pupilId } = useParams();
  const { can } = useApp();
  const [data, setData] = useState(null);
  const [sections, setSections] = useState({});
  const [observations, setObservations] = useState([]);
  const [sparks, setSparks] = useState([]);
  const [obsOpen, setObsOpen] = useState(false);
  const [targetText, setTargetText] = useState("");
  const fileRef = useRef(null);

  const canEditProfile = can("pupil.profile.edit");
  const canEditPupil = can("pupil.edit");

  const load = useCallback(async () => {
    try {
      const [d, o, s] = await Promise.all([
        api.get(`/pupils/${pupilId}`),
        api.get(`/observations?pupil_id=${pupilId}&limit=12`).catch(() => ({ data: [] })),
        api.get(`/sparks/events?pupil_id=${pupilId}&limit=10`).catch(() => ({ data: [] })),
      ]);
      setData(d.data);
      setSections(d.data.profile?.sections || {});
      setObservations(o.data);
      setSparks(s.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, [pupilId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("pupil.view")) return <AccessDenied what="pupil records" />;
  if (!data) return <Loading label="Loading pupil profile" />;

  const pupil = data.pupil;
  const totalSparks = sparks.reduce((sum, e) => sum + (e.points || 1), 0);

  const saveSections = async (next) => {
    setSections(next);
    try {
      await api.put(`/pupils/${pupilId}/profile`, { sections: next });
      toast.success("Profile saved");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="wp-stack">
      <Button asChild variant="outline" size="sm" className="w-fit gap-2" data-testid="back-to-pupils">
        <Link to="/pupils">
          <ArrowLeft className="h-4 w-4" /> All pupils
        </Link>
      </Button>

      <div className="wp-card flex flex-wrap items-center gap-5 p-6" data-testid="pupil-header">
        <PupilAvatar pupil={pupil} size={92} context="profile" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="wp-display text-2xl font-bold sm:text-3xl">{pupil.display_name}</h1>
            {pupil.is_sample ? <SampleBadge /> : null}
          </div>
          <p className="mt-1 text-sm text-[hsl(var(--wp-ink-muted))]">
            {data.groups?.length ? data.groups.map((g) => g.name).join(", ") : "No group"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {can("observation.create") ? (
              <Button size="sm" onClick={() => setObsOpen(true)} className="gap-1.5" data-testid="pupil-add-observation">
                <Eye className="h-3.5 w-3.5" /> Quick observation
              </Button>
            ) : null}
            {can("mainstream.view") ? (
              <Button asChild size="sm" variant="outline" className="gap-1.5" data-testid="pupil-mainstream-bridge">
                <Link to={`/mainstream/${pupil.id}`}>
                  <Share2 className="h-3.5 w-3.5" /> Mainstream Bridge
                </Link>
              </Button>
            ) : null}
            <SparkPill value={totalSparks} />
          </div>
        </div>
      </div>

      <div className="grid gap-[var(--wp-gap)] lg:grid-cols-3">
        <div className="wp-stack lg:col-span-2">
          {/* configurable profile sections */}
          {(data.sections || []).map((section) => (
            <SectionCard
              key={section.key}
              title={section.title}
              symbol={<SymbolImage conceptKey={section.symbol_concept} size="sm" alt="" />}
              testId="profile-section"
            >
              <ul className="space-y-2">
                {(sections[section.key] || []).map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="mt-0 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--wp-primary))]" aria-hidden="true" />
                    {canEditProfile ? (
                      <Input
                        defaultValue={item}
                        onBlur={(e) => {
                          if (e.target.value === item) return;
                          const list = [...(sections[section.key] || [])];
                          list[index] = e.target.value;
                          saveSections({ ...sections, [section.key]: list.filter(Boolean) });
                        }}
                        className="h-9"
                        data-testid="profile-item-input"
                      />
                    ) : (
                      <span className="text-sm">{item}</span>
                    )}
                    {canEditProfile ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove"
                        onClick={() =>
                          saveSections({
                            ...sections,
                            [section.key]: (sections[section.key] || []).filter((_, n) => n !== index),
                          })
                        }
                        data-testid="profile-item-remove"
                      >
                        <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                      </Button>
                    ) : null}
                  </li>
                ))}
                {!(sections[section.key] || []).length ? (
                  <li className="text-sm text-[hsl(var(--wp-ink-muted))]">Nothing recorded yet.</li>
                ) : null}
              </ul>
              {canEditProfile ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    saveSections({
                      ...sections,
                      [section.key]: [...(sections[section.key] || []), "New note"],
                    })
                  }
                  data-testid="profile-add-item"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
                </Button>
              ) : null}
            </SectionCard>
          ))}

          <SectionCard title="Recent observations" testId="pupil-observations">
            {observations.length ? (
              <ul className="space-y-2">
                {observations.map((o) => (
                  <li key={o.id} className="wp-row flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {o.area} · {o.support_level}
                      </p>
                      {o.note ? (
                        <p className="truncate text-xs text-[hsl(var(--wp-ink-muted))]">{o.note}</p>
                      ) : null}
                    </div>
                    <span className="text-xs text-[hsl(var(--wp-ink-muted))]">{formatTimeAgo(o.at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[hsl(var(--wp-ink-muted))]">No observations recorded yet.</p>
            )}
          </SectionCard>
        </div>

        <div className="wp-stack">
          <SectionCard title="Current targets" testId="pupil-targets">
            <ul className="space-y-2">
              {(data.targets || []).map((t) => (
                <li key={t.id} className="wp-row flex items-center gap-2 p-3">
                  <SymbolImage conceptKey="system.target" size="xs" alt="" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.text}</p>
                    <p className="text-xs text-[hsl(var(--wp-ink-muted))]">{t.area}</p>
                  </div>
                  {canEditProfile ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete target"
                      onClick={async () => {
                        await api.delete(`/pupils/targets/${t.id}`);
                        load();
                      }}
                      data-testid="target-delete"
                    >
                      <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                    </Button>
                  ) : null}
                </li>
              ))}
              {!(data.targets || []).length ? (
                <li className="text-sm text-[hsl(var(--wp-ink-muted))]">No targets set.</li>
              ) : null}
            </ul>
            {canEditProfile ? (
              <div className="mt-3 flex gap-2">
                <Input
                  value={targetText}
                  onChange={(e) => setTargetText(e.target.value)}
                  placeholder="New target"
                  className="h-9"
                  data-testid="new-target-input"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!targetText.trim()) return;
                    await api.post(`/pupils/${pupilId}/targets`, { text: targetText.trim() });
                    setTargetText("");
                    toast.success("Target added");
                    load();
                  }}
                  data-testid="add-target"
                >
                  Add
                </Button>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="How much of the day they see" testId="pupil-visibility">
            <Select
              value={data.view?.timetable_visibility || "now_next"}
              onValueChange={async (value) => {
                await api.put(`/timetable/pupil-view/${pupilId}`, {
                  pupil_id: pupilId,
                  timetable_visibility: value,
                  show_times: data.view?.show_times || false,
                });
                toast.success("Saved for this pupil only");
                load();
              }}
            >
              <SelectTrigger data-testid="pupil-visibility-select">
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
            <div className="mt-3 flex items-center justify-between">
              <Label htmlFor="show-times" className="text-sm font-normal">
                Show times
              </Label>
              <Switch
                id="show-times"
                checked={Boolean(data.view?.show_times)}
                onCheckedChange={async (value) => {
                  await api.put(`/timetable/pupil-view/${pupilId}`, {
                    pupil_id: pupilId,
                    timetable_visibility: data.view?.timetable_visibility || "now_next",
                    show_times: value,
                  });
                  load();
                }}
                data-testid="pupil-show-times"
              />
            </div>
          </SectionCard>

          <SectionCard title="Photograph and avatar" testId="pupil-photo-settings">
            <p className="text-sm text-[hsl(var(--wp-ink-muted))]">
              A photograph is optional. It is stored access-controlled and only shown where you allow
              it.
            </p>
            {canEditPupil ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const form = new FormData();
                    form.append("file", file);
                    try {
                      await api.post(`/pupils/${pupilId}/photo`, form, {
                        headers: { "Content-Type": "multipart/form-data" },
                      });
                      toast.success("Photograph stored");
                      load();
                    } catch (err) {
                      toast.error(errorMessage(err));
                    }
                  }}
                  data-testid="pupil-photo-input"
                />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5" data-testid="pupil-photo-upload">
                  <Upload className="h-3.5 w-3.5" /> Upload photograph
                </Button>
                {pupil.has_photo ? (
                  <ConfirmAction
                    trigger={
                      <Button variant="outline" size="sm" data-testid="pupil-photo-delete">
                        Remove photograph
                      </Button>
                    }
                    title="Remove this photograph?"
                    description="The avatar will be used instead everywhere."
                    confirmLabel="Remove"
                    onConfirm={async () => {
                      await api.delete(`/pupils/${pupilId}/photo`);
                      toast.success("Photograph removed");
                      load();
                    }}
                  />
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
                Show the photograph in
              </p>
              {CONTEXTS.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={`ctx-${key}`} className="text-sm font-normal">
                    {label}
                  </Label>
                  <Switch
                    id={`ctx-${key}`}
                    checked={pupil.photo_contexts?.[key] !== false}
                    disabled={!canEditPupil}
                    onCheckedChange={async (value) => {
                      await api.patch(`/pupils/${pupilId}`, {
                        photo_contexts: { ...(pupil.photo_contexts || {}), [key]: value },
                      });
                      load();
                    }}
                    data-testid={`photo-context-${key}`}
                  />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recognition" testId="pupil-sparks">
            <StatTile value={totalSparks} label="Sparks earned" tintName="butter" testId="pupil-spark-total" />
            <ul className="mt-3 space-y-2">
              {sparks.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-[hsl(35_70%_40%)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{s.rule_title}</span>
                  <span className="text-xs text-[hsl(var(--wp-ink-muted))]">{formatTimeAgo(s.at)}</span>
                </li>
              ))}
              {!sparks.length ? (
                <li className="text-sm text-[hsl(var(--wp-ink-muted))]">Nothing awarded yet.</li>
              ) : null}
            </ul>
          </SectionCard>
        </div>
      </div>

      <QuickObservationSheet
        open={obsOpen}
        onOpenChange={setObsOpen}
        presetPupilId={pupilId}
        onSaved={load}
      />
    </div>
  );
}
