import type { ModelConfig } from "@the-guard/contracts";
import { ProviderError } from "./errors.js";
import type { LLMProvider, ProviderConfig, ProviderFactory, ProviderName } from "./types.js";
import { OpenAIProvider } from "./providers/openaiProvider.js";
import { GeminiProvider } from "./providers/geminiProvider.js";
import { DemoDataProvider, loadDemoSnapshots } from "./demo/demoDataProvider.js";

/**
 * ProviderRegistry exists to avoid hard-coding provider creation throughout the codebase.
 *
 * Architectural decision:
 * - Simple factory registry (no DI framework).
 * - Easy to add Claude later by registering another factory under "anthropic".
 */
export class ProviderRegistry {
  private readonly factories = new Map<ProviderName, ProviderFactory>();

  register(provider: ProviderName, factory: ProviderFactory): void {
    this.factories.set(provider, factory);
  }

  create(args: { modelConfig: ModelConfig; providerConfig: ProviderConfig }): LLMProvider {
    const provider = args.modelConfig.provider as ProviderName;
    const factory = this.factories.get(provider);
    if (!factory) {
      throw new ProviderError(`No provider registered for "${provider}"`, {
        code: "INVALID_REQUEST",
        provider,
        model: args.modelConfig.model,
        retryable: false,
      });
    }
    return factory(args);
  }
}

export function createDefaultRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();

  registry.register("openai", ({ modelConfig, providerConfig }) => new OpenAIProvider({ modelConfig, providerConfig }));
  registry.register("google", ({ modelConfig, providerConfig }) => new GeminiProvider({ modelConfig, providerConfig }));

  // Stubs for later providers keep the surface stable.
  // registry.register("anthropic", ({ modelConfig, providerConfig }) => new ClaudeProvider({ modelConfig, providerConfig }));

  return registry;
}

/**
 * Convenience runtime lookup. Most callers can use this instead of holding a registry instance.
 */
export function getProvider(args: {
  modelConfig: ModelConfig;
  providerConfig: ProviderConfig;
  demoMode?: { enabled: boolean; snapshotPath?: string };
  registry?: ProviderRegistry;
}): LLMProvider {
  if (args.demoMode?.enabled) {
    const snapshotPath = args.demoMode.snapshotPath;
    if (!snapshotPath) {
      throw new ProviderError("ENABLE_DEMO_MODE requires DEMO_SNAPSHOT_PATH", {
        code: "INVALID_REQUEST",
        provider: "other",
        model: args.modelConfig.model,
        retryable: false,
      });
    }
    // Note: sync wrapper around async load isn't desirable; we require caller to preload in prod.
    // For now, we throw a clear error and provide an async helper below.
    throw new ProviderError("Demo provider requires async construction; use getProviderAsync()", {
      code: "INVALID_REQUEST",
      provider: "other",
      model: args.modelConfig.model,
      retryable: false,
    });
  }
  const registry = args.registry ?? createDefaultRegistry();
  return registry.create({ modelConfig: args.modelConfig, providerConfig: args.providerConfig });
}

export async function getProviderAsync(args: {
  modelConfig: ModelConfig;
  providerConfig: ProviderConfig;
  demoMode?: { enabled: boolean; snapshotPath?: string };
  registry?: ProviderRegistry;
}): Promise<LLMProvider> {
  if (args.demoMode?.enabled) {
    const snapshotPath = args.demoMode.snapshotPath;
    if (!snapshotPath) {
      throw new ProviderError("ENABLE_DEMO_MODE requires DEMO_SNAPSHOT_PATH", {
        code: "INVALID_REQUEST",
        provider: "other",
        model: args.modelConfig.model,
        retryable: false,
      });
    }
    const snaps = await loadDemoSnapshots(snapshotPath);
    return new DemoDataProvider({ modelConfig: args.modelConfig, snapshots: snaps });
  }
  const registry = args.registry ?? createDefaultRegistry();
  return registry.create({ modelConfig: args.modelConfig, providerConfig: args.providerConfig });
}

