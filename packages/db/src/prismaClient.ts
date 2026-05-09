/**
 * Central Prisma client.
 *
 * Why it exists:
 * - One place to configure logging for observability
 * - One place to add request correlation in the future (via prisma middleware)
 * - Keeps the rest of the codebase depending on `@the-guard/db`, not on Prisma directly
 */
export type PrismaClientLike = {
  // Intentionally minimal: repository layer depends on only what it uses.
  // This avoids tight coupling to generated Prisma types (which require prisma generate).
  eval_runs: any;
  eval_scores: any;
  eval_outputs: any;
};

// Prisma's generated client types are created at `prisma generate` time.
// In many monorepo setups, dependency install scripts may be disabled; we keep this import dynamic.
const prismaModule: any = await import("@prisma/client");
const PrismaClientCtor: any = prismaModule.PrismaClient;

export const prisma: PrismaClientLike = new PrismaClientCtor({
  log: ["info", "warn", "error"],
});

