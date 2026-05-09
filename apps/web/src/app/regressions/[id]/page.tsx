import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { SeverityPill } from "@/components/ui/SeverityPill";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DeltaMetric } from "@/components/ui/DeltaMetric";
import { EmptyState } from "@/components/ui/EmptyState";
import { TimelineItem } from "@/components/timeline/TimelineItem";
import { GitDiffBlock } from "@/components/ui/GitDiffBlock";
import { HallucinationTracePanel } from "@/components/hallucination/HallucinationTracePanel";
import { mockRegressionDetails } from "@/lib/mock/data";
import type { RegressionDetailMock, RegressionFailingExample, RegressionMetricRow, SegmentBreakdownRow } from "@/lib/mock/types";

export default async function RegressionDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const report = mockRegressionDetails[id] as RegressionDetailMock | undefined;
  if (!report) return notFound();

  const metricColumns: Column<RegressionMetricRow>[] = [
    { key: "metric", header: "Metric", cell: (m) => <span className="text-white/85 font-medium">{m.label}</span> },
    { key: "baseline", header: "Baseline", cell: (m) => <span className="text-[11px] font-mono tabular-nums text-white/75">{m.baseline.toFixed(3)}</span> },
    { key: "candidate", header: "Candidate", cell: (m) => <span className="text-[11px] font-mono tabular-nums text-white/75">{m.candidate.toFixed(3)}</span> },
    {
      key: "delta",
      header: "Delta",
      cell: (m) => (
        <DeltaMetric
          baseline={m.baseline}
          candidate={m.candidate}
          polarity={m.polarity}
          thresholds={m.severity === "BLOCKER" ? { warn: 0.02, blocker: 0.05 } : { warn: 0.03, blocker: 0.08 }}
          className="w-[280px]"
        />
      ),
    },
    {
      key: "stats",
      header: "Stats",
      cell: (m) =>
        m.stats ? (
          <details className="text-[11px] text-white/70">
            <summary className="cursor-pointer text-[color:var(--info)] hover:underline">p={m.stats.pValue.toFixed(3)} CI</summary>
            <div className="mt-1 leading-5">
              95% CI [{m.stats.ci95.low.toFixed(3)}, {m.stats.ci95.high.toFixed(3)}]
              <div className="text-white/60 mt-1">{m.stats.methodology}</div>
            </div>
          </details>
        ) : (
          <span className="text-[11px] text-[var(--muted)]">—</span>
        ),
    },
  ];

  const segmentColumns: Column<SegmentBreakdownRow>[] = [
    { key: "segment", header: "Segment", cell: (s) => <span className="text-white/85">{s.segment}</span> },
    { key: "baseline", header: "Baseline", cell: (s) => <span className="text-[11px] font-mono tabular-nums text-white/75">{s.baseline.toFixed(3)}</span> },
    { key: "candidate", header: "Candidate", cell: (s) => <span className="text-[11px] font-mono tabular-nums text-white/75">{s.candidate.toFixed(3)}</span> },
    { key: "severity", header: "Severity", cell: (s) => <SeverityPill severity={s.severity} /> },
    { key: "notes", header: "Notes", cell: (s) => <span className="text-[11px] text-white/65">{s.notes ?? ""}</span> },
  ];

  return (
    <AppShell
      title={`Regression ${id}`}
      right={
        <div className="flex items-center gap-2">
          <SeverityPill severity={report.severity} />
          <StatusBadge status={report.verdict} />
        </div>
      }
    >
      <div className="space-y-6">
        {/* 1) Regression summary */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold">Regression summary</div>
            <div className="text-[11px] text-[var(--muted)]">{report.createdAt}</div>
          </div>
          <div className="p-4 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
            <div className="rounded-md border border-white/10 bg-black/10 p-4">
              <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Verdict</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {report.verdict === "NO_GO" ? "❌ RELEASE BLOCKED" : report.verdict === "GO" ? "✅ GO" : "⚠️ INCONCLUSIVE"}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <SeverityPill severity={report.severity} />
                <span className="text-[11px] text-white/70">Confidence {report.summary.confidence}</span>
              </div>
              <div className="mt-3 text-[12px] text-white/70 leading-6">
                Key regression CI (95%): [{report.summary.keyCi95.low.toFixed(2)}, {report.summary.keyCi95.high.toFixed(2)}] • p={report.summary.keyPValue.toFixed(3)}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-[11px] text-[color:var(--info)] hover:underline">Methodology</summary>
                <div className="mt-2 text-[12px] text-white/70 leading-6">{report.summary.methodology}</div>
              </details>
            </div>

            <div className="rounded-md border border-white/10 bg-black/10 p-4">
              <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Runs compared</div>
              <div className="mt-2">
                <div className="text-[12px] text-[var(--muted)]">Baseline</div>
                <div className="text-sm text-white/85">{report.baselineLabel}</div>
                <div className="text-[12px] text-[var(--muted)] mt-3">Candidate</div>
                <div className="text-sm text-white/85">{report.candidateLabel}</div>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-[11px] text-[color:var(--info)] hover:underline">Technical IDs</summary>
                <div className="mt-2 text-[11px] font-mono text-white/70">
                  baselineRunId: {report.technical.baselineRunId}
                  <br />
                  candidateRunId: {report.technical.candidateRunId}
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* 2) Metric comparison table */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold">Metric comparison</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">Baseline vs candidate vs delta with statistical details.</div>
          </div>
          <div className="p-4">
            <DataTable columns={metricColumns} rows={report.metrics} getRowKey={(m) => m.key} />
          </div>
        </section>

        {/* 5) Segment-aware breakdown */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold">Segment breakdown</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">Telugu regressions, WhatsApp failures, and push compliance visibility.</div>
          </div>
          <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div>
              <div className="text-[12px] font-semibold mb-2">Language</div>
              <DataTable columns={segmentColumns} rows={report.segmentBreakdown.language} getRowKey={(r) => r.segment} />
            </div>
            <div>
              <div className="text-[12px] font-semibold mb-2">Channel</div>
              <DataTable columns={segmentColumns} rows={report.segmentBreakdown.channel} getRowKey={(r) => r.segment} />
            </div>
            <div>
              <div className="text-[12px] font-semibold mb-2">Category</div>
              <DataTable columns={segmentColumns} rows={report.segmentBreakdown.category} getRowKey={(r) => r.segment} />
            </div>
          </div>
        </section>

        {/* 3) Failing examples viewer */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold">Failing examples</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">Input, baseline vs candidate outputs, failed scorers, and hallucination traces.</div>
          </div>
          <div className="p-4 space-y-4">
            {report.failingExamples.length === 0 ? (
              <EmptyState title="No failing examples" description="No examples were persisted for this regression report." />
            ) : (
              report.failingExamples.map((ex: RegressionFailingExample) => (
                <div key={ex.caseName} className="rounded-lg border border-white/10 bg-black/10">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{ex.caseName}</div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5">
                        {ex.merchant} • {ex.language} • {ex.channel} • {ex.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ex.language === "Telugu" ? <SeverityPill severity="BLOCKER" /> : <SeverityPill severity="WARN" />}
                      <StatusBadge status="NO_GO" />
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-[12px] font-semibold">Input</div>
                        <div className="mt-2">
                          <JsonViewer value={ex.input} />
                        </div>
                      </div>
                      <div className="rounded-md border border-white/10 bg-white/5 p-3">
                        <div className="text-[12px] font-semibold">Failed scorers</div>
                        <div className="mt-2 text-[11px] text-white/70 font-mono">{ex.failedScorers.join(", ")}</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="rounded-md border border-white/10 bg-white/5 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Baseline output</div>
                          <div className="mt-2 text-sm text-white/85 whitespace-pre-wrap">{ex.baselineOutput}</div>
                        </div>
                        <div className="rounded-md border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/10 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Candidate output</div>
                          <div className="mt-2 text-sm text-white/90 whitespace-pre-wrap">{ex.candidateOutput}</div>
                        </div>
                      </div>

                      {/* 4) Hallucination trace visualization */}
                      <HallucinationTracePanel traces={ex.hallucinationTraces} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 6) Prompt diff viewer (git-style) */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold">Prompt diff</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">Git-style diff formatting with risk summary.</div>
          </div>
          <div className="p-4 space-y-3">
            <div className="rounded-md border border-white/10 bg-black/10 p-3">
              <div className="text-[12px] font-semibold">Risk summary</div>
              <div className="mt-1 text-sm text-white/80">{report.promptDiff.riskSummary}</div>
              <div className="mt-2 text-[11px] text-white/70">Impacted: {report.promptDiff.impactedMetrics.join(", ")}</div>
            </div>
            <GitDiffBlock fileLabel={report.promptDiff.fileLabel} baseline={report.promptDiff.baseline} candidate={report.promptDiff.candidate} />
          </div>
        </section>

        {/* 7) Timeline */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold">Timeline</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">When regression was introduced and what changed.</div>
          </div>
          <div className="p-4 space-y-2">
            {report.timeline.map((t) => (
              <TimelineItem
                key={`${t.time}:${t.title}`}
                time={t.time}
                title={t.title}
                description={t.description}
                tone={t.tone}
                right={
                  <div className="flex items-center gap-2">
                    {t.promptVersion ? <span className="text-[11px] font-mono text-white/60">{t.promptVersion}</span> : null}
                    {t.commit ? <span className="text-[11px] font-mono text-white/60">{t.commit}</span> : null}
                  </div>
                }
              />
            ))}
          </div>
        </section>

        {/* 8) Expandable technical details */}
        <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold">Technical details</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">Raw payloads for debugging and audit.</div>
          </div>
          <div className="p-4 space-y-3">
            <details className="rounded-md border border-white/10 bg-black/10 p-3">
              <summary className="cursor-pointer text-sm font-semibold">Report JSON</summary>
              <div className="mt-3">
                <JsonViewer value={report.technical.reportJson} />
              </div>
            </details>
            <details className="rounded-md border border-white/10 bg-black/10 p-3">
              <summary className="cursor-pointer text-sm font-semibold">Full mock object</summary>
              <div className="mt-3">
                <JsonViewer value={report as unknown as Record<string, unknown>} />
              </div>
            </details>
            <div className="text-[11px] text-white/60">
              Tip: use this page during reviewer demos to trace decisions from metrics → examples → claims → prompt diffs.
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

