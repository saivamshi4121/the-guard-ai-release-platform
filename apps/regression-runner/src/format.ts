import pc from "picocolors";
import type { RegressionReport } from "@the-guard/regression";

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

export function formatHumanSummary(args: {
  report: RegressionReport;
  baselineLabel: string;
  candidateLabel: string;
}): string {
  const { report, baselineLabel, candidateLabel } = args;
  const verdict =
    report.decision.verdict === "GO"
      ? pc.green("✅ GO")
      : report.decision.verdict === "NO_GO"
        ? pc.red("❌ NO-GO")
        : pc.yellow("⚠️ INCONCLUSIVE");

  const lines: string[] = [];
  lines.push("═══════════════════════════");
  lines.push("THE GUARD RELEASE ANALYSIS");
  lines.push("═══════════════════════════");
  lines.push("");
  lines.push(pc.bold("Baseline:"));
  lines.push(baselineLabel);
  lines.push("");
  lines.push(pc.bold("Candidate:"));
  lines.push(candidateLabel);
  lines.push("");
  lines.push(pc.bold("Result:"));
  lines.push(verdict);
  lines.push("");
  lines.push(pc.bold("Reasons:"));
  for (const r of report.decision.reasons) lines.push(`- ${r}`);

  // Confidence: use 95% when key findings are significant; otherwise "n/a"
  const sig = report.comparisons.filter((c) => c.isSignificant && c.delta < 0);
  lines.push("");
  lines.push(pc.bold("Confidence:"));
  lines.push(sig.length ? "95%" : "n/a");

  if (report.worstExamples.length) {
    lines.push("");
    lines.push(pc.bold("Top failing examples:"));
    for (const ex of report.worstExamples.slice(0, 5)) {
      const delta = ex.delta ?? 0;
      lines.push(`- ${ex.caseName} (${ex.metric}, Δ ${pct(delta)})`);
    }
  }

  return lines.join("\n");
}

export function formatMarkdownSummary(args: {
  report: RegressionReport;
  baselineLabel: string;
  candidateLabel: string;
}): string {
  const { report, baselineLabel, candidateLabel } = args;
  const verdict =
    report.decision.verdict === "GO"
      ? "✅ GO"
      : report.decision.verdict === "NO_GO"
        ? "❌ NO-GO"
        : "⚠️ INCONCLUSIVE";

  const sigDrops = report.biggestDrops.slice(0, 10);

  return [
    "## The Guard Release Analysis",
    "",
    `**Baseline:** ${baselineLabel}`,
    `**Candidate:** ${candidateLabel}`,
    "",
    `**Result:** ${verdict}`,
    "",
    "### Reasons",
    ...report.decision.reasons.map((r) => `- ${r}`),
    "",
    "### Biggest significant drops",
    ...(sigDrops.length
      ? sigDrops.map((c) => `- \`${c.metric}\` in \`${c.segment}\`: Δ ${(c.delta * 100).toFixed(2)}pp (p=${c.pValue.toFixed(3)}, n=${c.n})`)
      : ["- None"]),
    "",
    "### Worst examples",
    ...(report.worstExamples.length
      ? report.worstExamples.slice(0, 5).map((e) => `- **${e.caseName}** (\`${e.metric}\`, Δ ${(e.delta ?? 0) * 100}pp)`)
      : ["- None"]),
    "",
  ].join("\n");
}

