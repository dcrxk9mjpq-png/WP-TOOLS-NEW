import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Film, Play, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  COLLECTIONS,
  VideoStage,
  VideoThumb,
  collectionLabel,
  collectionTint,
  videoLength,
} from "@/components/VideoPlayer";

const blank = () => ({
  title: "",
  description: "",
  url: "",
  collection: "learning",
  symbol_concept: "resource.brain_break",
  duration_seconds: 0,
  enabled: true,
  featured: false,
});

const VideoCard = ({ item, canEdit, onPlay, onEdit, onPatch, onDelete, onMove, first, last }) => (
  <article
    className="wp-card overflow-hidden"
    style={{ backgroundColor: tint(collectionTint(item.collection)) }}
    data-testid={`watch-card-${item.id}`}
  >
    <div className="p-[var(--wp-card-pad)]">
      <button
        type="button"
        onClick={() => onPlay(item)}
        className="group block w-full rounded-[var(--wp-radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wp-focus))]"
        aria-label={`Play ${item.title}`}
        data-testid={`watch-play-${item.id}`}
      >
        <span className="relative block">
          <VideoThumb item={item} />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--card))]/92 text-[hsl(var(--wp-primary-700))] shadow-[var(--wp-shadow-md)] transition-transform duration-150 group-hover:scale-105">
              <Play className="h-6 w-6" aria-hidden="true" />
            </span>
          </span>
        </span>
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h3 className="wp-display min-w-0 flex-1 text-base font-bold leading-tight">
          {item.title}
        </h3>
        {item.is_sample ? <SampleBadge /> : null}
      </div>
      <p className="wp-tabular mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--wp-ink-muted))]">
        {collectionLabel(item.collection)}
        {videoLength(item.duration_seconds) ? ` · ${videoLength(item.duration_seconds)}` : ""}
        {item.video?.kind === "playlist" ? " · whole collection" : ""}
        {item.video?.can_embed ? "" : " · opens in a new tab"}
      </p>
      {item.description ? (
        <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--wp-ink-muted))]">
          {item.description}
        </p>
      ) : null}

      {canEdit ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant={item.featured ? "default" : "outline"}
            onClick={() => onPatch(item, { featured: !item.featured })}
            className={item.featured ? "gap-2" : "gap-2 bg-[hsl(var(--card))]"}
            data-testid={`watch-featured-${item.id}`}
          >
            <Star
              className={`h-4 w-4 ${item.featured ? "fill-current" : ""}`}
              aria-hidden="true"
            />
            {item.featured ? "On today's board" : "Add to today"}
          </Button>
          <Button
            variant="outline"
            onClick={() => onEdit(item)}
            className="bg-[hsl(var(--card))]"
            data-testid={`watch-edit-${item.id}`}
          >
            Edit
          </Button>
          <SpeakButton
            text={item.title}
            label={`Say "${item.title}" out loud`}
            testId={`watch-speak-${item.id}`}
          />
          <div className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5">
            <Switch
              checked={item.enabled}
              onCheckedChange={(v) => onPatch(item, { enabled: v })}
              aria-label={`Show ${item.title} to pupils`}
              data-testid={`watch-enabled-${item.id}`}
            />
            <span className="text-xs font-semibold">Shown</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            disabled={first}
            onClick={() => onMove(item, -1)}
            aria-label="Move up"
            className="bg-[hsl(var(--card))]"
            data-testid={`watch-up-${item.id}`}
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
            data-testid={`watch-down-${item.id}`}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <ConfirmAction
            trigger={
              <Button
                variant="outline"
                size="icon"
                aria-label={`Remove ${item.title}`}
                className="bg-[hsl(var(--card))] text-[hsl(var(--wp-danger))]"
                data-testid={`watch-delete-${item.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
            title={`Remove "${item.title}"?`}
            description="This video will be taken out of the classroom library. This cannot be undone."
            confirmLabel="Remove"
            onConfirm={() => onDelete(item)}
          />
        </div>
      ) : (
        <Button onClick={() => onPlay(item)} className="mt-4 gap-2" data-testid={`watch-open-${item.id}`}>
          <Play className="h-4 w-4" aria-hidden="true" />
          Play it
        </Button>
      )}
    </div>
  </article>
);

export default function Watch() {
  const { can } = useApp();
  const canEdit = can("watch.edit");
  const [items, setItems] = useState(null);
  const [draft, setDraft] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/watch");
      setItems(data);
    } catch (e) {
      toast.error(errorMessage(e));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = {};
    (items || []).forEach((item) => {
      const key = COLLECTIONS.includes(item.collection) ? item.collection : "other";
      (map[key] = map[key] || []).push(item);
    });
    return map;
  }, [items]);

  if (!can("watch.view")) return <AccessDenied what="the video library" />;
  if (!items) return <Loading label="Loading the video library" />;

  const act = async (request, message) => {
    try {
      await request();
      await load();
      if (message) toast.success(message);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (draft.id) await api.patch(`/watch/${draft.id}`, draft);
      else await api.post("/watch", draft);
      await load();
      setDialogOpen(false);
      toast.success(draft.id ? "Video updated" : "Video added to the library");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const move = (item, direction) => {
    const list = [...items];
    const from = list.findIndex((i) => i.id === item.id);
    const to = from + direction;
    if (to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]];
    setItems(list);
    act(() => api.post("/watch/reorder", { ids: list.map((i) => i.id) }));
  };

  const featuredCount = items.filter((i) => i.featured && i.enabled).length;

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="Communication & regulation"
        title="Watch"
        description="Every video the classroom uses, in one place: the morning song, Alphablocks and Numberblocks for transitions, movement clips and calming clips. YouTube links play without related videos or channel branding, so a clip never trails off into something nobody chose."
        actions={
          canEdit ? <AddButton onClick={() => { setDraft(blank()); setDialogOpen(true); }} testId="watch-new">Add a video</AddButton> : null
        }
      />

      <SectionCard
        title="Today's board"
        description={
          featuredCount
            ? `${featuredCount} video${featuredCount === 1 ? "" : "s"} are on today's board. These are the only ones offered on the pupil screen, so children choose from a short, chosen set rather than a whole library.`
            : "Nothing is on today's board yet. Mark a few videos with \u201cAdd to today\u201d and they will appear on the pupil Watch screen."
        }
        actions={
          <Button asChild variant="outline" className="min-h-[44px]" data-testid="watch-open-brain-breaks">
            <Link to="/brain-breaks">
              <Film className="mr-2 h-4 w-4" aria-hidden="true" />
              Guided brain breaks
            </Link>
          </Button>
        }
        testId="watch-today-board"
      >
        {featuredCount ? (
          <div className="flex flex-wrap gap-2">
            {items
              .filter((i) => i.featured && i.enabled)
              .map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setPlaying(i)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[hsl(var(--wp-primary)/0.25)] bg-[hsl(var(--wp-primary-soft))] px-4 text-sm font-semibold text-[hsl(var(--wp-primary-700))] transition-[background-color] duration-150 hover:bg-[hsl(var(--wp-primary)/0.2)]"
                  data-testid={`watch-today-chip-${i.id}`}
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  {i.title}
                </button>
              ))}
          </div>
        ) : null}
      </SectionCard>

      {COLLECTIONS.filter((key) => (grouped[key] || []).length).map((key) => (
        <SectionCard
          key={key}
          title={collectionLabel(key)}
          description={
            {
              morning_song: "The song that opens Morning Meeting.",
              learning: "Short clips used in transitions, before phonics or maths.",
              movement: "For waking a body up.",
              calm: "For settling a body down.",
              story: "Story time.",
              other: "Everything else.",
            }[key]
          }
          testId={`watch-collection-${key}`}
        >
          <div className="grid gap-[var(--wp-gap)] sm:grid-cols-2 xl:grid-cols-3">
            {grouped[key].map((item, index) => (
              <VideoCard
                key={item.id}
                item={item}
                canEdit={canEdit}
                first={items.findIndex((i) => i.id === item.id) === 0}
                last={items.findIndex((i) => i.id === item.id) === items.length - 1}
                onPlay={setPlaying}
                onEdit={(i) => {
                  setDraft({ ...i });
                  setDialogOpen(true);
                }}
                onPatch={(i, patch) => act(() => api.patch(`/watch/${i.id}`, patch))}
                onDelete={(i) => act(() => api.delete(`/watch/${i.id}`), "Video removed")}
                onMove={move}
              />
            ))}
          </div>
        </SectionCard>
      ))}

      {items.length === 0 ? (
        <EmptyState
          icon={Film}
          title="The library is empty"
          description="Add a link to a video your school already uses. YouTube and Vimeo links play inside the classroom screen; BBC links open on the BBC website."
          action={
            canEdit ? (
              <AddButton onClick={() => { setDraft(blank()); setDialogOpen(true); }} testId="watch-empty-new">
                Add the first video
              </AddButton>
            ) : null
          }
        />
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-h-[92vh] max-w-xl overflow-y-auto rounded-[var(--wp-radius-xl)]"
          data-testid="watch-dialog"
        >
          <DialogHeader>
            <DialogTitle className="wp-display text-xl font-bold">
              {draft?.id ? "Edit video" : "Add a video"}
            </DialogTitle>
            <DialogDescription>
              Paste a link to a video, a YouTube playlist, or a whole YouTube channel. A channel
              link plays that channel's newest episodes — useful for Alphablocks and Numberblocks.
            </DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <SymbolField
                  value={draft.symbol_concept}
                  onChange={(concept) => setDraft({ ...draft, symbol_concept: concept })}
                  label="Symbol"
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <FieldGroup label="Name the children will see">
                    <Input
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      placeholder="e.g. Numberblocks"
                      data-testid="watch-title-input"
                    />
                  </FieldGroup>
                  <FieldGroup label="Collection">
                    <Select
                      value={draft.collection}
                      onValueChange={(v) => setDraft({ ...draft, collection: v })}
                    >
                      <SelectTrigger data-testid="watch-collection-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLLECTIONS.map((key) => (
                          <SelectItem key={key} value={key}>
                            {collectionLabel(key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </div>
              </div>

              <FieldGroup
                label="Link"
                hint="YouTube and Vimeo play inside the classroom screen. BBC iPlayer and Bitesize open on the BBC website."
              >
                <Input
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=…"
                  data-testid="watch-url-input"
                />
              </FieldGroup>

              <FieldGroup label="Note for staff" hint="Optional. When to reach for this one.">
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={2}
                  data-testid="watch-description-input"
                />
              </FieldGroup>

              <div className="grid gap-3 sm:grid-cols-2">
                <FieldGroup label="Length in seconds" hint="Leave as 0 for a channel or playlist.">
                  <Input
                    type="number"
                    min={0}
                    max={7200}
                    value={draft.duration_seconds}
                    onChange={(e) =>
                      setDraft({ ...draft, duration_seconds: Number(e.target.value) })
                    }
                    data-testid="watch-duration-input"
                  />
                </FieldGroup>
                <div className="flex items-end">
                  <label className="flex min-h-[44px] w-full items-center gap-3 rounded-[var(--wp-radius-md)] border border-[hsl(var(--border))] px-3">
                    <Switch
                      checked={draft.featured}
                      onCheckedChange={(v) => setDraft({ ...draft, featured: v })}
                      data-testid="watch-featured-switch"
                    />
                    <span className="text-sm font-semibold">On today's board</span>
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="watch-cancel">
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} data-testid="watch-save">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {playing ? <VideoStage item={playing} onClose={() => setPlaying(null)} /> : null}
    </div>
  );
}
