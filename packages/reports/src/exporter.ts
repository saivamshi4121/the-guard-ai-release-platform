import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RegressionReport } from "@the-guard/regression";
import type { BenchmarkMatrix } from "@the-guard/benchmark";

async function ensureDir(path: string) {
  await mkdir(dirname(path), { recursive: true });
}

/**
 * Canonical, deterministic report exports for CI artifacts.
 *
 * Architectural decision:
 * - Filesystem artifacts are the primary interface for CI portability.
 * - DB persistence remains optional for long-term history.
 */
export class ReportExportService {
  async exportJson(path: string, obj: unknown): Promise<void> {
    await ensureDir(path);
    await writeFile(path, JSON.stringify(obj, null, 2) + "\n", "utf8");
  }

  async exportMarkdown(path: string, markdown: string): Promise<void> {
    await ensureDir(path);
    await writeFile(path, markdown.trimEnd() + "\n", "utf8");
  }

  regressionMarkdown(report: RegressionReport): string {
    const verdict =
      report.decision.verdict === "GO" ? "✅ GO" : report.decision.verdict === "NO_GO" ? "❌ NO-GO" : "⚠️ INCONCLUSIVE";

    const topDrops = report.biggestDrops.slice(0, 10);
    const topExamples = report.worstExamples.slice(0, 5);

    return [
      "## The Guard Regression Report",
      "",
      `**Baseline run:** \`${report.baselineRunId}\``,
      `**Candidate run:** \`${report.candidateRunId}\``,
      "",
      `**Verdict:** ${verdict}`,
      "",
      "### Reasons",
      ...report.decision.reasons.map((r) => `- ${r}`),
      "",
      "### Biggest significant drops",
      ...(topDrops.length
        ? topDrops.map((c) => `- \`${c.metric}\` in \`${c.segment}\`: Δ ${(c.delta * 100).toFixed(2)}pp (p=${c.pValue.toFixed(3)}, n=${c.n})`)
        : ["- None"]),
      "",
      "### Worst examples",
      ...(topExamples.length
        ? topExamples.map((e) => `- **${e.caseName}** (\`${e.metric}\`, Δ ${((e.delta ?? 0) * 100).toFixed(2)}pp)`)
        : ["- None"]),
      "",
    ].join("\n");
  }

  benchmarkMarkdown(matrix: BenchmarkMatrix): string {
    const header = ["| runId | provider | model | passRateAll | avgScore | avgLatencyMs | totalCostUsd | costPerSuccessUsd |", "|---|---|---:|---:|---:|---:|---:|---:|"];
    const rows = matrix.rows.map((r) => {
      return `| \`${r.runId}\` | ${r.provider} | ${r.model} | ${(r.passRateAll * 100).toFixed(1)}% | ${r.avgScore.toFixed(3)} | ${r.avgLatencyMs.toFixed(0)} | $${r.totalCostUsd.toFixed(4)} | $${r.costPerSuccessfulEvalUsd.toFixed(4)} |`;
    });

    return [
      "## The Guard Benchmark Report",
      "",
      ...header,
      ...rows,
      "",
      "### Recommendations",
      ...(matrix.recommendations.length ? matrix.recommendations.map((r) => `- ${r.text}`) : ["- None"]),
      "",
    ].join("\n");
  }
}

