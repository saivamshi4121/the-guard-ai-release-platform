import type { ScoreFunction } from "../engine/types.js";

function hasAny(text: string, needles: string[]): boolean {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

/**
 * EmpathyScorer is a deterministic heuristic for support responses.
 *
 * Goals:
 * - reward apology/acknowledgement and helpful tone
 * - penalize blame-y language or dismissive phrasing
 *
 * This stays numeric and cheap for CI/demo.
 */
export const EmpathyScorer: ScoreFunction = {
  id: "empathy_score",
  name: "Empathy (heuristic)",
  async score({ evalCase, output }) {
    const input = evalCase.input as { language?: string };
    const lang = (input.language ?? "en").toLowerCase();
    const text = (output.text ?? "").trim();

    const empathyEn = ["sorry", "apolog", "i understand", "we understand", "thanks for reaching out", "thank you for"];
    const empathyTe = ["క్షమించండి", "సారీ", "మాకు అర్థం", "ధన్యవాదాలు", "మీరు చెప్పినది"];
    const empathy = lang === "te" ? empathyTe : empathyEn;

    const negative = ["it's your fault", "not our problem", "can't help", "we can't help", "stop", "do it yourself"];

    const hasEmpathy = hasAny(text, empathy);
    const hasNegative = hasAny(text, negative);

    let value = 0.5;
    const reasons: string[] = [];

    if (hasEmpathy) {
      value += 0.35;
      reasons.push("Shows empathy/apology");
    } else {
      reasons.push("Missing empathy acknowledgement");
    }

    if (hasNegative) {
      value -= 0.45;
      reasons.push("Contains blame-y/dismissive phrasing");
    }

    // Soft bonus: offers next steps.
    if (/\b(we can|we will|please share|please provide|i can help|let me help|we'll help)\b/i.test(text) || /దయచేసి|దయచేసి పంపండి|మేము సహాయం/.test(text)) {
      value += 0.15;
      reasons.push("Provides actionable next steps");
    }

    value = Math.max(0, Math.min(1, value));
    const passed = value >= 0.6;

    return {
      scorerId: "empathy_score",
      value,
      passed,
      rationale: reasons.join("; "),
      metadata: { lang, hasEmpathy, hasNegative },
    };
  },
};

