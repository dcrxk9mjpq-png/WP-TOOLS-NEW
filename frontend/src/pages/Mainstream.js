import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { SymbolImage } from "@/components/Symbol";
import {
  AccessDenied,
  EmptyState,
  Loading,
  PageHeader,
  PupilAvatar,
  SectionCard,
} from "@/components/common";

export default function Mainstream() {
  const { pupilId } = useParams();
  const navigate = useNavigate();
  const { can } = useApp();
  const [list, setList] = useState(null);
  const [bridge, setBridge] = useState(null);

  const load = useCallback(async () => {
    try {
      if (pupilId) {
        const { data } = await api.get(`/mainstream/${pupilId}`);
        setBridge(data);
      } else {
        const { data } = await api.get("/mainstream");
        setList(data);
        setBridge(null);
      }
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, [pupilId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("mainstream.view")) return <AccessDenied what="the Mainstream Bridge" />;

  if (pupilId) {
    if (!bridge) return <Loading label="Loading support summary" />;
    return (
      <div className="wp-stack">
        <div className="wp-no-print">
          <PageHeader
            eyebrow="Concise support summary"
            title={`Supporting ${bridge.pupil.display_name}`}
            description={bridge.note}
            actions={
              <>
                <Button variant="outline" onClick={() => navigate("/mainstream")} data-testid="bridge-back">
                  All pupils
                </Button>
                <Button onClick={() => window.print()} className="gap-2" data-testid="bridge-print">
                  <Printer className="h-4 w-4" /> Print
                </Button>
              </>
            }
          />
        </div>

        <div className="wp-card p-6">
          <div className="flex items-center gap-4">
            <PupilAvatar pupil={bridge.pupil} size={64} context="profile" />
            <div>
              <h2 className="wp-display text-2xl font-bold">{bridge.pupil.display_name}</h2>
              <p className="text-sm text-[hsl(var(--wp-ink-muted))]">Western Park DSP support summary</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {bridge.sections.map((section) => (
              <div key={section.key} className="wp-row p-4" data-testid="bridge-section">
                <div className="flex items-center gap-3">
                  <SymbolImage conceptKey={section.symbol_concept} size="sm" alt="" />
                  <h3 className="font-semibold">{section.title}</h3>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {section.items?.length ? (
                    section.items.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--wp-teal))]" />
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-[hsl(var(--wp-ink-muted))]">Nothing recorded.</li>
                  )}
                </ul>
              </div>
            ))}
          </div>

          {bridge.targets?.length ? (
            <div className="mt-4 rounded-[var(--wp-radius-xl)] bg-[hsl(var(--wp-tint-butter))] p-4">
              <h3 className="font-semibold">Current targets</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {bridge.targets.map((t) => (
                  <li key={t.id}>
                    {t.text} <span className="text-[hsl(var(--wp-ink-muted))]">({t.area})</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {bridge.strategies?.length ? (
            <div className="mt-4">
              <h3 className="font-semibold">Regulation supports that help</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {bridge.strategies.map((s) => (
                  <span key={s.id} className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-white px-3 py-1.5 text-sm">
                    <SymbolImage conceptKey={s.symbol_concept} size="xs" framed={false} className="h-6 w-6 p-0" />
                    {s.title}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-[var(--wp-radius-xl)] border border-[hsl(var(--border))] p-4 text-sm">
            <h3 className="font-semibold">Relevant adaptations</h3>
            <p className="mt-1 text-[hsl(var(--wp-ink-muted))]">
              Shows the timetable as{" "}
              <strong>{bridge.adaptations.timetable_visibility.replace(/_/g, " ")}</strong>
              {bridge.adaptations.show_times ? ", with times shown" : ", without times"}.
            </p>
          </div>

          <p className="mt-5 flex items-start gap-2 text-xs text-[hsl(var(--wp-ink-muted))]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {bridge.note}
          </p>
        </div>
      </div>
    );
  }

  if (!list) return <Loading label="Loading pupils" />;

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="Sharing only what is needed"
        title="Mainstream Bridge"
        description="A short, permission-limited summary that helps mainstream colleagues support a pupil well. The full DSP record is never shared."
      />
      {list.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/mainstream/${p.id}`)}
              className="wp-card flex items-center gap-3 p-4 text-left transition-shadow duration-200 hover:shadow-[var(--wp-shadow-md)]"
              data-testid="bridge-pupil-card"
            >
              <PupilAvatar pupil={p} size={52} context="profile" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.display_name}</span>
                <span className="block text-xs text-[hsl(var(--wp-ink-muted))]">View support summary</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="No pupils shared with you" description="Ask the classroom team to assign pupils to your account." />
      )}
    </div>
  );
}
