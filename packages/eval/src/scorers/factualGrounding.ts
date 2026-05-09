import type { ScoreFunction } from "../engine/types.js";

function includesLoose(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * FactualGroundingScorer checks whether the generated copy stays grounded in provided facts.
 *
 * Architectural decision:
 * - Start with rule-based checks against a structured "facts" object in the case input.
 * - This is cheap and deterministic; later we can add an LLM-judge scorer behind a flag.
 */
export const FactualGroundingScorer: ScoreFunction = {
  id: "factual_grounding",
  name: "Factual Grounding",
  async score({ evalCase, output }) {
    const input = evalCase.input as {
      facts?: {
        brand?: string;
        dealTitle?: string;
        discountText?: string;
        validUntil?: string;
        terms?: string[];
        forbiddenClaims?: string[];
      };
    };

    const facts = input.facts ?? {};
    const text = (output.text ?? "").trim();

    const missing: string[] = [];
    const violations: string[] = [];

    // Required mentions (soft requirements; missing reduces score but doesn't always fail)
    if (facts.brand && !includesLoose(text, facts.brand)) missing.push(`brand:${facts.brand}`);
    if (facts.discountText && !includesLoose(text, facts.discountText)) missing.push(`discount:${facts.discountText}`);

    // Forbidden claims are hard failures.
    for (const claim of facts.forbiddenClaims ?? []) {
      if (includesLoose(text, claim)) violations.push(`forbiddenClaim:${claim}`);
    }

    const passed = violations.length === 0 && missing.length <= 1;
    const value = Math.max(0, 1 - missing.length * 0.15 - violations.length * 0.6);

    const rationaleParts = [
      ...(missing.length ? [`Missing: ${missing.join(", ")}`] : []),
      ...(violations.length ? [`Violations: ${violations.join(", ")}`] : []),
    ];

    return {
      scorerId: "factual_grounding",
      value,
      passed,
      rationale: rationaleParts.length ? rationaleParts.join("; ") : "Grounded in provided facts",
      metadata: { missing, violations },
    };
  },
};

