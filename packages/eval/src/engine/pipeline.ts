import type { ScoreFunction, ScorePipeline, ScoreResult } from "./types.js";

/**
 * Default score pipeline executes scorers sequentially.
 *
 * Architectural decision:
 * - sequential keeps logs readable and avoids surprise parallelism costs
 * - tasks can implement custom pipelines later if needed (e.g. parallel cheap scorers)
 */
export function createScorePipeline(scorers: ScoreFunction[]): ScorePipeline {
  return {
    async run(args) {
      const results: ScoreResult[] = [];
      for (const scorer of scorers) {
        const res = await scorer.score(args);
        results.push({ ...res, scorerId: scorer.id });
      }
      return results;
    },
  };
}

