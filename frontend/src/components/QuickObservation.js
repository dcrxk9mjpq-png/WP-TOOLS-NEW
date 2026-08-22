import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api";
import { PupilAvatar, Loading } from "@/components/common";
import { cn } from "@/lib/utils";

const AREA_SYMBOLS = {
  Communication: "comm.communication",
  Interaction: "interaction.interaction",
  Regulation: "regulation.zones",
  Independence: "system.independence",
  Engagement: "system.engagement",
};

/**
 * Quick Observation (spec s21) - deliberately 3 taps then Save.
 * pupil -> area -> support level -> optional note -> Save
 */
export const QuickObservationSheet = ({ open, onOpenChange, presetPupilId, onSaved }) => {
  const [pupils, setPupils] = useState([]);
  const [options, setOptions] = useState(null);
  const [pupilId, setPupilId] = useState(presetPupilId || "");
  const [area, setArea] = useState("");
  const [level, setLevel] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPupilId(presetPupilId || "");
    setArea("");
    setLevel("");
    setNote("");
    Promise.all([api.get("/pupils"), api.get("/observations/options")])
      .then(([p, o]) => {
        setPupils(p.data);
        setOptions(o.data);
      })
      .catch((e) => toast.error(errorMessage(e)));
  }, [open, presetPupilId]);

  const save = async () => {
    if (!pupilId || !area || !level) {
      toast.error("Choose a pupil, an area and a support level");
      return;
    }
    setSaving(true);
    try {
      await api.post("/observations", {
        pupil_id: pupilId,
        area,
        support_level: level,
        note: note.trim(),
      });
      toast.success("Observation saved");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const ready = pupilId && area && level;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
        data-testid="quick-observation-sheet"
      >
        <SheetHeader>
          <SheetTitle>Quick observation</SheetTitle>
        </SheetHeader>
        {!options ? (
          <Loading />
        ) : (
          <div className="mt-5 space-y-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
                1. Pupil
              </p>
              <div className="grid grid-cols-4 gap-2">
                {pupils.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPupilId(p.id)}
                    data-testid="observation-pupil-option"
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-[var(--wp-radius-lg)] border p-2 transition-shadow duration-200",
                      pupilId === p.id
                        ? "border-[hsl(var(--wp-teal))] ring-2 ring-[hsl(var(--wp-teal))]"
                        : "border-[hsl(var(--border))] bg-white"
                    )}
                  >
                    <PupilAvatar pupil={p} size={40} context="picker" />
                    <span className="w-full truncate text-[11px] font-medium">{p.first_name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
                2. Area
              </p>
              <div className="flex flex-wrap gap-2">
                {options.areas.map((a) => (
                  <Button
                    key={a}
                    type="button"
                    variant={area === a ? "default" : "outline"}
                    onClick={() => setArea(a)}
                    data-testid="observation-area-option"
                    className="h-11 rounded-full"
                  >
                    {a}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
                3. Support level
              </p>
              <div className="flex flex-wrap gap-2">
                {options.support_levels.map((l) => (
                  <Button
                    key={l}
                    type="button"
                    variant={level === l ? "default" : "outline"}
                    onClick={() => setLevel(l)}
                    data-testid="observation-level-option"
                    className="h-11 rounded-full"
                  >
                    {l}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wp-ink-muted))]">
                Optional note
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="A few words only – this should take seconds"
                data-testid="observation-note"
              />
            </div>

            <Button
              onClick={save}
              disabled={!ready || saving}
              className="h-12 w-full gap-2 text-base"
              data-testid="quick-observation-save-button"
            >
              <Check className="h-5 w-5" aria-hidden="true" />
              {saving ? "Saving…" : "Save observation"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export { AREA_SYMBOLS };
