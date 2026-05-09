import { prisma } from "@the-guard/db";
import { estimateCostFromTokens, getProviderAsync, type LLMProvider } from "@the-guard/llm";
import type { ModelConfig } from "@the-guard/contracts";
import { CostGuardService, DealCopyEvalTask, ModelPolicyService, dealCopyDataset, createEvalRunner, estimateTokens, truncateToTokenLimit, EvalPersistenceService } from "@the-guard/eval";
import { loadEnv } from "./env.js";
import { createConsoleLogger } from "./logger.js";

/**
 * Minimal runner CLI.
 *
 * Architectural decision:
 * - keep args parsing minimal; start with env-based configuration
 * - add richer CLI flags only when needed (avoid overengineering)
 */
async function main() {
  const env = loadEnv(process.env);
  const logger = createConsoleLogger();

  const runId = crypto.randomUUID();
  const modelConfig: ModelConfig = {
    provider: env.THE_GUARD_PROVIDER,
    model: env.THE_GUARD_MODEL,
    temperature: 0.2,
    maxOutputTokens: env.MAX_OUTPUT_TOKENS,
  };

  const safeModels = env.SAFE_MODELS.split(",").map((s) => s.trim()).filter(Boolean);
  const policy = new ModelPolicyService({ safeModels, demoMode: env.ENABLE_DEMO_MODE });
  policy.assertAllowed(modelConfig);

  const baseProvider = await getProviderAsync({
    modelConfig,
    providerConfig: {
      apiKey: env.THE_GUARD_PROVIDER === "openai" ? env.OPENAI_API_KEY : env.GEMINI_API_KEY,
      timeoutMs: env.THE_GUARD_TIMEOUT_MS,
      maxRetries: env.ENABLE_DEMO_MODE ? 0 : env.THE_GUARD_MAX_RETRIES,
    },
    demoMode: env.ENABLE_DEMO_MODE ? { enabled: true, snapshotPath: env.DEMO_SNAPSHOT_PATH } : { enabled: false },
  });

  const persistence = new EvalPersistenceService(prisma as any);
  await persistence.createRun({ runId, taskType: DealCopyEvalTask.taskType, modelConfig: modelConfig as any });

  const runner = createEvalRunner({ persistence });

  // Run size limits (safe-by-default)
  const dataset = dealCopyDataset.slice(0, env.MAX_CASES_PER_RUN);

  const costGuard = new CostGuardService(prisma as any, { maxRunCostUsd: env.MAX_RUN_COST_USD, maxDailyCostUsd: env.MAX_DAILY_COST_USD });
  logger.info("[CostGuard] limits", { maxRunUsd: env.MAX_RUN_COST_USD, maxDailyUsd: env.MAX_DAILY_COST_USD, demoMode: env.ENABLE_DEMO_MODE });

  // Guarded provider enforces token truncation + cost projections pre-call.
  const provider: LLMProvider = {
    name: baseProvider.name,
    model: baseProvider.model,
    async generate(input) {
      const combinedPrompt = `${input.system ?? ""}\n\n${input.prompt}`;
      const truncated = truncateToTokenLimit(combinedPrompt, env.MAX_INPUT_TOKENS);
      const inputTokens = estimateTokens(truncated.text);
      const outputTokens = env.MAX_OUTPUT_TOKENS;

      const projected = estimateCostFromTokens({
        provider: modelConfig.provider,
        model: modelConfig.model,
        inputTokens,
        outputTokens,
      });

      logger.info("[CostGuard] projection", {
        currentRun: (await costGuard.getCurrentRunUsd(runId)).toFixed(2),
        projectedNext: projected.totalCost.toFixed(4),
        limitRun: env.MAX_RUN_COST_USD.toFixed(2),
        limitDaily: env.MAX_DAILY_COST_USD.toFixed(2),
      });

      await costGuard.assertWithinLimits({ runId, projectedNextCallUsd: projected.totalCost, caseId: input.requestId ?? null });

      // Preserve the original structure for demo snapshot keys by applying truncation consistently.
      const system = input.system ? truncateToTokenLimit(input.system, Math.floor(env.MAX_INPUT_TOKENS / 4)).text : undefined;
      const prompt = truncateToTokenLimit(input.prompt, env.MAX_INPUT_TOKENS).text;

      return baseProvider.generate({
        ...input,
        system,
        prompt,
        overrides: { ...(input.overrides ?? {}), maxOutputTokens: env.MAX_OUTPUT_TOKENS },
      });
    },
  };

  const result = await runner.run({
    ctx: {
      runId,
      taskType: DealCopyEvalTask.taskType,
      modelConfig,
      provider,
      now: () => new Date(),
      logger,
    },
    task: DealCopyEvalTask,
    dataset,
  });

  logger.info("Run summary", result as any);
  if (result.verdict === "NO_GO") process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

