import type { PrismaClientLike } from "@the-guard/db";
import type { RunSnapshot } from "./regressionAnalyzer.js";

/**
 * Loads the minimal data needed for regression analysis.
 *
 * We intentionally avoid large joins and only pull:
 * - case tags (segmenting)
 * - per-scorer scores
 * - output text (for worst examples)
 */
export async function loadRunSnapshot(prisma: PrismaClientLike, runId: string): Promise<RunSnapshot> {
  const outputs = await (prisma as any).eval_outputs.findMany({
    where: { run_id: runId },
    select: { case_id: true, output_text: true },
  });

  const scores = await (prisma as any).eval_scores.findMany({
    where: { run_id: runId },
    select: { case_id: true, scorer_id: true, value: true, passed: true },
  });

  const traces = await (prisma as any).hallucination_traces.findMany({
    where: { run_id: runId },
    select: { case_id: true, trace: true },
  });

  const caseIds = [...new Set([...outputs.map((o: any) => o.case_id), ...scores.map((s: any) => s.case_id)])];
  const cases = await (prisma as any).eval_cases.findMany({
    where: { id: { in: caseIds } },
    select: { id: true, name: true, tags: true },
  });

  const caseMap: Record<string, { caseId: string; caseName: string; tags: string[]; scores: any; outputText?: string | null }> = {};
  for (const c of cases) {
    caseMap[c.id] = { caseId: c.id, caseName: c.name, tags: c.tags ?? [], scores: {}, outputText: null };
  }
  for (const o of outputs) {
    if (!caseMap[o.case_id]) caseMap[o.case_id] = { caseId: o.case_id, caseName: o.case_id, tags: [], scores: {}, outputText: null };
    caseMap[o.case_id].outputText = o.output_text ?? null;
  }
  for (const s of scores) {
    if (!caseMap[s.case_id]) caseMap[s.case_id] = { caseId: s.case_id, caseName: s.case_id, tags: [], scores: {}, outputText: null };
    caseMap[s.case_id].scores[s.scorer_id] = { value: s.value, passed: s.passed };
  }

  for (const t of traces) {
    if (!caseMap[t.case_id]) caseMap[t.case_id] = { caseId: t.case_id, caseName: t.case_id, tags: [], scores: {}, outputText: null };
    const unsupportedRate = t.trace?.summary?.unsupportedRate ?? 0;
    caseMap[t.case_id].scores["hallucination_unsupported_rate"] = { value: unsupportedRate, passed: unsupportedRate === 0 };
  }

  return { runId, cases: caseMap as any };
}

