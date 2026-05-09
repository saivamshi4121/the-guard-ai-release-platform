import { ProviderError } from "@the-guard/llm";
import type { ModelConfig } from "@the-guard/contracts";

export type ModelPolicy = {
  safeModels: string[];
  demoMode: boolean;
};

/**
 * ModelPolicyService enforces provider/model allowlists.
 *
 * Why it exists:
 * - prevents accidental expensive model selection in demos/CI
 * - makes policy explicit and auditable (errors are structured)
 */
export class ModelPolicyService {
  constructor(private readonly policy: ModelPolicy) {}

  assertAllowed(modelConfig: ModelConfig): void {
    const { safeModels, demoMode } = this.policy;
    if (safeModels.length === 0) return;
    if (!safeModels.includes(modelConfig.model)) {
      throw new ProviderError(
        demoMode
          ? `Demo mode blocked model "${modelConfig.model}". Allowed: ${safeModels.join(", ")}`
          : `Model "${modelConfig.model}" not in SAFE_MODELS allowlist`,
        {
          code: "INVALID_REQUEST",
          provider: modelConfig.provider,
          model: modelConfig.model,
          retryable: false,
        },
      );
    }
  }
}

