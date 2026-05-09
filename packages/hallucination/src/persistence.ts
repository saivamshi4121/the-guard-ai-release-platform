import type { PrismaClientLike } from "@the-guard/db";
import type { HallucinationTrace } from "./types.js";

export async function persistHallucinationTrace(prisma: PrismaClientLike, trace: HallucinationTrace): Promise<void> {
  await (prisma as any).hallucination_traces.create({
    data: {
      run_id: trace.runId,
      case_id: trace.caseId,
      trace: trace as any,
    },
  });
}

