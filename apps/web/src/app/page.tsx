import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { CodeDiffBlock } from "@/components/ui/CodeDiffBlock";
import { DeltaMetric } from "@/components/ui/DeltaMetric";
import { EmptyState } from "@/components/ui/EmptyState";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { MetricCard } from "@/components/ui/MetricCard";
import { SeverityPill } from "@/components/ui/SeverityPill";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TimelineItem } from "@/components/timeline/TimelineItem";
import { CategorySlicesPieChart } from "@/components/charts/CategorySlicesPieChart";
import { DeltaMetricsBarChart } from "@/components/charts/DeltaMetricsBarChart";
import { ScoreTrendLineChart } from "@/components/charts/ScoreTrendLineChart";
import { ChartCard } from "@/components/charts/ChartCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DeltaMetric as _DeltaMetric } from "@/components/ui/DeltaMetric";
import { mockReleaseOverview } from "@/lib/mock/data";
import { prisma } from "@the-guard/db";

function fmtPct(n: number) {
  const pct = n * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function StatDetail(props: { metric: string; stats: any }) {
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-[11px] text-[var(--info)] hover:underline">
        Stats (p={props.stats.pValue.toFixed(3)})
      </summary>
      <div className="mt-1 text-[11px] text-white/70 leading-5">
        <div>95% CI: [{props.stats.ci95.low.toFixed(3)}, {props.stats.ci95.high.toFixed(3)}]</div>
        <div className="mt-1">{props.stats.methodology}</div>
      </div>
    </details>
  );
}

