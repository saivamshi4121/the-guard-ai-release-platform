import type { ScoreFunction } from "../engine/types.js";

/**
 * FormatComplianceScorer checks hard constraints that are cheap and deterministic:
 * - channel-specific length
 * - presence/absence of forbidden patterns
 - basic language sanity (very light)
 *
 * Architectural decision:
 * - keep this scorer purely rule-based to avoid LLM-in-the-loop scoring costs
 */
export const FormatComplianceScorer: ScoreFunction = {
  id: "format_compliance",
  name: "Format Compliance",
  async score({ evalCase, output }) {
    const input = evalCase.input as { channel?: string; language?: string; maxChars?: number };
    const channel = (input.channel ?? "unknown").toLowerCase();
    const maxChars =
      input.maxChars ??
      (channel === "push" ? 120 : channel === "whatsapp" ? 500 : 280);

    const text = (output.text ?? "").trim();
    const reasons: string[] = [];
    if (!text) reasons.push("Empty output");
    if (text.length > maxChars) reasons.push(`Exceeds max length (${text.length}/${maxChars})`);
    if (/\b(as an ai|i can't|i cannot)\b/i.test(text)) reasons.push("Contains assistant disclaimer");
    if (channel === "push" && /\n/.test(text)) reasons.push("Push copy should be single-line");

    // Very light Telugu sanity check when requested: require at least one Telugu Unicode char.
    if ((input.language ?? "").toLowerCase() === "te") {
      if (!/[\u0C00-\u0C7F]/.test(text)) reasons.push("Expected Telugu output, but no Telugu characters found");
    }

    const passed = reasons.length === 0;
    const value = passed ? 1 : Math.max(0, 1 - reasons.length * 0.25);

    return {
      scorerId: "format_compliance",
      value,
      passed,
      rationale: passed ? "Meets basic format constraints" : reasons.join("; "),
      metadata: { channel, maxChars, length: text.length, reasons },
    };
  },
};

