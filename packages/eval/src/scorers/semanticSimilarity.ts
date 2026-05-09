import type { ScoreFunction } from "../engine/types.js";

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * SemanticSimilarityScorer is a lightweight baseline.
 *
 * Architectural decision:
 * - avoid embeddings/extra calls in the core engine
 * - provide a deterministic similarity score suitable for CI-like gating
 *
 * You can later swap this with an embeddings-based scorer without changing engine contracts.
 */
export const SemanticSimilarityScorer: ScoreFunction = {
  id: "semantic_similarity",
  name: "Semantic Similarity (token Jaccard)",
  async score({ evalCase, output }) {
    const expected = (evalCase.expected as { referenceCopy?: string } | null | undefined)?.referenceCopy;
    if (!expected) {
      return {
        scorerId: "semantic_similarity",
        value: 0.5,
        passed: true,
        rationale: "No reference copy provided; skipping similarity check",
        metadata: { skipped: true },
      };
    }

    const outToks = tokenize(output.text ?? "");
    const expToks = tokenize(expected);
    const sim = jaccard(outToks, expToks);
    const passed = sim >= 0.35;

    return {
      scorerId: "semantic_similarity",
      value: sim,
      passed,
      rationale: `Jaccard similarity ${sim.toFixed(3)} (threshold 0.35)`,
      metadata: { similarity: sim, threshold: 0.35 },
    };
  },
};

