import { z } from "zod";

/**
 * Runner env config is validated at startup to fail fast in CI and prod.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ENABLE_DEMO_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  // Note: apps/runner is often executed with `pnpm -C apps/runner ...`,
  // so defaults must be relative to that cwd.
  DEMO_SNAPSHOT_PATH: z.string().min(1).default("../../reports/demo/demo-snapshots.json"),
  THE_GUARD_PROVIDER: z.enum(["openai", "google"]).default("openai"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  THE_GUARD_MODEL: z.string().min(1).default("gpt-4o-mini"),
  THE_GUARD_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  THE_GUARD_MAX_RETRIES: z.coerce.number().int().nonnegative().default(0),

  MAX_RUN_COST_USD: z.coerce.number().positive().default(1.0),
  MAX_DAILY_COST_USD: z.coerce.number().positive().default(5.0),

  MAX_CASES_PER_RUN: z.coerce.number().int().positive().default(10),
  MAX_PARALLEL_EVALS: z.coerce.number().int().positive().default(2),

  MAX_INPUT_TOKENS: z.coerce.number().int().positive().default(2000),
  MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(250),

  SAFE_MODELS: z.string().default("gpt-4o-mini,gemini-1.5-flash"),

  ENABLE_BENCHMARK_SWEEPS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type RunnerEnv = z.infer<typeof envSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv): RunnerEnv {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${msg}`);
  }
  return parsed.data;
}

