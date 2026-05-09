"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ChartCard } from "@/components/charts/ChartCard";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { SortableTable, type SortableColumn } from "@/components/ui/SortableTable";
import { MetricCard } from "@/components/ui/MetricCard";
import { DeltaMetric } from "@/components/ui/DeltaMetric";
import { CostQualityScatter } from "@/components/charts/CostQualityScatter";
import { LatencyDistributionChart } from "@/components/charts/LatencyDistributionChart";
import { BenchmarkScoreTrendChart } from "@/components/charts/BenchmarkScoreTrendChart";
import { mockBenchmarkDashboard } from "@/lib/mock/data";
import type { BenchmarkDashboardMock, BenchmarkSegmentRow } from "@/lib/mock/types";

export default function BenchmarksPage() {
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("overall");

  const matrixRows = mockBenchmarkDashboard.matrix.rows.filter((r) => (providerFilter === "all" ? true : r.provider === providerFilter));

  const segRows = useMemo<BenchmarkSegmentRow[]>(() => {
    return (mockBenchmarkDashboard as BenchmarkDashboardMock).segments
      .filter((r) => (providerFilter === "all" ? true : r.provider === providerFilter))
      .filter((r) => r.segment === (segmentFilter as BenchmarkSegmentRow["segment"]));
  }, [providerFilter, segmentFilter]);

  const providers = ["all", ...Array.from(new Set(mockBenchmarkDashboard.matrix.rows.map((r) => r.provider)))];
  const segments = ["overall", "language:te", "language:en", "channel:whatsapp", "channel:push", "task:financial_narrative"];

  const columns: SortableColumn<(typeof matrixRows)[number]>[] = [
    { key: "model", header: "Model", cell: (r) => <span className="text-white/85 font-medium">{r.model}</span>, sortValue: (r) => r.model },
    { key: "provider", header: "Provider", cell: (r) => <ProviderBadge provider={r.provider} />, sortValue: (r) => r.provider },
    { key: "avgScore", header: "Avg score", cell: (r) => <span className="font-mono text-[11px] text-white/75 tabular-nums">{r.avgScore.toFixed(3)}</span>, sortValue: (r) => r.avgScore },
    { key: "pass", header: "Pass rate", cell: (r) => <span className="font-mono text-[11px] text-white/75 tabular-nums">{(r.passRateAll * 100).toFixed(1)}%</span>, sortValue: (r) => r.passRateAll },
    { key: "lat", header: "Latency", cell: (r) => <span className="font-mono text-[11px] text-white/75 tabular-nums">{r.avgLatencyMs.toFixed(0)}ms</span>, sortValue: (r) => r.avgLatencyMs },
    { key: "cost", header: "Total cost", cell: (r) => <span className="font-mono text-[11px] text-white/75 tabular-nums">${r.totalCostUsd.toFixed(4)}</span>, sortValue: (r) => r.totalCostUsd },
    { key: "cps", header: "Cost/success", cell: (r) => <span className="font-mono text-[11px] text-white/75 tabular-nums">${r.costPerSuccessUsd.toFixed(4)}</span>, sortValue: (r) => r.costPerSuccessUsd },
  ];

  const segmentColumns: SortableColumn<BenchmarkSegmentRow>[] = [
    { key: "model", header: "Model", cell: (r) => <span className="text-white/85 font-medium">{r.model}</span>, sortValue: (r) => r.model },
    { key: "provider", header: "Provider", cell: (r) => <ProviderBadge provider={r.provider} />, sortValue: (r) => r.provider },
    { key: "avgScore", header: "Avg score", cell: (r) => <span className="font-mono text-[11px] text-white/75 tabular-nums">{r.avgScore.toFixed(3)}</span>, sortValue: (r) => r.avgScore },
    { key: "pass", header: "Pass rate", cell: (r) => <span className="font-mono text-[11px] text-white/75 tabular-nums">{(r.passRateAll * 100).toFixed(1)}%</span>, sortValue: (r) => r.passRateAll },
    { key: "lat", header: "Latency", cell: (r) => <span className="font-mono text-[11px] text-white/75 tabular-nums">{r.avgLatencyMs.toFixed(0)}ms</span>, sortValue: (r) => r.avgLatencyMs },
    { key: "cps", header: "Cost/success", cell: (r) => <span className="font-mono text-[11px] text-white/75 tabular-nums">${r.costPerSuccessUsd.toFixed(4)}</span>, sortValue: (r) => r.costPerSuccessUsd },
  ];

  return (
    <AppShell title="Benchmarks">
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold">Benchmark Dashboard</div>
            <div className="text-[12px] text-[var(--muted)]">Compare model quality vs cost vs latency for release safety.</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[var(--muted)]">Provider</label>
            <select className="h-8 rounded-md border border-white/10 bg-black/20 px-2 text-[12px]" value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <label className="text-[11px] text-[var(--muted)] ml-2">Segment</label>
            <select className="h-8 rounded-md border border-white/10 bg-black/20 px-2 text-[12px]" value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)}>
              {segments.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Recommendations */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <MetricCard label="Cheapest acceptable" value={mockBenchmarkDashboard.recommendations.cheapestAcceptable} hint="cost per success" />
          <MetricCard label="Best quality" value={mockBenchmarkDashboard.recommendations.bestQuality} hint="grounding + Telugu" />
          <MetricCard label="Balanced" value={mockBenchmarkDashboard.recommendations.balanced} hint="routing guidance" />
        </div>

        {/* Matrix table */}
        <section className="space-y-2">
          <div className="text-[12px] font-semibold">Benchmark matrix</div>
          <SortableTable columns={columns} rows={matrixRows} getRowKey={(r) => `${r.provider}:${r.model}:${r.runId}`} defaultSort={{ key: "cps", dir: "asc" }} />
        </section>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard title="Cost vs quality" subtitle="Scatter: x=cost/success, y=avg score (size=pass rate)">
            <CostQualityScatter rows={matrixRows} />
          </ChartCard>
          <ChartCard title="Latency distribution" subtitle="p50/p90/p99 by model">
            <LatencyDistributionChart dist={mockBenchmarkDashboard.latencyDistributionMs} />
          </ChartCard>
        </div>

        <ChartCard title="Score trends" subtitle="Avg score across prompt versions">
          <BenchmarkScoreTrendChart points={mockBenchmarkDashboard.scoreTrend.filter((p) => (providerFilter === "all" ? true : p.model && true))} />
        </ChartCard>

        {/* Segment-aware benchmarking */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-semibold">Segment-aware benchmarking</div>
              <div className="text-[11px] text-[var(--muted)]">Telugu, WhatsApp, and financial narrative slices.</div>
            </div>
            <div className="text-[11px] text-[var(--muted)]">
              Comparing: <span className="text-white/80">{segmentFilter}</span>
            </div>
          </div>
          <SortableTable columns={segmentColumns} rows={segRows} getRowKey={(r) => `${r.segment}:${r.provider}:${r.model}`} defaultSort={{ key: "avgScore", dir: "desc" }} />
          {segRows.length === 2 ? (
            <div className="rounded-md border border-white/10 bg-black/10 p-3 text-[12px] text-white/75">
              <div className="font-semibold mb-1">Delta view</div>
              <div className="flex flex-wrap items-center gap-2">
                <DeltaMetric label="Avg score" baseline={segRows[0]!.avgScore} candidate={segRows[1]!.avgScore} thresholds={{ warn: 0.03, blocker: 0.08 }} />
                <DeltaMetric label="Pass rate" baseline={segRows[0]!.passRateAll} candidate={segRows[1]!.passRateAll} thresholds={{ warn: 0.04, blocker: 0.10 }} />
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

