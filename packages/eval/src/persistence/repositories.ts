import type { PrismaClientLike } from "@the-guard/db";
import type { ProviderError } from "@the-guard/llm";
import type { GenerateOutput } from "@the-guard/llm";
import type { EvalCase } from "@the-guard/contracts";
import type { ScoreResult } from "../engine/types.js";

/**
 * Repository layer is a thin data-access boundary.
 * Why it exists:
 * - keeps Prisma isolated from engine logic
 * - enables swapping persistence (e.g. Supabase REST) later if needed
 */

export type EvalRunsRepository = {
  createRun: (args: {
    runId: string;
    taskType: "SAFETY" | "HALLUCINATION" | "INJECTION" | "POLICY" | "QA";
    modelConfig: Record<string, unknown>;
    promptVersionId?: string | null;
  }) => Promise<void>;
  updateStatus: (args: { runId: string; status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" }) => Promise<void>;
  markStarted: (args: { runId: string; startedAt: Date }) => Promise<void>;
  markCompleted: (args: { runId: string; completedAt: Date }) => Promise<void>;
};

export type EvalOutputsRepository = {
  upsertOutput: (args: {
    runId: string;
    caseId: string;
    output: GenerateOutput;
    parsed?: { json?: unknown; warnings?: string[] };
  }) => Promise<void>;
  upsertFailure: (args: {
    runId: string;
    caseId: string;
    provider: string;
    model: string;
    error: ProviderError;
  }) => Promise<void>;
};

export type EvalScoresRepository = {
  upsertScores: (args: { runId: string; caseId: string; scores: ScoreResult[] }) => Promise<void>;
};

export type EvalCasesRepository = {
  upsertCase: (args: { evalCase: EvalCase }) => Promise<void>;
};

export function createEvalRunsRepository(prisma: PrismaClientLike): EvalRunsRepository {
  return {
    async createRun({ runId, taskType, modelConfig, promptVersionId }) {
      await prisma.eval_runs.create({
        data: {
          id: runId,
          task_type: taskType as never,
          status: "QUEUED" as never,
          model_config: modelConfig as never,
          prompt_version_id: promptVersionId ?? null,
        },
      });
    },
    async updateStatus({ runId, status }) {
      await prisma.eval_runs.update({
        where: { id: runId },
        data: { status: status as never },
      });
    },
    async markStarted({ runId, startedAt }) {
      await prisma.eval_runs.update({
        where: { id: runId },
        data: { started_at: startedAt, status: "RUNNING" as never },
      });
    },
    async markCompleted({ runId, completedAt }) {
      await prisma.eval_runs.update({
        where: { id: runId },
        data: { completed_at: completedAt },
      });
    },
  };
}

export function createEvalCasesRepository(prisma: PrismaClientLike): EvalCasesRepository {
  return {
    async upsertCase({ evalCase }) {
      await (prisma as any).eval_cases.upsert({
        where: { id: evalCase.id },
        create: {
          id: evalCase.id,
          task_type: evalCase.taskType as never,
          name: evalCase.name,
          description: evalCase.description ?? null,
          input: evalCase.input as never,
          expected: (evalCase.expected ?? null) as never,
          tags: evalCase.tags,
        },
        update: {
          task_type: evalCase.taskType as never,
          name: evalCase.name,
          description: evalCase.description ?? null,
          input: evalCase.input as never,
          expected: (evalCase.expected ?? null) as never,
          tags: evalCase.tags,
        },
      });
    },
  };
}

export function createEvalOutputsRepository(prisma: PrismaClientLike): EvalOutputsRepository {
  return {
    async upsertOutput({ runId, caseId, output, parsed }) {
      await prisma.eval_outputs.upsert({
        where: { run_id_case_id: { run_id: runId, case_id: caseId } },
        create: {
          run_id: runId,
          case_id: caseId,
          output_text: output.text,
          output_json: (parsed?.json ?? null) as never,
          provider: output.metadata.provider,
          model: output.metadata.model,
          latency_ms: output.metadata.latencyMs,
          usage: output.metadata.usage as never,
          cost: output.metadata.cost as never,
        },
        update: {
          output_text: output.text,
          output_json: (parsed?.json ?? null) as never,
          provider: output.metadata.provider,
          model: output.metadata.model,
          latency_ms: output.metadata.latencyMs,
          usage: output.metadata.usage as never,
          cost: output.metadata.cost as never,
        },
      });
    },
    async upsertFailure({ runId, caseId, provider, model, error }) {
      await prisma.eval_outputs.upsert({
        where: { run_id_case_id: { run_id: runId, case_id: caseId } },
        create: {
          run_id: runId,
          case_id: caseId,
          output_text: "",
          output_json: {
            error: {
              message: error.message,
              code: error.info.code,
              statusCode: error.info.statusCode ?? null,
              retryable: error.info.retryable,
              requestId: error.info.requestId ?? null,
            },
          } as never,
          provider,
          model,
          latency_ms: 0,
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } as never,
          cost: { currency: "USD", inputCost: 0, outputCost: 0, totalCost: 0, isEstimated: false, model } as never,
        },
        update: {
          output_json: {
            error: {
              message: error.message,
              code: error.info.code,
              statusCode: error.info.statusCode ?? null,
              retryable: error.info.retryable,
              requestId: error.info.requestId ?? null,
            },
          } as never,
        },
      });
    },
  };
}

export function createEvalScoresRepository(prisma: PrismaClientLike): EvalScoresRepository {
  return {
    async upsertScores({ runId, caseId, scores }) {
      for (const s of scores) {
        await prisma.eval_scores.upsert({
          where: { run_id_case_id_scorer_id: { run_id: runId, case_id: caseId, scorer_id: s.scorerId } },
          create: {
            run_id: runId,
            case_id: caseId,
            scorer_id: s.scorerId,
            score_type: "NUMERIC" as never,
            value: s.value,
            passed: s.passed,
            rationale: s.rationale ?? null,
            metadata: (s.metadata ?? null) as never,
          },
          update: {
            value: s.value,
            passed: s.passed,
            rationale: s.rationale ?? null,
            metadata: (s.metadata ?? null) as never,
          },
        });
      }
    },
  };
}

