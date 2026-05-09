import type { PrismaClientLike } from "@the-guard/db";
import { ProviderError } from "@the-guard/llm";

export type CostGuardLimits = {
  maxRunCostUsd: number;
  maxDailyCostUsd: number;
};

export type CostProjection = {
  currentRunUsd: number;
  projectedNextCallUsd: number;
  projectedRunTotalUsd: number;
  maxRunCostUsd: number;
  maxDailyCostUsd: number;
  currentDailyUsd: number;
};

/**
 * CostGuardService enforces hard USD limits.
 *
 * Practical approach:
 * - Track current run cost from persisted eval_outputs.cost.totalCost
 * - Track daily spend from eval_outputs for the current UTC day
 * - Require caller to provide projectedNextCallUsd prior to calling the provider
 */
export class CostGuardService {
  constructor(private readonly prisma: PrismaClientLike, private readonly limits: CostGuardLimits) {}

  async getCurrentRunUsd(runId: string): Promise<number> {
    const outputs = await (this.prisma as any).eval_outputs.findMany({ where: { run_id: runId }, select: { cost: true } });
    return outputs.reduce((acc: number, o: any) => acc + (o.cost?.totalCost ?? 0), 0);
  }

  async getCurrentDailyUsd(): Promise<number> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const outputs = await (this.prisma as any).eval_outputs.findMany({
      where: { created_at: { gte: start } },
      select: { cost: true },
    });
    return outputs.reduce((acc: number, o: any) => acc + (o.cost?.totalCost ?? 0), 0);
  }

  async project(args: { runId: string; projectedNextCallUsd: number; caseId?: string | null }): Promise<CostProjection> {
    const [currentRunUsd, currentDailyUsd] = await Promise.all([this.getCurrentRunUsd(args.runId), this.getCurrentDailyUsd()]);
    const projectedRunTotalUsd = currentRunUsd + args.projectedNextCallUsd;

    // Persist projection for observability (best-effort).
    try {
      await (this.prisma as any).projected_costs.create({
        data: {
          run_id: args.runId,
          case_id: args.caseId ?? null,
          projected_usd: projectedRunTotalUsd,
          limit_usd: this.limits.maxRunCostUsd,
          metadata: {
            currentRunUsd,
            projectedNextCallUsd: args.projectedNextCallUsd,
            currentDailyUsd,
            maxDailyCostUsd: this.limits.maxDailyCostUsd,
          },
        },
      });
    } catch {
      // ignore
    }

    return {
      currentRunUsd,
      projectedNextCallUsd: args.projectedNextCallUsd,
      projectedRunTotalUsd,
      maxRunCostUsd: this.limits.maxRunCostUsd,
      maxDailyCostUsd: this.limits.maxDailyCostUsd,
      currentDailyUsd,
    };
  }

  async assertWithinLimits(args: { runId: string; projectedNextCallUsd: number; caseId?: string | null }): Promise<void> {
    const proj = await this.project(args);
    const projectedDaily = proj.currentDailyUsd + proj.projectedNextCallUsd;

    if (proj.projectedRunTotalUsd > proj.maxRunCostUsd) {
      const msg = `Run aborted: projected cost ($${proj.projectedRunTotalUsd.toFixed(2)}) exceeds MAX_RUN_COST_USD ($${proj.maxRunCostUsd.toFixed(2)}).`;
      await this.persistAbort(args.runId, "RUN_COST_LIMIT", msg, proj);
      throw new ProviderError(msg, { code: "INVALID_REQUEST", provider: "other", model: "n/a", retryable: false });
    }

    if (projectedDaily > proj.maxDailyCostUsd) {
      const msg = `Run aborted: projected daily cost ($${projectedDaily.toFixed(2)}) exceeds MAX_DAILY_COST_USD ($${proj.maxDailyCostUsd.toFixed(2)}).`;
      await this.persistAbort(args.runId, "DAILY_COST_LIMIT", msg, proj);
      throw new ProviderError(msg, { code: "INVALID_REQUEST", provider: "other", model: "n/a", retryable: false });
    }
  }

  private async persistAbort(runId: string, kind: string, message: string, details: unknown) {
    try {
      await (this.prisma as any).cost_guard_events.create({
        data: { run_id: runId, kind, message, details },
      });
      await (this.prisma as any).aborted_runs.upsert({
        where: { run_id: runId },
        create: { run_id: runId, reason: kind, details: { message } },
        update: { reason: kind, details: { message } },
      });
    } catch {
      // ignore
    }
  }
}

