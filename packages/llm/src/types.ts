import type { ModelConfig } from "@the-guard/contracts";

/**
 * ProviderConfig exists to keep "how to call the provider" separate from "what model to run".
 *
 * - ModelConfig is persisted (reproducibility).
 * - ProviderConfig is runtime-only (secrets, timeouts, retries, pricing overrides).
 */
export type ProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  /** Upper bound in ms for exponential backoff jittered sleeps. */
  maxRetryDelayMs?: number;
  /**
   * Optional pricing overrides for cost estimation. Useful for enterprise SKUs or rapid pricing changes.
   * Keys should match provider model IDs.
   */
  pricing?: Record<
    string,
    {
      inputUsdPer1KTokens: number;
      outputUsdPer1KTokens: number;
    }
  >;
};

export type ProviderName = "openai" | "google" | "anthropic" | "local" | "other";

/**
 * GenerateInput is intentionally provider-agnostic and minimal.
 * If/when we need tool-calls or multi-modal inputs, we can extend this type without breaking providers.
 */
export type GenerateInput = {
  /**
   * Prompts are normalized as a string for now to avoid overengineering.
   * Higher-level prompt rendering should happen upstream (prompt versions + templates).
   */
  prompt: string;
  /**
   * Optional system preamble for providers that support it; providers that don't can prepend.
   */
  system?: string;
  /**
   * Optional request correlation for observability.
   * This can be used by API layers to link logs and traces.
   */
  requestId?: string;
  /**
   * Optional per-request override knobs.
   * This keeps `ModelConfig` stable while allowing experimental tweaks.
   */
  overrides?: Partial<Pick<ModelConfig, "temperature" | "topP" | "maxOutputTokens" | "seed">>;
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type CostEstimate = {
  currency: "USD";
  inputCost: number;
  outputCost: number;
  totalCost: number;
  /**
   * Indicates whether the estimate was computed from a known price table.
   * Unknown models still return costs as 0 with isEstimated=false.
   */
  isEstimated: boolean;
  /** Informational model key used for pricing lookup. */
  model: string;
};

export type GenerateMetadata = {
  provider: ProviderName;
  model: string;
  latencyMs: number;
  usage: TokenUsage;
  cost: CostEstimate;
  /**
   * Raw provider metadata kept for debugging and audit without leaking huge payloads.
   * Should stay small and structured.
   */
  raw?: Record<string, unknown>;
};

export type GenerateOutput = {
  text: string;
  metadata: GenerateMetadata;
};

/**
 * LLMProvider is a narrow interface on purpose.
 *
 * Architectural decision:
 * - Keep a single `generate()` primitive.
 * - Build richer features (batching, tool calling, multimodal) at higher layers when needed.
 */
export interface LLMProvider {
  readonly name: ProviderName;
  readonly model: string;

  generate(input: GenerateInput): Promise<GenerateOutput>;
}

export type ProviderFactory = (args: {
  modelConfig: ModelConfig;
  providerConfig: ProviderConfig;
}) => LLMProvider;

/**
 * Aggregation helpers enable per-run rollups without needing DB dependencies.
 * API/services can sum outputs across a run and persist the totals.
 */
export function aggregateTokenUsage(usages: TokenUsage[]): TokenUsage {
  const inputTokens = usages.reduce((acc, u) => acc + (u.inputTokens || 0), 0);
  const outputTokens = usages.reduce((acc, u) => acc + (u.outputTokens || 0), 0);
  const totalTokens = usages.reduce((acc, u) => acc + (u.totalTokens || 0), 0);
  return { inputTokens, outputTokens, totalTokens };
}

export function aggregateCost(estimates: CostEstimate[]): CostEstimate {
  const inputCost = estimates.reduce((acc, c) => acc + (c.inputCost || 0), 0);
  const outputCost = estimates.reduce((acc, c) => acc + (c.outputCost || 0), 0);
  const totalCost = estimates.reduce((acc, c) => acc + (c.totalCost || 0), 0);
  const isEstimated = estimates.some((c) => c.isEstimated);
  const model = estimates.length === 1 ? estimates[0]!.model : "aggregate";
  return { currency: "USD", inputCost, outputCost, totalCost, isEstimated, model };
}

