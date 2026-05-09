import { z } from "zod";

const argsSchema = z.object({
  baseline: z.string().min(1),
  candidate: z.string().min(1),
  json: z.string().optional(),
  markdown: z.string().optional(),
});

export type RegressionRunnerArgs = z.infer<typeof argsSchema>;

/**
 * Minimal argv parsing to avoid pulling a CLI framework.
 * Supported:
 * - --baseline <id>
 * - --candidate <id>
 * - --json <path>
 * - --markdown <path>
 */
export function parseArgs(argv: string[]): RegressionRunnerArgs {
  const map: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const val = argv[i + 1];
    if (!val || val.startsWith("--")) map[key] = "true";
    else {
      map[key] = val;
      i += 1;
    }
  }
  const parsed = argsSchema.safeParse(map);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid arguments:\n${msg}`);
  }
  return parsed.data;
}

