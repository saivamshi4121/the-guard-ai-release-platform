import { AppShell } from "@/components/shell/AppShell";
import { TimelineItem } from "@/components/timeline/TimelineItem";
import { SeverityPill } from "@/components/ui/SeverityPill";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ChartCard } from "@/components/charts/ChartCard";
import { HistoryTrendsChart } from "@/components/charts/HistoryTrendsChart";
import { PromptLineageGraph } from "@/components/history/PromptLineageGraph";
import { mockReleaseHistory } from "@/lib/mock/data";

export default function HistoryPage() {
  const history = mockReleaseHistory;

  return (
    <AppShell title="History">
      <div className="space-y-6">
        <div>
          <div className="text-sm font-semibold">Release history & timeline</div>
          <div className="text-[12px] text-[var(--muted)]">Operational log of releases, regressions, recoveries, prompt changes, and rollbacks.</div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <section className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)]">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="text-sm font-semibold">Timeline</div>
              <div className="text-[11px] text-[var(--muted)] mt-0.5">Compact event stream for investigation workflows.</div>
            </div>
            <div className="p-4 space-y-2">
              {history.events.map((e) => (
                <TimelineItem
                  key={e.id}
                  time={e.time}
                  title={e.title}
                  description={e.description}
                  tone={e.severity === "BLOCKER" ? "danger" : e.severity === "WARN" ? "warn" : "default"}
                  right={
                    <div className="flex items-center gap-2">
                      <SeverityPill severity={e.severity} />
                      <StatusBadge status={e.verdict} />
                    </div>
                  }
                />
              ))}
            </div>
          </section>

          <ChartCard title="Trends" subtitle="Regression frequency, hallucination rate, Telugu quality">
            <HistoryTrendsChart trends={history.trends} />
          </ChartCard>
        </div>

        <PromptLineageGraph nodes={history.promptLineage} />
      </div>
    </AppShell>
  );
}

