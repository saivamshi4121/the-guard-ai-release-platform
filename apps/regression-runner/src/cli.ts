import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { readFile } from "node:fs/promises";
import pc from "picocolors";
import { prisma } from "@the-guard/db";
import { analyzeAndPersistRegression } from "@the-guard/regression";
import { parseArgs } from "./args.js";
import { formatHumanSummary, formatMarkdownSummary } from "./format.js";
import { loadEnv } from "./env.js";

async function ensureDirForFile(path: string) {
  await mkdir(dirname(path), { recursive: true });
}

function defaultLabel(runId: string): string {
  return `Run ${runId}`;
}

async function main() {
  const env = loadEnv(process.env);
  const args = parseArgs(process.argv.slice(2));

  // Safe demo mode: deterministic report from disk; no analysis/sweeps.
  if (env.ENABLE_DEMO_MODE) {
    const raw = await readFile(env.DEMO_REGRESSION_REPORT_PATH, "utf8");
    const report = JSON.parse(raw);
    const human = formatHumanSummary({ report, baselineLabel: "Demo Baseline", candidateLabel: "Demo Candidate" } as any);
    console.log(human);
    if (args.json) {
      await ensureDirForFile(args.json);
      await writeFile(args.json, JSON.stringify(report, null, 2), "utf8");
      console.log(pc.dim(`\nWrote JSON: ${args.json}`));
    }
    if (args.markdown) {
      await ensureDirForFile(args.markdown);
      await writeFile(args.markdown, formatMarkdownSummary({ report, baselineLabel: "Demo Baseline", candidateLabel: "Demo Candidate" } as any), "utf8");
      console.log(pc.dim(`Wrote Markdown: ${args.markdown}`));
    }
    process.exitCode = report?.decision?.verdict === "NO_GO" ? 1 : report?.decision?.verdict === "INCONCLUSIVE" ? 2 : 0;
    return;
  }

  const reportId = crypto.randomUUID();

  // Labels: try to include provider/model from eval_runs.model_config.
  const baselineRun = await (prisma as any).eval_runs.findUnique({
    where: { id: args.baseline },
    select: { model_config: true, prompt_version_id: true },
  });
  const candidateRun = await (prisma as any).eval_runs.findUnique({
    where: { id: args.candidate },
    select: { model_config: true, prompt_version_id: true },
  });

  const baselineLabel =
    baselineRun?.model_config?.model && baselineRun?.model_config?.provider
      ? `${baselineRun.model_config.model} (${baselineRun.model_config.provider})`
      : defaultLabel(args.baseline);
  const candidateLabel =
    candidateRun?.model_config?.model && candidateRun?.model_config?.provider
      ? `${candidateRun.model_config.model} (${candidateRun.model_config.provider})`
      : defaultLabel(args.candidate);

  const { verdict } = await analyzeAndPersistRegression({
    prisma: prisma as any,
    baselineRunId: args.baseline,
    candidateRunId: args.candidate,
    reportId,
  });

  // Load persisted report back for display (keeps output consistent with artifacts).
  const reportRow = await (prisma as any).regression_reports.findUnique({
    where: { id: reportId },
    select: { comparison_json: true, verdict: true, severity: true, summary: true },
  });

  // Fallback: if persistence isn't available, we still output a minimal verdict.
  if (!reportRow) {
    console.log(pc.bold("THE GUARD RELEASE ANALYSIS"));
    console.log(`Baseline: ${baselineLabel}`);
    console.log(`Candidate: ${candidateLabel}`);
    console.log(`Result: ${verdict}`);
    process.exitCode = verdict === "NO_GO" ? 1 : verdict === "INCONCLUSIVE" ? 2 : 0;
    return;
  }

  const report = {
    id: reportId,
    baselineRunId: args.baseline,
    candidateRunId: args.candidate,
    createdAt: new Date().toISOString(),
    comparisons: reportRow.comparison_json?.comparisons ?? [],
    findings: reportRow.comparison_json?.findings ?? [],
    worstExamples: [],
    biggestDrops: reportRow.comparison_json?.biggestDrops ?? [],
    decision: {
      verdict: reportRow.verdict,
      reasons: String(reportRow.summary ?? "").split(" | ").filter(Boolean),
      severity: reportRow.severity,
    },
  } as any;

  const human = formatHumanSummary({ report, baselineLabel, candidateLabel });
  console.log(human);

  if (args.json) {
    await ensureDirForFile(args.json);
    await writeFile(args.json, JSON.stringify(report, null, 2), "utf8");
    console.log(pc.dim(`\nWrote JSON: ${args.json}`));
  }
  if (args.markdown) {
    await ensureDirForFile(args.markdown);
    await writeFile(args.markdown, formatMarkdownSummary({ report, baselineLabel, candidateLabel }), "utf8");
    console.log(pc.dim(`Wrote Markdown: ${args.markdown}`));
  }

  process.exitCode = verdict === "NO_GO" ? 1 : verdict === "INCONCLUSIVE" ? 2 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

