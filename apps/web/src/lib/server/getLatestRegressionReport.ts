import { prisma } from "@the-guard/db";

/**
 * Latest persisted regression report id for dashboard deep-links.
 * Returns null when Prisma is unavailable, misconfigured, empty, or on any error.
 */
export type LatestRegressionReport = { id: string } | null;

export async function getLatestRegressionReport(): Promise<LatestRegressionReport> {
  if (!process.env.DATABASE_URL?.trim()) {
    return null;
  }

  try {
    const row = await (prisma as any).regression_reports.findFirst({
      orderBy: { created_at: "desc" },
      select: { id: true },
    });
    if (row?.id && typeof row.id === "string") {
      return { id: row.id };
    }
    return null;
  } catch {
    return null;
  }
}

export type PersistedRegressionReportRow = {
  id: string;
  baseline_run_id: string;
  candidate_run_id: string;
  verdict: string;
  severity: string;
  summary: string;
  comparison_json: unknown;
  prompt_diff_summary: string | null;
  created_at: Date;
};

/**
 * Load one regression report by id for UI fallback when mock data is absent.
 */
export async function getRegressionReportById(id: string): Promise<PersistedRegressionReportRow | null> {
  if (!process.env.DATABASE_URL?.trim() || !id) {
    return null;
  }

  try {
    const row = await (prisma as any).regression_reports.findUnique({
      where: { id },
      select: {
        id: true,
        baseline_run_id: true,
        candidate_run_id: true,
        verdict: true,
        severity: true,
        summary: true,
        comparison_json: true,
        prompt_diff_summary: true,
        created_at: true,
      },
    });
    return row ?? null;
  } catch {
    return null;
  }
}
