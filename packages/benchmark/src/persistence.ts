import type { PrismaClientLike } from "@the-guard/db";
import type { BenchmarkMatrix } from "./types.js";

export async function persistBenchmark(prisma: PrismaClientLike, args: { id: string; taskType?: string | null; matrix: BenchmarkMatrix }) {
  await (prisma as any).benchmark_summaries.create({
    data: {
      id: args.id,
      task_type: args.taskType ?? null,
      summary_json: args.matrix as any,
    },
  });
  for (const rec of args.matrix.recommendations) {
    await (prisma as any).benchmark_recommendations.create({
      data: {
        summary_id: args.id,
        recommendation: rec.text,
        metadata: (rec.metadata ?? null) as any,
      },
    });
  }
}

