/**
 * Shared domain contracts used across services (API, workers, UI).
 *
 * Why this package exists:
 * - Keeps cross-service entity shapes consistent (avoids "stringly-typed" APIs).
 * - Enables safe validation boundaries via Zod schemas generated alongside types.
 * - Makes it easy to add new task families, scores, and regression logic without touching DB internals.
 */

export type ISODateTimeString = string;

/**
 * TaskType exists to make evaluation routing explicit.
 * It determines:
 * - how prompts are rendered
 * - which scoring methods apply
 * - which observability traces are collected
 */
export enum TaskType {
  SAFETY = "SAFETY",
  HALLUCINATION = "HALLUCINATION",
  INJECTION = "INJECTION",
  POLICY = "POLICY",
  QA = "QA",
}

/**
 * ScoreType exists because the platform supports heterogeneous scoring.
 * New score types can be added without altering existing score consumers.
 */
export enum ScoreType {
  BOOLEAN = "BOOLEAN",
  NUMERIC = "NUMERIC",
  CATEGORICAL = "CATEGORICAL",
  TEXT = "TEXT",
}

/**
 * RunStatus exists for production workflows:
 * queued, running, completed, failed, cancelled.
 * This is essential for dashboards, retries, and incident investigation.
 */
export enum RunStatus {
  QUEUED = "QUEUED",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

/**
 * RegressionSeverity exists to encode decision-making:
 * - BLOCKER should halt a release
 * - WARN may require review
 * - INFO is tracked but not gating
 */
export enum RegressionSeverity {
  INFO = "INFO",
  WARN = "WARN",
  BLOCKER = "BLOCKER",
}

/**
 * ModelConfig exists because model execution context must be replayable.
 * Store only what is needed for reproducibility and auditing.
 */
export type ModelConfig = {
  provider: "openai" | "anthropic" | "google" | "local" | "other";
  model: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  seed?: number;
  /** Provider-specific tuning knobs (kept as JSON for extensibility). */
  extra?: Record<string, unknown>;
};

/**
 * PromptVersion exists to enable controlled rollouts and rollback.
 * Evaluations should always reference an immutable prompt version.
 */
export type PromptVersion = {
  id: string;
  taskType: TaskType;
  name: string;
  version: number;
  template: string;
  metadata?: Record<string, unknown>;
  createdAt: ISODateTimeString;
};

/**
 * EvalTask exists as a "logical group" users care about.
 * Cases are test vectors; tasks are the safety objective boundary.
 */
export type EvalTask = {
  id: string;
  taskType: TaskType;
  name: string;
  description?: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

/**
 * EvalCase exists to represent a single, replayable test vector.
 * Cases are immutable-ish inputs; edits should be tracked by new versions externally if needed.
 */
export type EvalCase = {
  id: string;
  taskType: TaskType;
  name: string;
  description?: string;
  input: Record<string, unknown>;
  expected?: Record<string, unknown> | null;
  tags: string[];
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

/**
 * EvalRun exists to capture one execution of a prompt+model against a suite of cases.
 * It is the unit of observability (trace IDs), retries, and comparisons.
 */
export type EvalRun = {
  id: string;
  taskType: TaskType;
  status: RunStatus;
  modelConfig: ModelConfig;
  promptVersionId: string | null;
  startedAt?: ISODateTimeString | null;
  completedAt?: ISODateTimeString | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

/**
 * EvalScore exists to store per-case, per-run scoring outputs.
 * Multiple score types can be attached to the same run+case for richer analysis.
 */
export type EvalScore = {
  id: string;
  runId: string;
  caseId: string;
  scoreType: ScoreType;
  value: number;
  passed: boolean;
  rationale?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: ISODateTimeString;
};

/**
 * RegressionResult exists to compare two runs (baseline vs candidate).
 * It is the unit of "release gating" decisions and reporting.
 */
export type RegressionResult = {
  id: string;
  baselineRunId: string;
  candidateRunId: string;
  severity: RegressionSeverity;
  summary: string;
  details?: Record<string, unknown> | null;
  createdAt: ISODateTimeString;
};
