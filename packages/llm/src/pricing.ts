import type { CostEstimate, TokenUsage } from "./types.js";

/**
 * Centralized pricing is kept small and overridable.
 *
 * Architectural decision:
 * - Keep provider pricing tables in code for quick, deterministic estimation.
 * - Allow runtime overrides via ProviderConfig.pricing because pricing changes frequently.
 */
type Pricing = { inputUsdPer1KTokens: number; outputUsdPer1KTokens: number };

const OPENAI_PRICING: Record<string, Pricing> = {
  // Conservative defaults. Adjust/override per environment as needed.
  "gpt-4.1-mini": { inputUsdPer1KTokens: 0.003, outputUsdPer1KTokens: 0.012 },
  "gpt-4o-mini": { inputUsdPer1KTokens: 0.0015, outputUsdPer1KTokens: 0.006 },
};

const GEMINI_PRICING: Record<string, Pricing> = {
  "gemini-1.5-pro": { inputUsdPer1KTokens: 0.007, outputUsdPer1KTokens: 0.021 },
  "gemini-1.5-flash": { inputUsdPer1KTokens: 0.001, outputUsdPer1KTokens: 0.003 },
};

export function estimateCost(args: {
  provider: "openai" | "google" | "anthropic" | "local" | "other";
  model: string;
  usage: TokenUsage;
  overrides?: Record<string, Pricing>;
}): CostEstimate {
  const { provider, model, usage, overrides } = args;
  const lookup: Record<string, Pricing> =
    provider === "openai"
      ? OPENAI_PRICING
      : provider === "google"
        ? GEMINI_PRICING
        : {};

  const pricing = overrides?.[model] ?? lookup[model];
  if (!pricing) {
    return {
      currency: "USD",
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      isEstimated: false,
      model,
    };
  }

  const inputCost = (usage.inputTokens / 1000) * pricing.inputUsdPer1KTokens;
  const outputCost = (usage.outputTokens / 1000) * pricing.outputUsdPer1KTokens;
  return {
    currency: "USD",
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    isEstimated: true,
    model,
  };
}

/**
 * Estimate cost directly from token counts (useful for pre-call projection).
 */
export function estimateCostFromTokens(args: {
  provider: "openai" | "google" | "anthropic" | "local" | "other";
  model: string;
  inputTokens: number;
  outputTokens: number;
  overrides?: Record<string, Pricing>;
}): CostEstimate {
  return estimateCost({
    provider: args.provider,
    model: args.model,
    usage: {
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.inputTokens + args.outputTokens,
    },
    overrides: args.overrides,
  });
}

