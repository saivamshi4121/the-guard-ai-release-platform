import type { PrismaClientLike } from "@the-guard/db";
import { PromptDiffAnalyzer } from "../prompt/promptDiffAnalyzer.js";
import { ReleaseDecisionEngine } from "./releaseDecisionEngine.js";
import { RegressionAnalyzer } from "./regressionAnalyzer.js";
import { loadRunSnapshot } from "./runSnapshotLoader.js";
import { RegressionPersistenceService } from "../persistence/service.js";

/**
 * One-call workflow for production release comparisons.
 * Keeps orchestration explicit and testable.
 */
export async function analyzeAndPersistRegression(args: {
  prisma: PrismaClientLike;
  baselineRunId: string;
  candidateRunId: string;
  reportId: string;
  promptBaseline?: { template: string };
  promptCandidate?: { template: string };
}): Promise<{ reportId: string; verdict: "GO" | "NO_GO" | "INCONCLUSIVE" }> {
  const baseline = await loadRunSnapshot(args.prisma, args.baselineRunId);
  const candidate = await loadRunSnapshot(args.prisma, args.candidateRunId);

  const analyzer = new RegressionAnalyzer();
  const report = analyzer.analyze({ baseline, candidate, reportId: args.reportId });

  const decisionEngine = new ReleaseDecisionEngine();
  const decision = decisionEngine.decide(report);
  report.decision = decision;

  const promptDiff =
    args.promptBaseline && args.promptCandidate
      ? new PromptDiffAnalyzer().diff(args.promptBaseline.template, args.promptCandidate.template).summary
      : null;

  const persistence = new RegressionPersistenceService(args.prisma);
  await persistence.persist({ ...report, promptDiffSummary: promptDiff });

  return { reportId: report.id, verdict: decision.verdict };
}

