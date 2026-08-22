import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Info, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, errorMessage } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import {
  AccessDenied,
  EmptyState,
  Loading,
  PageHeader,
  SectionCard,
  StatTile,
} from "@/components/common";

export default function Progress() {
  const { can } = useApp();
  const [data, setData] = useState(null);
  const [pupils, setPupils] = useState([]);
  const [pupilId, setPupilId] = useState("");

  const load = useCallback(async () => {
    try {
      const [p, pu] = await Promise.all([
        api.get(`/observations/patterns${pupilId ? `?pupil_id=${pupilId}` : ""}`),
        api.get("/pupils").catch(() => ({ data: [] })),
      ]);
      setData(p.data);
      setPupils(pu.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, [pupilId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("observation.view")) return <AccessDenied what="progress information" />;
  if (!data) return <Loading label="Building the progress picture" />;

  const areaData = Object.entries(data.by_area).map(([area, levels]) => ({
    area,
    ...levels,
  }));

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="What am I learning?"
        title="Progress patterns"
        description="Patterns from classroom observations over the last six weeks."
        actions={
          <Select value={pupilId} onValueChange={setPupilId}>
            <SelectTrigger className="h-10 w-[200px]" data-testid="progress-pupil-select">
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
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile value={data.total} label="Observations recorded" tintName="mint" testId="progress-total" />
        <StatTile
          value={`${data.series?.length ? data.series[data.series.length - 1].independent_pct : 0}%`}
          label="Independent most recently"
          tintName="butter"
          testId="progress-independent"
        />
        <StatTile value={data.days} label="Days included" tintName="lilac" />
      </div>

      <SectionCard
        title="What we are noticing"
        symbol={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
        testId="progress-highlights"
      >
        <ul className="space-y-2">
          {(data.highlights || []).map((h, index) => (
            <li
              key={index}
              className={`rounded-[var(--wp-radius-lg)] border p-3 text-sm ${
                h.kind === "positive"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-[hsl(var(--border))] bg-white"
              }`}
              data-testid="progress-highlight"
            >
              {h.text}
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-start gap-2 text-xs text-[hsl(var(--wp-ink-muted))]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {data.disclaimer}
        </p>
      </SectionCard>

      {data.total ? (
        <div className="grid gap-[var(--wp-gap)] lg:grid-cols-2">
          <SectionCard title="Support level by area" testId="progress-area-chart">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(196 18% 90%)" />
                  <XAxis dataKey="area" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Independent" stackId="a" fill="hsl(160 45% 40%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Prompted" stackId="a" fill="hsl(38 80% 60%)" />
                  <Bar dataKey="Modelled" stackId="a" fill="hsl(210 55% 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Independence over time" testId="progress-trend-chart">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(196 18% 90%)" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="independent_pct"
                    name="% independent"
                    stroke="hsl(174 55% 32%)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      ) : (
        <EmptyState
          title="Not enough observations yet"
          description="Record a few quick observations and patterns will start to appear here."
        />
      )}
    </div>
  );
}
