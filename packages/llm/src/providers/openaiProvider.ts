import OpenAI from "openai";
import type { ModelConfig } from "@the-guard/contracts";
import { ProviderError } from "../errors.js";
import { estimateCost } from "../pricing.js";
import { withRetry } from "../retry.js";
import type {
  GenerateInput,
  GenerateOutput,
  LLMProvider,
  ProviderConfig,
  ProviderName,
  TokenUsage,
} from "../types.js";

function nowMs(): number {
  return Date.now();
}

function normalizeUsage(usage: unknown): TokenUsage {
  const u = usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  const inputTokens = u?.prompt_tokens ?? 0;
  const outputTokens = u?.completion_tokens ?? 0;
  const totalTokens = u?.total_tokens ?? inputTokens + outputTokens;
  return { inputTokens, outputTokens, totalTokens };
}

function toProviderError(args: {
  err: unknown;
  model: string;
  requestId?: string;
}): ProviderError {
  const { err, model, requestId } = args;
  const provider: ProviderName = "openai";

  // The OpenAI SDK throws typed errors, but we avoid depending on deep internals.
  const anyErr = err as { status?: number; code?: string; message?: string; name?: string };
  const status = anyErr?.status;
  const msg = anyErr?.message ?? "OpenAI request failed";

  if (status === 401 || status === 403) {
    return new ProviderError(msg, { code: "AUTH", provider, model, retryable: false, statusCode: status, requestId, cause: err });
  }
  if (status === 429) {
    return new ProviderError(msg, { code: "RATE_LIMIT", provider, model, retryable: true, statusCode: status, requestId, cause: err });
  }
  if (status && status >= 400 && status < 500) {
    return new ProviderError(msg, { code: "INVALID_REQUEST", provider, model, retryable: false, statusCode: status, requestId, cause: err });
  }
  if (status && status >= 500) {
    return new ProviderError(msg, { code: "UPSTREAM", provider, model, retryable: true, statusCode: status, requestId, cause: err });
  }

  // Fetch aborts may bubble as DOMException in some runtimes.
  if ((err as { name?: string })?.name === "AbortError") {
    return new ProviderError("OpenAI request timed out", { code: "TIMEOUT", provider, model, retryable: true, requestId, cause: err });
  }

  return new ProviderError(msg, { code: "UNKNOWN", provider, model, retryable: false, requestId, cause: err });
}

export class OpenAIProvider implements LLMProvider {
  readonly name: ProviderName = "openai";
  readonly model: string;

  private readonly client: OpenAI;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly maxRetryDelayMs: number;
  private readonly pricingOverrides?: ProviderConfig["pricing"];
  private readonly modelConfig: ModelConfig;

  constructor(args: { modelConfig: ModelConfig; providerConfig: ProviderConfig }) {
    const { modelConfig, providerConfig } = args;
    this.modelConfig = modelConfig;
    this.model = modelConfig.model;
    this.timeoutMs = providerConfig.timeoutMs ?? 30_000;
    this.maxRetries = providerConfig.maxRetries ?? 2;
    this.maxRetryDelayMs = providerConfig.maxRetryDelayMs ?? 2_000;
    this.pricingOverrides = providerConfig.pricing;

    if (!providerConfig.apiKey) {
      throw new ProviderError("Missing OpenAI API key", {
        code: "AUTH",
        provider: "openai",
        model: this.model,
        retryable: false,
      });
    }

    this.client = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseUrl,
    });
  }

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const started = nowMs();
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), this.timeoutMs);

    try {
      const out = await withRetry({
        maxRetries: this.maxRetries,
        maxRetryDelayMs: this.maxRetryDelayMs,
        shouldRetry: (err) => (err instanceof ProviderError ? err.info.retryable : false),
        fn: async () => {
          try {
            const temperature = input.overrides?.temperature ?? this.modelConfig.temperature;
            const topP = input.overrides?.topP ?? this.modelConfig.topP;
            const maxOutputTokens = input.overrides?.maxOutputTokens ?? this.modelConfig.maxOutputTokens;

            const response = await this.client.chat.completions.create(
              {
                model: this.model,
                messages: [
                  ...(input.system ? [{ role: "system" as const, content: input.system }] : []),
                  { role: "user", content: input.prompt },
                ],
                temperature,
                top_p: topP,
                max_tokens: maxOutputTokens,
                // seed is not supported on all models; pass only when present
                ...(input.overrides?.seed ?? this.modelConfig.seed ? { seed: input.overrides?.seed ?? this.modelConfig.seed } : {}),
              },
              { signal: ac.signal },
            );

            const text = response.choices?.[0]?.message?.content ?? "";
            const usage = normalizeUsage(response.usage);
            const latencyMs = nowMs() - started;
            const cost = estimateCost({
              provider: "openai",
              model: this.model,
              usage,
              overrides: this.pricingOverrides,
            });

            return {
              text,
              metadata: {
                provider: "openai",
                model: this.model,
                latencyMs,
                usage,
                cost,
                raw: {
                  id: response.id,
                  created: response.created,
                },
              },
            } satisfies GenerateOutput;
          } catch (err) {
            throw toProviderError({ err, model: this.model, requestId: input.requestId });
          }
        },
      });

      return out;
    } finally {
      clearTimeout(timeout);
    }
  }
}

