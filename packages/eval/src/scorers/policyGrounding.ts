import type { ScoreFunction } from "../engine/types.js";

function includesLoose(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * PolicyGroundingScorer checks that the response doesn't promise outcomes that violate policy facts.
 *
 * This is intentionally conservative and deterministic.
 */
export const PolicyGroundingScorer: ScoreFunction = {
  id: "policy_grounding",
  name: "Policy Grounding",
  async score({ evalCase, output }) {
    const input = evalCase.input as {
      policy?: {
        refundEligible?: boolean;
        refundWindowDays?: number;
        couponRefundable?: boolean;
        escalationRequired?: boolean;
      };
    };

    const policy = input.policy ?? {};
    const text = (output.text ?? "").trim();
    const violations: string[] = [];
    const missing: string[] = [];

    const mentionsRefund = /\b(refund|refunded|money back)\b/i.test(text) || /రిఫండ్/.test(text);
    const mentionsGuaranteed = /\b(guarantee|guaranteed|surely)\b/i.test(text) || /ఖచ్చితంగా/.test(text);

    if (policy.refundEligible === false && mentionsRefund) {
      violations.push("Promised refund when refundEligible=false");
    }

    if (policy.couponRefundable === false && /\b(coupon|promo)\b/i.test(text) && mentionsRefund) {
      violations.push("Implied coupon is refundable when couponRefundable=false");
    }

    if (policy.escalationRequired === true) {
      const mentionsEscalation = /\b(escalate|specialist|supervisor|team)\b/i.test(text) || /ఎస్కలేట్|సూపర్వైజర్|టీమ్/.test(text);
      if (!mentionsEscalation) missing.push("Missing escalation guidance when required");
    }

    if (mentionsGuaranteed) {
      // Support replies should avoid absolute guarantees.
      violations.push("Contains absolute guarantee language");
    }

    const passed = violations.length === 0 && missing.length === 0;
    const value = Math.max(0, 1 - violations.length * 0.6 - missing.length * 0.25);

    const rationaleParts = [
      ...(violations.length ? [`Violations: ${violations.join(", ")}`] : []),
      ...(missing.length ? [`Missing: ${missing.join(", ")}`] : []),
    ];

    return {
      scorerId: "policy_grounding",
      value,
      passed,
      rationale: rationaleParts.length ? rationaleParts.join("; ") : "No policy-violating promises detected",
      metadata: { violations, missing, policy },
    };
  },
};

