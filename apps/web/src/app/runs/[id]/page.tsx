import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { EmptyState } from "@/components/ui/EmptyState";
import { mockRunDetail } from "@/lib/mock/data";

export default async function RunDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const run = mockRunDetail[id];
  if (!run) return notFound();

  return (
    <AppShell
      title={`Run ${id}`}
      right={
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-[var(--muted)]">{run.provider}</div>
          <StatusBadge status={run.status} />
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard label="Avg latency" value={`${run.latencyMsAvg} ms`} hint="eval_outputs.latency_ms" />
          <MetricCard label="Total cost" value={`$${run.totalCostUsd.toFixed(4)}`} hint="estimated" />
          <MetricCard label="Tokens" value={`${run.tokenUsage.input + run.tokenUsage.output}`} hint="input + output" />
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="text-sm font-semibold">Scorers</div>
              <div className="text-[11px] text-[var(--muted)]">Per-scorer values and pass/fail.</div>
            </div>
            <div className="p-4 space-y-2">
              {run.scores.map((s) => (
                <div key={s.scorer} className="flex items-center justify-between">
                  <div className="text-sm text-white/80">{s.scorer}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-[11px] text-[var(--muted)]">{s.value.toFixed(3)}</div>
                    <StatusBadge status={s.passed ? "GO" : "NO_GO"} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="text-sm font-semibold">Outputs</div>
              <div className="text-[11px] text-[var(--muted)]">Case outputs for review.</div>
            </div>
            <div className="p-4 space-y-3">
              {run.outputs.length === 0 ? (
                <EmptyState title="No outputs" description="This run has no generated outputs in the mock layer." />
              ) : (
                run.outputs.map((o) => (
                  <div key={o.caseName} className="rounded-md border border-white/10 bg-black/10 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{o.caseName}</div>
                      <StatusBadge status={o.verdict} />
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--muted)]">
                      {o.language} • {o.channel}
                    </div>
                    <div className="mt-2 text-sm text-white/80">{o.outputText}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="text-sm font-semibold mb-2">Run payload (mock)</div>
          <JsonViewer value={run} />
        </section>
      </div>
    </AppShell>
  );
}

