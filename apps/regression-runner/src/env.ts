import { z } from "zod";

const envSchema = z.object({
  ENABLE_DEMO_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  // apps/regression-runner is often executed with `pnpm -C apps/regression-runner ...`
  DEMO_REGRESSION_REPORT_PATH: z.string().min(1).default("../../reports/demo/demo-regression-report.json"),
});

export type RegressionRunnerEnv = z.infer<typeof envSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv): RegressionRunnerEnv {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = (parsed.error as any).issues ?? [];
    const msg = issues.map((e: any) => `${(e.path ?? []).join(".")}: ${e.message}`).join("\n");
    throw new Error(`Invalid env:\n${msg}`);
  }
  return parsed.data;
}

