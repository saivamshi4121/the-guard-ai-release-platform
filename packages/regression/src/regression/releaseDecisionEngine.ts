import { RegressionSeverity } from "@the-guard/contracts";
import type { RegressionReport } from "../types.js";

/**
 * ReleaseDecisionEngine converts a regression report into a practical release verdict.
 *
 * Practical policy (editable later):
 * - Any BLOCKER finding => NO_GO
 * - WARN findings with strong statistical evidence => NO_GO
 * - Otherwise => GO
 * - If sample sizes are too small across key segments => INCONCLUSIVE
 */
export class ReleaseDecisionEngine {
  decide(report: RegressionReport): { verdict: "GO" | "NO_GO" | "INCONCLUSIVE"; reasons: string[]; severity: RegressionSeverity } {
    const reasons: string[] = [];

    const blocker = report.findings.find((f) => f.severity === RegressionSeverity.BLOCKER);
    if (blocker) {
      reasons.push(`BLOCKER: ${blocker.summary}`);
      return { verdict: "NO_GO", reasons, severity: RegressionSeverity.BLOCKER };
    }

    const warn = report.findings.filter((f) => f.severity === RegressionSeverity.WARN);
    if (warn.length > 0) {
      reasons.push(...warn.slice(0, 3).map((f) => `WARN: ${f.summary}`));
      return { verdict: "NO_GO", reasons, severity: RegressionSeverity.WARN };
    }

    // Inconclusive if we have too little data in key segments
    const key = report.comparisons.filter((c) => c.segment !== "overall" && (c.metric === "pass_rate:all" || c.metric === "score:factual_grounding"));
    const lowN = key.some((c) => c.n < 5);
    if (lowN) {
      reasons.push("Too few paired cases in key segments; cannot conclude safely");
      return { verdict: "INCONCLUSIVE", reasons, severity: RegressionSeverity.INFO };
    }

    reasons.push("No significant regressions detected");
    return { verdict: "GO", reasons, severity: RegressionSeverity.INFO };
  }
}

