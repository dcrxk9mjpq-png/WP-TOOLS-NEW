import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Progress as Bar } from "@/components/ui/progress";
import { api, errorMessage, ZONE_INK, ZONE_TINTS } from "@/lib/api";
import { useApp, speak } from "@/context/AppContext";
import { SymbolImage, SymbolTile } from "@/components/Symbol";
import { Loading, StatusChip } from "@/components/common";
import { cn } from "@/lib/utils";

/**
 * Pupil-facing mode. Large, calm, minimal. No pupil records, no editing,
 * no staff information. Uses exactly the same canonical symbols as staff screens.
 */
export default function PupilMode({ view }) {
  const [today, setToday] = useState(null);
  const [board, setBoard] = useState([]);
  const [regulation, setRegulation] = useState(null);
  const [spoken, setSpoken] = useState(null);

  const load = useCallback(async () => {
    try {
      const [t, c, r] = await Promise.all([
        api.get("/today"),
        api.get("/communication/board").catch(() => ({ data: [] })),
        api.get("/regulation/board").catch(() => ({ data: null })),
      ]);
      setToday(t.data);
      setBoard(c.data);
      setRegulation(r.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  if (!today) return <Loading label="Getting ready" />;

  if (view === "now") {
    return (
      <div className="space-y-6">
        <section className="wp-card p-6 text-center" data-testid="pupil-now">
          <StatusChip status="current" />
          {today.now ? (
            <div className="mt-4 flex flex-col items-center gap-4">
              <SymbolImage conceptKey={today.now.symbol_concept} size="hero" alt={today.now.title} />
              <h1 className="wp-display text-4xl font-bold sm:text-5xl">{today.now.title}</h1>
            </div>
          ) : (
            <p className="mt-6 text-xl">We are getting ready.</p>
          )}
        </section>

        <section className="wp-card p-6 text-center" data-testid="pupil-next">
          <StatusChip status="next" />
          {today.next ? (
            <div className="mt-4 flex flex-col items-center gap-3">
              <SymbolImage conceptKey={today.next.symbol_concept} size="xl" alt={today.next.title} />
              <h2 className="wp-display text-3xl font-bold">{today.next.title}</h2>
            </div>
          ) : (
            <p className="mt-4 text-lg">Nothing after this.</p>
          )}
        </section>
      </div>
    );
  }

  if (view === "day") {
    return (
      <section className="space-y-4" data-testid="pupil-day">
        <h1 className="wp-display text-3xl font-bold">My day</h1>
        <ul className="space-y-3">
          {(today.items || []).map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-4 rounded-[var(--wp-radius-2xl)] border-2 bg-white p-4",
                item.status === "current"
                  ? "border-[hsl(var(--wp-teal))]"
                  : "border-[hsl(var(--border))]",
                item.status === "done" && "opacity-60"
              )}
              data-testid="pupil-day-row"
            >
              <SymbolImage conceptKey={item.symbol_concept} size="lg" alt={item.title} />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "wp-display block truncate text-2xl font-bold",
                    item.status === "done" && "line-through"
                  )}
                >
                  {item.title}
                </span>
              </span>
              <StatusChip status={item.status} />
            </li>
          ))}
          {!(today.items || []).length ? <li className="text-lg">Nothing planned yet.</li> : null}
        </ul>
      </section>
    );
  }

  if (view === "talk") {
    return (
      <section className="space-y-6" data-testid="pupil-talk">
        <h1 className="wp-display text-3xl font-bold">I can say</h1>
        {board.map((cat) => (
          <div key={cat.id}>
            <div className="mb-3 flex items-center gap-3">
              <SymbolImage conceptKey={cat.symbol_concept} size="md" alt="" />
              <h2 className="wp-display text-2xl font-bold">{cat.title}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(cat.options || []).map((option) => (
                <SymbolTile
                  key={option.id}
                  conceptKey={option.symbol_concept}
                  label={option.text}
                  size="xl"
                  showLabel
                  className={cn("min-h-[150px]", spoken === option.id && "ring-4 ring-[hsl(var(--wp-teal))]")}
                  onClick={() => {
                    speak(option.speech_text || option.text);
                    setSpoken(option.id);
                    setTimeout(() => setSpoken(null), 1200);
                    api.post("/communication/used", { option_id: option.id }).catch(() => {});
                  }}
                  testId="pupil-communication-tile"
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    );
  }

  if (view === "feel") {
    return (
      <section className="space-y-6" data-testid="pupil-feel">
        <h1 className="wp-display text-3xl font-bold">How I feel</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          {(regulation?.zones || []).map((z) => (
            <div
              key={z.id}
              className="rounded-[var(--wp-radius-2xl)] border-2 border-[hsl(var(--border))] p-5"
              style={{ backgroundColor: ZONE_TINTS[z.colour] || "#fff" }}
              data-testid="pupil-zone-card"
            >
              <p
                className="wp-display text-2xl font-bold"
                style={{ color: ZONE_INK[z.colour] || "inherit" }}
              >
                {z.name}
              </p>
              <ul className="mt-2 space-y-1 text-lg">
                {(z.feelings || []).slice(0, 5).map((f) => (
                  <li key={f}>
                    <button type="button" onClick={() => speak(f)} className="text-left">
                      {f}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <h2 className="wp-display text-2xl font-bold">What can help me</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(regulation?.strategies || []).slice(0, 12).map((s) => (
            <SymbolTile
              key={s.id}
              conceptKey={s.symbol_concept}
              label={s.title}
              size="xl"
              showLabel
              className="min-h-[150px]"
              onClick={() => speak(s.title)}
              testId="pupil-strategy-tile"
            />
          ))}
        </div>
      </section>
    );
  }

  // sparks
  const goal = today.sparks?.goal;
  return (
    <section className="space-y-6" data-testid="pupil-sparks">
      <h1 className="wp-display text-3xl font-bold">Our Sparks</h1>
      <div className="wp-card flex flex-col items-center gap-3 p-8 text-center">
        <Sparkles className="h-12 w-12 text-[hsl(35_75%_45%)]" aria-hidden="true" />
        <p className="wp-display text-6xl font-bold">{today.sparks?.class_total || 0}</p>
        <p className="text-lg text-[hsl(var(--wp-ink-muted))]">
          {today.sparks?.today || 0} today
        </p>
        {goal ? (
          <div className="mt-4 w-full max-w-md">
            <p className="mb-2 text-lg font-semibold">{goal.title}</p>
            <Bar
              value={Math.min(100, Math.round(((today.sparks?.class_total || 0) / (goal.target || 1)) * 100))}
              className="h-4"
            />
            <p className="mt-2 text-base">{goal.reward}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
