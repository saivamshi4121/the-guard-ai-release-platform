import type { PrismaClientLike } from "@the-guard/db";
import type { BenchmarkMatrix, RunBenchmarkRow } from "./types.js";

function avg(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * ModelBenchmarkAnalyzer compares quality vs cost vs latency across eval runs.
 *
 * Practical design:
 * - uses persisted eval_outputs (latency/cost) and eval_scores (values/passed)
 * - does not require any additional data pipelines
 */
export class ModelBenchmarkAnalyzer {
  async analyze(
    prisma: PrismaClientLike,
    runIds: string[],
    opts?: { enableSweeps?: boolean; maxRuns?: number },
  ): Promise<BenchmarkMatrix> {
    const enableSweeps = Boolean(opts?.enableSweeps);
    const maxRuns = opts?.maxRuns ?? 10;

    if (runIds.length > maxRuns) {
      throw new Error(`Benchmark run blocked: ${runIds.length} runs exceeds MAX_CASES_PER_RUN-like cap (${maxRuns}).`);
    }
    if (!enableSweeps && runIds.length > 1) {
      throw new Error("Benchmark sweeps disabled in safe mode.");
    }

    const rows: RunBenchmarkRow[] = [];

    for (const runId of runIds) {
      const run = await (prisma as any).eval_runs.findUnique({ where: { id: runId }, select: { task_type: true, model_config: true } });
      const outputs = await (prisma as any).eval_outputs.findMany({ where: { run_id: runId }, select: { latency_ms: true, cost: true } });
      const scores = await (prisma as any).eval_scores.findMany({ where: { run_id: runId }, select: { value: true, passed: true, case_id: true, scorer_id: true } });

      const provider = run?.model_config?.provider ?? "unknown";
      const model = run?.model_config?.model ?? "unknown";

      const avgLatencyMs = avg(outputs.map((o: any) => o.latency_ms ?? 0));
      const totalCostUsd = outputs.reduce((acc: number, o: any) => acc + (o.cost?.totalCost ?? 0), 0);

      // Per-case "all passed" based on scores
      const byCase: Record<string, boolean[]> = {};
      for (const s of scores) {
        byCase[s.case_id] ??= [];
        byCase[s.case_id].push(Boolean(s.passed));
      }
      const caseIds = Object.keys(byCase);
      const passAllCount = caseIds.filter((cid) => (byCase[cid] ?? []).every(Boolean)).length;
      const passRateAll = caseIds.length ? passAllCount / caseIds.length : 0;

      // Avg score: average of numeric scorer values across all rows (simple baseline)
      const avgScore = avg(scores.map((s: any) => Number(s.value ?? 0)));

      const costPerSuccessfulEvalUsd = passAllCount > 0 ? totalCostUsd / passAllCount : totalCostUsd;

      rows.push({
        runId,
        provider,
        model,
        taskType: run?.task_type ?? null,
        passRateAll,
        avgScore,
        avgLatencyMs,
        totalCostUsd,
        costPerSuccessfulEvalUsd,
      });
    }

    return {
      rows,
      recommendations: new BenchmarkRecommendationEngine().recommend(rows),
    };
  }
}

export class BenchmarkRecommendationEngine {
  recommend(rows: RunBenchmarkRow[]): Array<{ text: string; metadata?: Record<string, unknown> }> {
    if (rows.length < 2) return [];

    // Simple practical heuristic: pick cheapest run among those within 2% of best passRateAll.
    const bestPass = Math.max(...rows.map((r) => r.passRateAll));
    const nearBest = rows.filter((r) => r.passRateAll >= bestPass - 0.02);
    nearBest.sort((a, b) => a.costPerSuccessfulEvalUsd - b.costPerSuccessfulEvalUsd);
    const winner = nearBest[0];
    if (!winner) return [];

    const best = rows.find((r) => r.passRateAll === bestPass) ?? winner;
    if (winner.runId !== best.runId) {
      return [
        {
          text: `Use ${winner.model} for cost efficiency (lowest cost per successful eval) with only ${(bestPass - winner.passRateAll) * 100}% pass-rate reduction vs best.`,
          metadata: { winnerRunId: winner.runId, bestRunId: best.runId },
        },
      ];
    }

    return [
      {
        text: `Use ${winner.model} (${winner.provider}) as the default: best pass rate with strong cost efficiency.`,
        metadata: { runId: winner.runId },
      },
    ];
  }
}

