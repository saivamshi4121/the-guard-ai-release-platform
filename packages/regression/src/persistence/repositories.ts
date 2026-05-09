import type { PrismaClientLike } from "@the-guard/db";
import type { RegressionReport } from "../types.js";

export type RegressionReportsRepository = {
  createReport: (report: RegressionReport & { promptDiffSummary?: string | null }) => Promise<void>;
};

export function createRegressionReportsRepository(prisma: PrismaClientLike): RegressionReportsRepository {
  return {
    async createReport(report) {
      await (prisma as any).regression_reports.create({
        data: {
          id: report.id,
          baseline_run_id: report.baselineRunId,
          candidate_run_id: report.candidateRunId,
          verdict: report.decision.verdict,
          severity: report.decision.severity,
          summary: report.decision.reasons.join(" | ").slice(0, 500),
          comparison_json: {
            comparisons: report.comparisons,
            findings: report.findings,
            biggestDrops: report.biggestDrops,
          },
          prompt_diff_summary: report.promptDiffSummary ?? null,
        },
      });

      for (const ex of report.worstExamples) {
        await (prisma as any).regression_examples.create({
          data: {
            report_id: report.id,
            case_id: ex.caseId,
            metric: ex.metric,
            segment: ex.segment,
            baseline_output: ex.baselineOutput ?? null,
            candidate_output: ex.candidateOutput ?? null,
            baseline_score: ex.baselineScore ?? null,
            candidate_score: ex.candidateScore ?? null,
            delta: ex.delta ?? null,
          },
        });
      }
    },
  };
}

