import type { PrismaClientLike } from "@the-guard/db";
import { createRegressionReportsRepository, type RegressionReportsRepository } from "./repositories.js";
import type { RegressionReport } from "../types.js";

export class RegressionPersistenceService {
  private readonly reports: RegressionReportsRepository;

  constructor(prisma: PrismaClientLike) {
    this.reports = createRegressionReportsRepository(prisma);
  }

  async persist(report: RegressionReport & { promptDiffSummary?: string | null }): Promise<void> {
    await this.reports.createReport(report);
  }
}

