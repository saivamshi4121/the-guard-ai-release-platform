import { readFile } from "node:fs/promises";
import type { ModelConfig } from "@the-guard/contracts";
import type { GenerateInput, GenerateOutput, LLMProvider, ProviderConfig, ProviderName } from "../types.js";
import { ProviderError } from "../errors.js";

export type DemoSnapshot = {
  key: string;
  provider: ProviderName;
  model: string;
  input: {
    system?: string;
    prompt: string;
  };
  output: GenerateOutput;
};

/**
 * DemoDataProvider is a no-network provider for safe demos and CI.
 *
 * Architectural decision:
 * - Instead of mocking downstream in many places, we provide an LLMProvider that reads
 *   deterministic snapshots and returns them as if they came from the provider.
 * - This prevents accidental API spend and makes Loom demos stable.
 */
export class DemoDataProvider implements LLMProvider {
  readonly name: ProviderName = "other";
  readonly model: string;

  private readonly snapshotsByKey: Map<string, DemoSnapshot>;

  constructor(args: { modelConfig: ModelConfig; snapshots: DemoSnapshot[] }) {
    this.model = args.modelConfig.model;
    this.snapshotsByKey = new Map(args.snapshots.map((s) => [s.key, s]));
  }

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const key = demoKey({ system: input.system, prompt: input.prompt });
    const snap = this.snapshotsByKey.get(key);
    if (!snap) {
      throw new ProviderError("DemoDataProvider missing snapshot for prompt", {
        code: "INVALID_REQUEST",
        provider: "other",
        model: this.model,
        retryable: false,
        requestId: input.requestId,
        cause: { key },
      });
    }
    return snap.output;
  }
}

export function demoKey(args: { system?: string; prompt: string }): string {
  // Stable key: system + prompt. Keep it simple and deterministic.
  return JSON.stringify({ system: args.system ?? "", prompt: args.prompt });
}

export async function loadDemoSnapshots(path: string): Promise<DemoSnapshot[]> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as { snapshots: DemoSnapshot[] } | DemoSnapshot[];
  return Array.isArray(parsed) ? parsed : parsed.snapshots;
}

export function createDemoProvider(args: {
  modelConfig: ModelConfig;
  providerConfig: ProviderConfig;
  snapshotPath: string;
}): Promise<DemoDataProvider> {
  void args.providerConfig; // reserved for future overrides
  return loadDemoSnapshots(args.snapshotPath).then((snapshots) => new DemoDataProvider({ modelConfig: args.modelConfig, snapshots }));
}

