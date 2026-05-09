import type { EvalCase, ModelConfig, TaskType } from "@the-guard/contracts";
import type { GenerateOutput, LLMProvider } from "@the-guard/llm";

/**
 * EvalExecutionContext is passed through the entire evaluation flow.
 *
 * Why it exists:
 * - central place for run identifiers (persistence)
 * - provider/model config (reproducibility)
 * - observability hooks (logging, request correlation)
 *
 * We keep it explicit rather than hiding it behind frameworks/DI.
 */
export type EvalExecutionContext = {
  runId: string;
  taskType: TaskType;
  modelConfig: ModelConfig;
  provider: LLMProvider;
  now: () => Date;
  logger: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
};

/**
 * A task definition tells the engine:
 * - how to prompt the model for a given case
 * - what scorers to apply
 * - how to decide GO/NO-GO from scores
 */
export type EvalTaskDefinition<TCaseInput extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  name: string;
  taskType: TaskType;
  version: number;

  /**
   * Builds the prompt text sent to the provider. Keeping this in code makes it testable
   * and decoupled from persistence (prompt_versions can be layered later).
   */
  renderPrompt: (args: { evalCase: EvalCase; input: TCaseInput }) => { system?: string; prompt: string };

  /**
   * Optional parsing step to interpret output as JSON. Scorers can use this if present.
   */
  parseOutput?: (text: string) => { json?: unknown; warnings?: string[] };

  /**
   * Score pipeline is declared by the task so new tasks can compose scorers differently.
   */
  scorers: ScoreFunction[];

  /**
   * Release decision for a single case.
   * Aggregate GO/NO-GO for a run is computed by the runner (e.g. fail fast or threshold).
   */
  decideCase: (scores: ScoreResult[]) => { verdict: "GO" | "NO_GO"; reasons: string[] };
};

export type ScoreFunction = {
  id: string;
  name: string;
  /**
   * ScoreResult.value is numeric \(0..1\) so we can compare and aggregate easily.
   * ScoreType is persisted separately; for now this is "NUMERIC".
   */
  score: (args: {
    ctx: EvalExecutionContext;
    evalCase: EvalCase;
    output: GenerateOutput;
    parsed?: { json?: unknown; warnings?: string[] };
  }) => Promise<ScoreResult>;
};

export type ScoreResult = {
  scorerId: string;
  value: number; // 0..1
  passed: boolean;
  rationale?: string;
  metadata?: Record<string, unknown>;
};

export type ScorePipeline = {
  run: (args: {
    ctx: EvalExecutionContext;
    evalCase: EvalCase;
    output: GenerateOutput;
    parsed?: { json?: unknown; warnings?: string[] };
  }) => Promise<ScoreResult[]>;
};

export type EvalRunner = {
  run: (args: {
    ctx: Omit<EvalExecutionContext, "provider"> & { provider: LLMProvider };
    task: EvalTaskDefinition<any>;
    dataset: EvalCase[];
  }) => Promise<{
    runId: string;
    taskId: string;
    totalCases: number;
    passedCases: number;
    failedCases: number;
    verdict: "GO" | "NO_GO";
  }>;
};

