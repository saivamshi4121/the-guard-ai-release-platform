import type { PrismaClientLike } from "@the-guard/db";
import type { TaskType } from "@the-guard/contracts";
import type { EvalCase } from "@the-guard/contracts";
import type { ProviderError, GenerateOutput } from "@the-guard/llm";
import type { HallucinationTrace } from "@the-guard/hallucination";
import type { ScoreResult } from "../engine/types.js";
import {
  createEvalCasesRepository,
  createEvalOutputsRepository,
  createEvalRunsRepository,
  createEvalScoresRepository,
  type EvalCasesRepository,
  type EvalOutputsRepository,
  type EvalRunsRepository,
  type EvalScoresRepository,
} from "./repositories.js";

/**
 * Service layer coordinates repositories so the runner can stay focused on orchestration.
 * This is intentionally small (no "framework service container").
 */
export class EvalPersistenceService {
  private readonly runs: EvalRunsRepository;
  private readonly cases: EvalCasesRepository;
  private readonly outputs: EvalOutputsRepository;
  private readonly scores: EvalScoresRepository;
  private readonly prisma: PrismaClientLike;

  constructor(prisma: PrismaClientLike) {
    this.prisma = prisma;
    this.runs = createEvalRunsRepository(prisma);
    this.cases = createEvalCasesRepository(prisma);
    this.outputs = createEvalOutputsRepository(prisma);
    this.scores = createEvalScoresRepository(prisma);
  }

  async createRun(args: {
    runId: string;
    taskType: TaskType;
    modelConfig: Record<string, unknown>;
    promptVersionId?: string | null;
  }): Promise<void> {
    await this.runs.createRun({
      runId: args.runId,
      taskType: args.taskType,
      modelConfig: args.modelConfig,
      promptVersionId: args.promptVersionId ?? null,
    });
    await this.runs.markStarted({ runId: args.runId, startedAt: new Date() });
  }

  async saveCaseResult(args: {
    runId: string;
    caseId: string;
    output: GenerateOutput;
    parsed?: { json?: unknown; warnings?: string[] };
    scores: ScoreResult[];
  }): Promise<void> {
    await this.outputs.upsertOutput({
      runId: args.runId,
      caseId: args.caseId,
      output: args.output,
      parsed: args.parsed,
    });
    await this.scores.upsertScores({ runId: args.runId, caseId: args.caseId, scores: args.scores });
  }

  /**
   * Ensures dataset cases exist before any eval_outputs/eval_scores write.
   * This prevents FK violations and keeps runs re-runnable (upsert).
   */
  async ensureCasesExist(args: { cases: EvalCase[] }): Promise<void> {
    for (const c of args.cases) {
      await this.cases.upsertCase({ evalCase: c });
    }
  }

  async saveHallucinationTrace(trace: HallucinationTrace): Promise<void> {
    await (this.prisma as any).hallucination_traces.create({
      data: {
        run_id: trace.runId,
        case_id: trace.caseId,
        trace: trace as any,
      },
    });
  }

  async saveOutputFailure(args: {
    runId: string;
    caseId: string;
    provider: string;
    model: string;
    error: ProviderError;
  }): Promise<void> {
    await this.outputs.upsertFailure(args);
  }

  async finalizeRun(args: { runId: string; status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" }): Promise<void> {
    await this.runs.updateStatus({ runId: args.runId, status: args.status });
    await this.runs.markCompleted({ runId: args.runId, completedAt: new Date() });
  }
}