function fmtUsd(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

async function loadLiveRunAggregates() {
  if (!process.env.DATABASE_URL) {
    return {
      ok: false as const,
      reason: "DATABASE_URL not configured (Prisma disabled during build).",
      error: "Missing DATABASE_URL",
    };
  }
  try {
    const totalRuns = await (prisma as any).eval_runs.count();

    // Run-level verdict inference:
    // - NO_GO if any score row has passed=false for that run
    // - GO if it has any scores and none failed
    // - UNKNOWN if there are no scores yet
    const [scoredRuns, noGoRuns, scoreAgg] = await Promise.all([
      (prisma as any).eval_scores.findMany({ distinct: ["run_id"], select: { run_id: true } }),
      (prisma as any).eval_scores.findMany({ where: { passed: false }, distinct: ["run_id"], select: { run_id: true } }),
      (prisma as any).eval_scores.aggregate({ _avg: { value: true } }),
    ]);

    const scored = new Set<string>(scoredRuns.map((r: any) => r.run_id));
    const noGo = new Set<string>(noGoRuns.map((r: any) => r.run_id));
    const goCount = Math.max(0, scored.size - noGo.size);
    const noGoCount = noGo.size;

    // Hallucination rate: aggregate latest traces to keep page fast.
    const traces = await (prisma as any).hallucination_traces.findMany({
      orderBy: { created_at: "desc" },
      take: 200,
      select: { trace: true },
    });
    let totalClaims = 0;
    let unsupportedClaims = 0;
    for (const t of traces) {
      const summary = (t.trace as any)?.summary;
      if (!summary) continue;
      totalClaims += Number(summary.totalClaims ?? 0);
      unsupportedClaims += Number(summary.unsupportedClaims ?? 0);
    }
    const hallucinationRate = totalClaims > 0 ? unsupportedClaims / totalClaims : 0;

    return {
      ok: true as const,
      totalRuns,
      goCount,
      noGoCount,
      avgScore: Number(scoreAgg?._avg?.value ?? 0),
      hallucinationRate,
      traceSampleCount: traces.length,
    };
  } catch (err: any) {
    return {
      ok: false as const,
      reason: "DATABASE_URL not configured (Prisma unavailable in this environment).",
      error: err?.message ? String(err.message) : String(err),
    };
  }
}

async function loadLatestRuns() {
  if (!process.env.DATABASE_URL) {
    return { ok: false as const, rows: [] as any[], error: "Missing DATABASE_URL" };
  }
  try {
    const rows = await (prisma as any).eval_runs.findMany({
      orderBy: { created_at: "desc" },
      take: 10,
      select: { id: true, task_type: true, status: true, created_at: true, model_config: true },
    });
    return { ok: true as const, rows };
  } catch (err: any) {
    return { ok: false as const, rows: [] as any[], error: err?.message ? String(err.message) : String(err) };
  }
}

export default async function Home() {
  const overview = mockReleaseOverview; // keep deterministic release narrative + regressions/benchmarks
  const hasError = !overview;

  const [live, latestRuns] = await Promise.all([loadLiveRunAggregates(), loadLatestRuns()]);

  const metricComparisons = overview.metricComparisons;

  const metricOrder: Array<{
    key: keyof typeof metricComparisons;
    label: string;
    polarity?: "higher_better" | "lower_better";
    thresholds: { warn: number; blocker: number };
  }> = [
    { key: "factualGrounding", label: "Factual Grounding", thresholds: { warn: 0.03, blocker: 0.06 } },
    { key: "semanticSimilarity", label: "Semantic Similarity", thresholds: { warn: 0.03, blocker: 0.07 } },
    { key: "teluguQuality", label: "Telugu Quality", thresholds: { warn: 0.05, blocker: 0.12 } },
    { key: "formatCompliance", label: "Format Compliance", thresholds: { warn: 0.06, blocker: 0.12 } },
    { key: "hallucinationRate", label: "Hallucination Rate", polarity: "lower_better", thresholds: { warn: 0.02, blocker: 0.05 } },
    { key: "passRate", label: "Pass Rate", thresholds: { warn: 0.04, blocker: 0.12 } },
  ];

  const topRegressionColumns: Column<(typeof overview.topRegressions.rows)[number]>[] = [
    {
      key: "merchant",
      header: "Merchant",
      cell: (r) => <span className="text-white/80">{r.merchant}</span>,
    },
    {
      key: "lang",
      header: "Language",
      cell: (r) => (
        <span className={r.language === "Telugu" ? "text-[color:var(--warning)] font-semibold" : "text-white/80"}>{r.language}</span>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      cell: (r) => <span className="text-white/70">{r.channel}</span>,
    },
    {
      key: "severity",
      header: "Severity",
      cell: (r) => <SeverityPill severity={r.severity} />,
    },
    {
      key: "delta",
      header: "Delta",
      cell: (r) => (
        <span className={r.deltaPercent < 0 ? "text-[color:var(--danger)]" : "text-[color:var(--success)]"}>
          {r.deltaPercent > 0 ? "+" : ""}
          {r.deltaPercent.toFixed(1)}%
        </span>
      ),
    },
    {
      key: "failedScorers",
      header: "Failed scorers",
      cell: (r) => <span className="text-[11px] text-white/70">{r.failedScorers.join(", ")}</span>,
    },
    {
      key: "hallucinations",
      header: "Hallucinations",
      cell: (r) => <span className="text-[11px] text-white/80">{r.hallucinationCount}</span>,
    },
  ];

  if (hasError) {
    return (
      <AppShell title="Release overview">
        <EmptyState title="Failed to load release overview" description="Check backend connectivity and regression persistence." />
      </AppShell>
    );
  }

  if (live.ok && live.totalRuns === 0) {
    return (
      <AppShell title="Release overview">
        <EmptyState
          title="No eval runs yet"
          description="Run the runner once to populate eval_runs/eval_cases/eval_outputs/eval_scores and hallucination traces."
          action={
            <div className="text-[11px] text-[var(--muted)]">
              Tip: run <span className="font-mono">pnpm -C apps/runner dev</span> (demo mode is safe-by-default).
            </div>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Release overview"
      right={
        <div className="flex items-center gap-2">
          <SeverityPill severity={overview.decision.severity} />
          <StatusBadge status={overview.decision.verdict} />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Live summary (Prisma-backed) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <MetricCard label="Total runs" value={live.ok ? String(live.totalRuns) : "—"} hint={live.ok ? "Latest from eval_runs" : live.reason} />
          <MetricCard label="GO vs NO_GO" value={live.ok ? `${live.goCount} / ${live.noGoCount}` : "—"} hint={live.ok ? "Inferred from eval_scores" : "Set DATABASE_URL to enable live metrics"} />
          <MetricCard label="Average score" value={live.ok ? live.avgScore.toFixed(3) : "—"} hint={live.ok ? "Avg of numeric scorer values" : "Prisma disabled"} />
          <MetricCard label="Hallucination rate" value={live.ok ? `${(live.hallucinationRate * 100).toFixed(1)}%` : "—"} hint={live.ok ? `Aggregated from last ${live.traceSampleCount} traces` : "Prisma disabled"} />
        </section>

        {/* Latest runs (live) */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Latest eval runs</div>
              <div className="text-[11px] text-[var(--muted)] mt-0.5">Pulled directly from Prisma. The rest of this page remains deterministic for demo stability.</div>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {(latestRuns.ok ? latestRuns.rows : []).map((r: any) => (
                <div key={r.id} className="rounded-md border border-white/10 bg-black/10 p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white/85 truncate">{r.id}</div>
                    <div className="mt-1 text-[11px] text-white/65">
                      {String(r.task_type)} • {String(r.status)} • {new Date(r.created_at).toISOString()}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[11px] text-white/70">{(r.model_config as any)?.provider ?? "?"}</div>
                    <div className="text-[11px] text-white/80 font-semibold">{(r.model_config as any)?.model ?? "?"}</div>
                  </div>
                </div>
              ))}
              {!latestRuns.ok ? (
                <div className="rounded-md border border-white/10 bg-black/10 p-3 text-[11px] text-white/70">
                  Live runs unavailable. Set <span className="font-mono">DATABASE_URL</span> to enable Prisma-backed panels.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* 1) HERO: verdict with explicit evidence language */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight">Release verdict</div>
              <div className="text-[11px] text-[var(--muted)] mt-0.5 tabular-nums">{overview.context.decisionTimestamp}</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={overview.decision.verdict} />
              <div className="hidden md:block text-[11px] text-[var(--muted)]">{overview.context.releaseVersion}</div>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
            <div className="rounded-md border border-white/10 bg-black/10 p-4">
              <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Decision</div>
              <div className="mt-1 text-3xl font-semibold tracking-tight">
                {overview.decision.verdict === "GO"
                  ? "✅ RELEASE APPROVED"
                  : overview.decision.verdict === "NO_GO"
                    ? "❌ RELEASE BLOCKED"
                    : "⚠️ INCONCLUSIVE"}
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-md border border-white/10 bg-black/10 p-3">
                  <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide">Severity</div>
                  <div className="mt-1">
                    <SeverityPill severity={overview.decision.severity} />
                  </div>
                </div>
                <div className="rounded-md border border-white/10 bg-black/10 p-3">
                  <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide">Confidence</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">{Math.round(overview.decision.confidenceLevel * 100)}%</div>
                  <div className="mt-1 text-[11px] text-white/70">Paired bootstrap with CI + p-value</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-[12px] font-semibold">Reasons (evidence-backed)</div>
                <ul className="mt-2 space-y-1 text-sm text-white/80">
                  {overview.evidenceChain.map((e) => (
                    <li key={e.metric} className="flex gap-2">
                      <span className="text-white/60 shrink-0">{e.severity === "BLOCKER" ? "■" : e.severity === "WARN" ? "◆" : "●"}</span>
                      <span>{e.statement}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4">
                <div className="text-[12px] font-semibold">Affected segments</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {overview.context.affectedSegments.map((s) => (
                    <span
                      key={s}
                      className={
                        s.toLowerCase().includes("telugu")
                          ? "rounded-md border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/15 px-2 py-0.5 text-[11px] text-[color:var(--warning)]"
                          : "rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/80"
                      }
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-white/10 bg-black/10 p-4">
              <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Provider / model pair</div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white/90">Baseline</div>
                  <div className="text-[11px] text-[var(--muted)]">{overview.context.baselineProviderModel}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white/90">Candidate</div>
                  <div className="text-[11px] text-[var(--muted)]">{overview.context.candidateProviderModel}</div>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <div className="text-[12px] font-semibold">Top regression reason</div>
                  <div className="mt-1 text-sm text-white/80">{overview.decision.topRegression}</div>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <div className="text-[12px] font-semibold">Evidence support</div>
                  <div className="mt-1 text-sm text-white/70">
                    Hallucinations detected: <span className="text-white/90 font-semibold">{overview.decision.hallucinations}</span> • Cost delta {overview.decision.costDelta}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2) Regression metrics grid + delta chart + statistical significance */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
          <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="text-sm font-semibold">Regression metrics</div>
              <div className="text-[11px] text-[var(--muted)] mt-0.5">Baseline vs candidate with severity-aware interpretation.</div>
            </div>

            <div className="p-4 space-y-4">
              {metricOrder.map((m) => {
                const v = metricComparisons[m.key];
                const stats = overview.metricSignificance[m.key];
                const showStats = Boolean(stats);
                return (
                  <div key={m.key} className="rounded-md border border-white/10 bg-black/10 p-3">
                    <DeltaMetric
                      label={m.label}
                      baseline={v.baseline}
                      candidate={v.candidate}
                      polarity={m.polarity}
                      thresholds={m.thresholds}
                      className="w-full"
                    />
                    {showStats ? (
                      <StatDetail
                        metric={m.key}
                        stats={stats}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="text-sm font-semibold">Statistical significance</div>
              <div className="text-[11px] text-[var(--muted)] mt-0.5">Paired bootstrap comparison (production-friendly rigor).</div>
            </div>

            <div className="p-4 space-y-4">
              {(() => {
                const tel = overview.metricSignificance.teluguQuality;
                const fac = overview.metricSignificance.factualGrounding;
                const hall = overview.metricSignificance.hallucinationRate;
                const format = overview.metricSignificance.formatCompliance;
                const allSignificant = Boolean(tel?.significant && fac?.significant && hall?.significant && format?.significant);
                return (
                  <div className="rounded-md border border-white/10 bg-black/10 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Method</div>
                    <div className="mt-1 text-sm text-white/80">
                      Paired bootstrap on per-case deltas with 95% CI and two-sided p-values.
                    </div>
                    <div className="mt-3 text-sm">
                      <span className={allSignificant ? "text-[color:var(--danger)] font-semibold" : "text-[color:var(--warning)] font-semibold"}>
                        {allSignificant ? "Regression is statistically significant." : "Key metrics show partial statistical significance."}
                      </span>
                    </div>
                    <div className="mt-3 text-[11px] text-white/70 leading-5">
                      Evidence uses deterministic traceability for hallucinations and scorer deltas for quality/compliance.
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-md border border-white/10 bg-black/10 p-3 space-y-3">
                <div className="text-[12px] font-semibold">Key metrics (p-value + 95% CI)</div>
                {[
                  ["teluguQuality", "Telugu quality"],
                  ["factualGrounding", "Factual grounding"],
                  ["formatCompliance", "Format compliance"],
                  ["hallucinationRate", "Hallucination rate"],
                  ["passRate", "Pass rate"],
                ].map(([k, label]) => {
                  const key = k as keyof typeof overview.metricSignificance;
                  const stats = overview.metricSignificance[key];
                  if (!stats) return null;
                  return (
                    <div key={k} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white/85">{label}</div>
                        <div className="text-[11px] text-white/65 mt-1">
                          95% CI [{stats.ci95.low.toFixed(3)}, {stats.ci95.high.toFixed(3)}]
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div
                          className={
                            stats.significant ? "text-[color:var(--danger)] font-semibold" : "text-[var(--muted)]"
                          }
                        >
                          p = {stats.pValue.toFixed(3)}
                        </div>
                        <div className="text-[11px] text-white/65 mt-1">
                          {stats.significant ? "significant" : "not significant"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Visualization: delta charts + score trends */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard title="Delta chart" subtitle="Candidate vs baseline (percent deltas)">
            <DeltaMetricsBarChart items={overview.deltaChart} />
          </ChartCard>
          <ChartCard title="Score trends" subtitle={overview.scoreTrends.metricLabel}>
            <ScoreTrendLineChart trend={overview.scoreTrends} />
          </ChartCard>
        </div>

        {/* 4) Segment analysis + category slices */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Segment analysis</div>
              <div className="text-[11px] text-[var(--muted)] mt-0.5">Language and channel breakdowns plus category slices. Telugu regressions are highlighted.</div>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
            <div className="space-y-4">
              <div className="rounded-md border border-white/10 bg-black/10 p-3">
                <div className="text-[12px] font-semibold">Language slices</div>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white/80">English</div>
                    <DeltaMetric
                      label=""
                      baseline={overview.segmentAnalysis.english.baseline}
                      candidate={overview.segmentAnalysis.english.candidate}
                      thresholds={{ warn: 0.03, blocker: 0.07 }}
                      className="w-[260px]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[color:var(--warning)]">Telugu</span>
                      <SeverityPill severity="BLOCKER" />
                    </div>
                    <DeltaMetric
                      label=""
                      baseline={overview.segmentAnalysis.telugu.baseline}
                      candidate={overview.segmentAnalysis.telugu.candidate}
                      thresholds={{ warn: 0.05, blocker: 0.12 }}
                      className="w-[260px]"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-black/10 p-3">
                <div className="text-[12px] font-semibold">Channel slices</div>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white/80">WhatsApp</div>
                    <DeltaMetric
                      label=""
                      baseline={overview.segmentAnalysis.whatsapp.baseline}
                      candidate={overview.segmentAnalysis.whatsapp.candidate}
                      thresholds={{ warn: 0.03, blocker: 0.08 }}
                      className="w-[260px]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white/80">Push</div>
                    <DeltaMetric
                      label=""
                      baseline={overview.segmentAnalysis.push.baseline}
                      candidate={overview.segmentAnalysis.push.candidate}
                      thresholds={{ warn: 0.03, blocker: 0.08 }}
                      className="w-[260px]"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-black/10 p-3">
                <div className="text-[12px] font-semibold">Category slices</div>
                <div className="mt-2 text-[11px] text-white/65">Where the regressions concentrate (candidate distribution).</div>
                <div className="mt-3">
                  <CategorySlicesPieChart slices={overview.segmentAnalysis.categorySlices} />
                </div>
              </div>
            </div>

            <div className="rounded-md border border-white/10 bg-black/10 p-3">
              <div className="text-[12px] font-semibold">Segment impact summary</div>
              <div className="mt-2 space-y-2">
                {overview.context.affectedSegments.map((seg) => (
                  <div key={seg} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
                    <div className="text-sm font-medium text-white/85">{seg}</div>
                    <StatusBadge status={seg.toLowerCase().includes("telugu") ? "NO_GO" : "INCONCLUSIVE"} />
                  </div>
                ))}
              </div>
              <div className="mt-4 text-[11px] text-white/65 leading-5">
                This table is a production triage view: it prioritizes the exact segments that should be investigated first.
              </div>
            </div>
          </div>
        </section>

        {/* 5) Top regressions table */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold">Top regressions</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">Worst failing cases and measurable metric drops.</div>
          </div>
          <div className="p-4 grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-4">
            <div>
              <DataTable columns={topRegressionColumns} rows={overview.topRegressions.rows} getRowKey={(r) => r.caseName} />
            </div>

            <div className="space-y-4">
              <div className="rounded-md border border-white/10 bg-black/10 p-3">
                <div className="text-[12px] font-semibold">Biggest score drops</div>
                <div className="mt-2 space-y-2">
                  {overview.topRegressions.biggestMetricDrops.map((d) => (
                    <div key={d.metric} className="flex items-center justify-between gap-3">
                      <div className="text-[11px] text-white/70">{d.metric}</div>
                      <div className={d.deltaPercent < 0 ? "text-[color:var(--danger)] font-semibold" : "text-[color:var(--success)] font-semibold"}>
                        {d.deltaPercent > 0 ? "+" : ""}
                        {d.deltaPercent.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-black/10 p-3">
                <div className="text-[12px] font-semibold">Hallucination increases</div>
                <div className="mt-2 space-y-2">
                  {overview.topRegressions.hallucinationIncreases.map((h) => (
                    <div key={h.segment} className="rounded-md border border-white/10 bg-white/5 p-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-white/85">{h.segment}</div>
                        <div className="text-[12px] text-white/75">
                          +{(h.unsupportedRateDelta * 100).toFixed(1)}pp
                        </div>
                      </div>
                      <div className="mt-1 text-[11px] text-white/65">Examples: {h.examples.join(", ")}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6) Hallucination summary panel */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Hallucination evidence</div>
              <div className="text-[11px] text-[var(--muted)] mt-0.5">Deterministic claim verification against provided facts. No LLM judge required in this mock.</div>
            </div>
            <div className="flex items-center gap-2">
              <SeverityPill severity={overview.decision.severity} />
              <div className="text-[11px] text-white/70">Unsupported claims: {overview.hallucinationSummary.unsupportedClaimsCount}</div>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-4">
            <div className="space-y-4">
              <div className="rounded-md border border-white/10 bg-black/10 p-3">
                <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Hallucination rate</div>
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  <DeltaMetric
                    label="Hallucination rate"
                    baseline={overview.metricComparisons.hallucinationRate.baseline}
                    candidate={overview.metricComparisons.hallucinationRate.candidate}
                    polarity="lower_better"
                    thresholds={{ warn: 0.02, blocker: 0.05 }}
                  />
                  <span className="text-[11px] text-white/65">
                    Δ {overview.hallucinationSummary.hallucinationRateDeltaPp}pp • {overview.hallucinationSummary.confidenceSummary}
                  </span>
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-black/10 p-3">
                <div className="text-[12px] font-semibold">Top unsupported claims</div>
                <div className="mt-2 space-y-2">
                  {overview.hallucinationSummary.topUnsupportedClaims.map((c) => (
                    <details key={c.claim} className="rounded-md border border-white/10 bg-white/5 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-white/85">
                        {c.claim}
                      </summary>
                      <div className="mt-2 text-[12px] text-white/70 leading-6">
                        <div>
                          Segment: <span className="text-white/85">{c.segment}</span>
                        </div>
                        <div className="mt-1">
                          Confidence: <span className="text-white/85">{Math.round(c.confidence * 100)}%</span>
                        </div>
                        <div className="mt-1">
                          Evidence: no supporting match for source fields ({c.sourceFields.join(", ")}).
                        </div>
                        <div className="mt-1">{c.explanation}</div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-white/10 bg-black/10 p-3">
              <div className="text-[12px] font-semibold">Trace preview (mock payload)</div>
              <div className="mt-2 text-[11px] text-white/65">This is what will be rendered from `hallucination_traces` in production.</div>
              <div className="mt-3">
                <JsonViewer value={overview.hallucinationSummary.topUnsupportedClaims} />
              </div>
            </div>
          </div>
        </section>

        {/* 7) Prompt diff intelligence */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Prompt diff intelligence</div>
              <div className="text-[11px] text-[var(--muted)] mt-0.5">What changed, why it matters, and which metrics it impacted.</div>
            </div>
            <div className="text-[11px] text-white/70">Changed lines: {overview.promptDiff.changedLines}</div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-4">
              <div className="rounded-md border border-white/10 bg-black/10 p-3">
                <div className="text-[12px] font-semibold">Risk summary</div>
                <div className="mt-2 text-sm text-white/80">{overview.promptDiff.riskSummary}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {overview.promptDiff.risk.increasedHallucinationLikelihood ? <SeverityPill severity="WARN" /> : null}
                  {overview.promptDiff.risk.degradedFactualGrounding ? <SeverityPill severity="WARN" /> : null}
                  {overview.promptDiff.risk.teluguLiteralTranslationRisk ? <SeverityPill severity="BLOCKER" /> : null}
                  {!overview.promptDiff.risk.increasedHallucinationLikelihood &&
                  !overview.promptDiff.risk.degradedFactualGrounding &&
                  !overview.promptDiff.risk.teluguLiteralTranslationRisk ? (
                    <SeverityPill severity="INFO" />
                  ) : null}
                </div>
                <div className="mt-3 text-[11px] text-white/65">
                  Operational read: this prompt diff loosened grounding constraints and increased the chance of unsupported numeric claims in Telugu/WhatsApp generations.
                </div>
              </div>
              <div className="rounded-md border border-white/10 bg-black/10 p-3">
                <div className="text-[12px] font-semibold">Impacted metrics</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {overview.promptDiff.impactedMetrics.map((m) => (
                    <span key={m} className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/80">
                      {m}
                    </span>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="text-[11px] text-white/65">Metric deltas (baseline → candidate)</div>
                  <div className="mt-2 space-y-2">
                    {overview.promptDiff.impactedMetricsDeltas.map((d) => (
                      <DeltaMetric
                        key={d.metric}
                        label={d.metric}
                        baseline={d.baseline}
                        candidate={d.candidate}
                        polarity={d.metric.includes("Hallucination") ? "lower_better" : "higher_better"}
                        thresholds={{ warn: 0.04, blocker: 0.10 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <CodeDiffBlock baseline={overview.promptDiff.promptExcerpt.baseline} candidate={overview.promptDiff.promptExcerpt.candidate} />
          </div>
        </section>

        {/* 8) Benchmark recommendation */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold">Benchmark recommendation</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">Cost vs quality guidance for the next automated run.</div>
          </div>

          <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-4">
            <div className="rounded-md border border-white/10 bg-black/10 p-4">
              <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Recommendation</div>
              <div className="mt-2 text-sm text-white/85 leading-6">{overview.benchmark.primaryRecommendation}</div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide">Cheapest acceptable</div>
                  <div className="mt-1 text-sm text-white/80">{overview.benchmark.cheapestAcceptable}</div>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide">Highest quality</div>
                  <div className="mt-1 text-sm text-white/80">{overview.benchmark.highestQuality}</div>
                </div>
              </div>
              <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide">Balanced recommendation</div>
                <div className="mt-1 text-sm text-white/80">{overview.benchmark.balancedRecommendation}</div>
              </div>
            </div>

            <div className="rounded-md border border-white/10 bg-black/10 p-4">
              <div className="text-[12px] font-semibold">Decision payload (mock)</div>
              <div className="mt-2">
                <JsonViewer value={overview.decision} />
              </div>
            </div>
          </div>
        </section>

        {/* 9) Release timeline preview */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold">Release timeline preview</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">Operational history: prompts, regressions, decisions.</div>
          </div>
          <div className="p-4 space-y-2">
            {overview.timeline.map((t) => (
              <TimelineItem key={t.time + t.title} time={t.time} title={t.title} description={t.description} tone={t.tone ?? "default"} />
            ))}
          </div>
        </section>

        {/* 10) Why was this release blocked? evidence chain (explicit) */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold">Why this release was blocked</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">Measurable evidence chain; confidence-aware and segment-specific.</div>
          </div>
          <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-4">
            <div className="rounded-md border border-white/10 bg-black/10 p-4">
              <div className="text-[12px] font-semibold">Release blocked because</div>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                {overview.evidenceChain.map((e) => (
                  <li key={e.metric} className="flex gap-3 items-start">
                    <span className="pt-0.5">
                      <SeverityPill severity={e.severity} />
                    </span>
                    <span className="leading-6">{e.statement}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-white/10 bg-black/10 p-4">
              <div className="text-[12px] font-semibold">Operational interpretation</div>
              <div className="mt-2 text-sm text-white/70 leading-6">
                This release is blocked because Telugu quality regressed and hallucination rate increased, and the affected evidence
                concentrates in Telugu/WhatsApp copy with additional formatting compliance failures.
              </div>
              <div className="mt-4">
                <Link href="/history" className="text-[11px] text-[var(--info)] hover:underline">
                  Inspect historical runs and confirm regressions
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
