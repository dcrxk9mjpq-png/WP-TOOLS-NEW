import React, { useEffect } from "react";
import { ExternalLink, Film, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SymbolImage } from "@/components/Symbol";
import { stopSpeaking } from "@/lib/speech";

/** "2:30", or nothing at all when the length is unknown (a whole channel). */
export const videoLength = (seconds) => {
  const s = Number(seconds) || 0;
  if (!s) return null;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const collectionLabel = (key) =>
  ({
    morning_song: "Morning song",
    learning: "Learning",
    movement: "Movement",
    calm: "Calming",
    story: "Story time",
    other: "Other",
  }[key] || "Other");

export const collectionTint = (key) =>
  ({
    morning_song: "butter",
    learning: "sky",
    movement: "peach",
    calm: "mint",
    story: "lilac",
    other: "sage",
  }[key] || "sage");

export const collectionTone = (key) =>
  ({ morning_song: 3, learning: 1, movement: 2, calm: 0, story: 5, other: 4 }[key] ?? 4);

export const COLLECTIONS = ["morning_song", "learning", "movement", "calm", "story", "other"];

/** The still image YouTube already publishes for a clip. */
export const videoThumbnail = (item) => item?.video?.thumbnail_url || null;

const kindNote = (video) => {
  if (!video) return "";
  if (video.kind === "playlist") return "Plays the whole collection, newest first";
  if (video.kind === "channel") return "Opens on its own website";
  if (video.provider === "bbc") return "Opens on the BBC website";
  if (!video.can_embed) return "Opens in a new tab";
  return "";
};

/**
 * Full-screen video stage.
 *
 * Deliberately austere: the clip, its name, and a way out. YouTube links are
 * played through youtube-nocookie with related videos and channel branding
 * switched off, so when a clip finishes a child is not offered a wall of
 * unrelated thumbnails.
 */
export const VideoStage = ({ item, onClose }) => {
  const video = item?.video || {};

  // Nothing should be talking over the video.
  useEffect(() => {
    stopSpeaking();
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-modal flex flex-col bg-[hsl(var(--wp-ink))]"
      role="dialog"
      aria-modal="true"
      aria-label={`Watching ${item.title}`}
      data-testid="video-stage"
    >
      <header className="flex items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <div className="min-w-0">
          <h2 className="wp-display truncate text-lg font-bold text-white sm:text-xl">
            {item.title}
          </h2>
          {kindNote(video) ? (
            <p className="truncate text-xs font-medium text-white/65">{kindNote(video)}</p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={onClose}
          className="shrink-0 gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          data-testid="video-stage-close"
        >
          <X className="h-5 w-5" aria-hidden="true" />
          Finished
        </Button>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 pb-6 sm:px-8">
        {video.can_embed && video.embed_url ? (
          <div className="aspect-video w-full max-w-6xl overflow-hidden rounded-[var(--wp-radius-xl)] bg-black shadow-[var(--wp-shadow-float)]">
            <iframe
              src={`${video.embed_url}&autoplay=1`}
              title={item.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              data-testid="video-stage-frame"
            />
          </div>
        ) : (
          <div className="flex max-w-xl flex-col items-center gap-5 rounded-[var(--wp-radius-xl)] bg-white/95 p-8 text-center">
            <SymbolImage conceptKey={item.symbol_concept} size="lg" alt="" />
            <div>
              <p className="wp-display text-xl font-bold">This one opens on its own website</p>
              <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--wp-ink-muted))]">
                {item.video?.provider === "bbc"
                  ? "BBC programmes can only be played on the BBC's own site, so this will open in a new tab."
                  : "This link cannot be played inside the classroom screen, so it will open in a new tab."}
              </p>
            </div>
            <Button asChild size="xl" className="gap-2" data-testid="video-stage-open-external">
              <a href={video.watch_url || item.url} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="h-5 w-5" aria-hidden="true" />
                Open it
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

/** Staff-side card: thumbnail, name, collection, controls. */
export const VideoThumb = ({ item, className }) => {
  const thumb = videoThumbnail(item);
  return (
    <div
      className={`relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-[var(--wp-radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--wp-surface-sunken))] ${
        className || ""
      }`}
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <SymbolImage conceptKey={item.symbol_concept} size="md" alt="" framed={false} />
      )}
      {!thumb ? (
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-[hsl(var(--card))]/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--wp-ink-muted))]">
          <Film className="mr-1 inline h-3 w-3" aria-hidden="true" />
          {item.video?.kind === "playlist" ? "Collection" : "Link"}
        </span>
      ) : null}
    </div>
  );
};
