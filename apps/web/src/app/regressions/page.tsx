import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SeverityPill } from "@/components/ui/SeverityPill";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockRegressionReports } from "@/lib/mock/data";
import type { RegressionReportSummary } from "@/lib/mock/types";

export default function RegressionsIndexPage() {
  const columns: Column<RegressionReportSummary>[] = [
    {
      key: "id",
      header: "Report",
      cell: (r) => (
        <Link href={`/regressions/${r.id}`} className="text-[color:var(--info)] hover:underline">
          {r.id}
        </Link>
      ),
    },
    { key: "createdAt", header: "Created", cell: (r) => <span className="text-[11px] text-[var(--muted)]">{r.createdAt}</span> },
    { key: "baseline", header: "Baseline", cell: (r) => <span className="text-white/80">{r.baselineLabel}</span> },
    { key: "candidate", header: "Candidate", cell: (r) => <span className="text-white/80">{r.candidateLabel}</span> },
    { key: "severity", header: "Severity", cell: (r) => <SeverityPill severity={r.severity} /> },
    { key: "verdict", header: "Verdict", cell: (r) => <StatusBadge status={r.verdict} /> },
  ];

  return (
    <AppShell title="Regressions">
      <div className="space-y-4">
        <div>
          <div className="text-sm font-semibold">Regression reports</div>
          <div className="text-[12px] text-[var(--muted)]">Baseline vs candidate comparisons with significance and examples.</div>
        </div>
        <DataTable columns={columns} rows={mockRegressionReports} getRowKey={(r) => r.id} />
      </div>
    </AppShell>
  );
}

