import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { SymbolImage, SymbolTile } from "@/components/Symbol";
import { Loading } from "@/components/common";

let cachedSymbols = null;

export async function loadSymbols() {
  if (cachedSymbols) return cachedSymbols;
  const { data } = await api.get("/symbols");
  cachedSymbols = data;
  return data;
}

export function clearSymbolCache() {
  cachedSymbols = null;
}

/** Choose the canonical symbol for a concept. Used everywhere content is created. */
export const SymbolPickerDialog = ({ open, onOpenChange, value, onSelect, title = "Choose a symbol" }) => {
  const [symbols, setSymbols] = useState([]);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    loadSymbols()
      .then((data) => {
        if (alive) setSymbols(data);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open]);

  const groups = useMemo(
    () => ["All", ...Array.from(new Set(symbols.map((s) => s.group))).sort()],
    [symbols]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return symbols.filter((s) => {
      if (group !== "All" && s.group !== group) return false;
      if (!q) return true;
      return (
        s.label.toLowerCase().includes(q) || s.concept_key.toLowerCase().includes(q)
      );
    });
  }, [symbols, query, group]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[88vh] max-w-4xl overflow-hidden rounded-[var(--wp-radius-xl)]"
        data-testid="symbol-picker-dialog"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[hsl(var(--wp-ink-muted))]" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the symbol library"
              className="pl-9"
              data-testid="symbol-picker-search"
            />
          </div>
          <div className="wp-scroll-x flex gap-2 pb-1">
            {groups.map((g) => (
              <Button
                key={g}
                type="button"
                size="sm"
                variant={group === g ? "default" : "outline"}
                onClick={() => setGroup(g)}
                data-testid={`symbol-picker-group-${g}`}
                className="shrink-0 rounded-full"
              >
                {g}
              </Button>
            ))}
          </div>
        </div>
        <div className="max-h-[52vh] overflow-y-auto pr-1">
          {loading ? (
            <Loading label="Loading symbols" />
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {filtered.map((s) => (
                <SymbolTile
                  key={s.concept_key}
                  conceptKey={s.concept_key}
                  label={s.label}
                  size="sm"
                  selected={value === s.concept_key}
                  showLabel
                  onClick={() => {
                    onSelect(s.concept_key, s);
                    onOpenChange(false);
                  }}
                  testId="symbol-picker-option"
                />
              ))}
              {!filtered.length ? (
                <p className="col-span-full p-6 text-center text-sm text-[hsl(var(--wp-ink-muted))]">
                  No symbols match that search.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** Field-style trigger that shows the current symbol and opens the picker. */
export const SymbolField = ({ value, onChange, label = "Symbol", testId = "symbol-field" }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-[var(--wp-radius-lg)] border border-[hsl(var(--border))] bg-white p-2 pr-4 text-left transition-shadow duration-200 hover:shadow-[var(--wp-shadow-sm)]"
        data-testid={testId}
      >
        <SymbolImage conceptKey={value} size="sm" framed={false} />
        <span className="min-w-0">
          <span className="block text-xs font-medium text-[hsl(var(--wp-ink-muted))]">{label}</span>
          <span className="block max-w-[180px] truncate text-sm font-semibold">{value || "Choose…"}</span>
        </span>
      </button>
      <SymbolPickerDialog open={open} onOpenChange={setOpen} value={value} onSelect={onChange} />
    </div>
  );
};
