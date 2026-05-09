import { GoogleGenerativeAI } from "@google/generative-ai";
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
  // Gemini SDK returns usageMetadata on some responses
  const u = usage as
    | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
    | undefined;
  const inputTokens = u?.promptTokenCount ?? 0;
  const outputTokens = u?.candidatesTokenCount ?? 0;
  const totalTokens = u?.totalTokenCount ?? inputTokens + outputTokens;
  return { inputTokens, outputTokens, totalTokens };
}

function toProviderError(args: {
  err: unknown;
  model: string;
  requestId?: string;
}): ProviderError {
  const { err, model, requestId } = args;
  const provider: ProviderName = "google";

  const anyErr = err as { status?: number; code?: number | string; message?: string; name?: string };
  const msg = anyErr?.message ?? "Gemini request failed";
  const status = anyErr?.status;

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

  if ((err as { name?: string })?.name === "AbortError") {
    return new ProviderError("Gemini request timed out", { code: "TIMEOUT", provider, model, retryable: true, requestId, cause: err });
  }

  return new ProviderError(msg, { code: "UNKNOWN", provider, model, retryable: false, requestId, cause: err });
}

export class GeminiProvider implements LLMProvider {
  readonly name: ProviderName = "google";
  readonly model: string;

  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly maxRetryDelayMs: number;
  private readonly pricingOverrides?: ProviderConfig["pricing"];
  private readonly modelConfig: ModelConfig;
  private readonly client: GoogleGenerativeAI;

  constructor(args: { modelConfig: ModelConfig; providerConfig: ProviderConfig }) {
    const { modelConfig, providerConfig } = args;
    this.modelConfig = modelConfig;
    this.model = modelConfig.model;
    this.timeoutMs = providerConfig.timeoutMs ?? 30_000;
    this.maxRetries = providerConfig.maxRetries ?? 2;
    this.maxRetryDelayMs = providerConfig.maxRetryDelayMs ?? 2_000;
    this.pricingOverrides = providerConfig.pricing;

    if (!providerConfig.apiKey) {
      throw new ProviderError("Missing Gemini API key", {
        code: "AUTH",
        provider: "google",
        model: this.model,
        retryable: false,
      });
    }

    this.client = new GoogleGenerativeAI(providerConfig.apiKey);
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

            const model = this.client.getGenerativeModel({
              model: this.model,
              generationConfig: {
                ...(temperature !== undefined ? { temperature } : {}),
                ...(topP !== undefined ? { topP } : {}),
                ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
              },
            });

            // Gemini doesn't have a first-class "system" role in the same way across SDKs;
            // we prefix the prompt to avoid larger abstractions.
            const fullPrompt = input.system ? `${input.system}\n\n${input.prompt}` : input.prompt;

            const response = await model.generateContent(
              { contents: [{ role: "user", parts: [{ text: fullPrompt }] }] },
              { signal: ac.signal } as unknown as undefined,
            );

            const text = response.response.text();
            const usage = normalizeUsage((response.response as unknown as { usageMetadata?: unknown }).usageMetadata);
            const latencyMs = nowMs() - started;
            const cost = estimateCost({
              provider: "google",
              model: this.model,
              usage,
              overrides: this.pricingOverrides,
            });

            return {
              text,
              metadata: {
                provider: "google",
                model: this.model,
                latencyMs,
                usage,
                cost,
                raw: {
                  finishReason: (response.response as unknown as { candidates?: Array<{ finishReason?: string }> }).candidates?.[0]
                    ?.finishReason,
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

