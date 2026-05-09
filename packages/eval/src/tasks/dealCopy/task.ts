import type { EvalTaskDefinition } from "../../engine/types.js";
import { FormatComplianceScorer } from "../../scorers/formatCompliance.js";
import { SemanticSimilarityScorer } from "../../scorers/semanticSimilarity.js";
import { FactualGroundingScorer } from "../../scorers/factualGrounding.js";
import type { EvalCase, TaskType } from "@the-guard/contracts";

type DealCopyInput = {
  language: "en" | "te";
  channel: "whatsapp" | "push";
  maxChars?: number;
  facts: {
    brand: string;
    dealTitle: string;
    discountText: string;
    validUntil?: string;
    forbiddenClaims?: string[];
  };
  audience?: "new_users" | "existing_users";
};

/**
 * Deal Copy Evaluation is the first "real" task.
 *
 * Why it exists:
 * - release safety often hinges on marketing copy correctness/compliance
 * - it's a practical task to validate latency/usage/cost tracking end-to-end
 */
export const DealCopyEvalTask: EvalTaskDefinition<DealCopyInput> = {
  id: "deal_copy_v1",
  name: "Deal Copy Evaluation",
  taskType: "QA" as TaskType,
  version: 1,

  renderPrompt({ input }) {
    const channelRules =
      input.channel === "push"
        ? `Write a single-line push notification. Keep it under ${input.maxChars ?? 120} characters.`
        : `Write a WhatsApp message. Keep it under ${input.maxChars ?? 500} characters.`;

    const langRules = input.language === "te" ? "Write in Telugu." : "Write in English.";
    const audienceRules =
      input.audience === "new_users"
        ? "Assume the user is new; be clear and welcoming."
        : input.audience === "existing_users"
          ? "Assume the user is existing; keep it concise."
          : "Keep it concise.";

    const facts = input.facts;
    const mustInclude = [
      `Brand: ${facts.brand}`,
      `Deal title: ${facts.dealTitle}`,
      `Discount: ${facts.discountText}`,
      ...(facts.validUntil ? [`Valid until: ${facts.validUntil}`] : []),
    ].join("\n");

    const forbidden = (facts.forbiddenClaims ?? []).length
      ? `Do NOT claim: ${(facts.forbiddenClaims ?? []).join(", ")}.`
      : "";

    return {
      system: "You are a marketing copywriter. Be accurate and avoid making up facts.",
      prompt: [
        `${langRules} ${channelRules} ${audienceRules}`,
        "",
        "Use only the facts below. Do not invent numbers, dates, or guarantees.",
        mustInclude,
        forbidden,
        "",
        "Return only the final copy text (no explanations).",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  },

  parseOutput(text) {
    // Deal copy is plain text; we still return warnings if it looks like JSON/markdown.
    const warnings: string[] = [];
    if (/```/.test(text)) warnings.push("Contains markdown fence");
    if (/^\s*\{[\s\S]*\}\s*$/.test(text.trim())) warnings.push("Looks like JSON; expected plain text");
    return { warnings };
  },

  scorers: [FormatComplianceScorer, SemanticSimilarityScorer, FactualGroundingScorer],

  decideCase(scores) {
    const hardFails = scores.filter((s) => !s.passed);
    if (hardFails.length > 0) {
      return {
        verdict: "NO_GO",
        reasons: hardFails.map((s) => `${s.scorerId}: ${s.rationale ?? "failed"}`),
      };
    }
    return { verdict: "GO", reasons: ["All scorers passed"] };
  },
};

export function isDealCopyCase(evalCase: EvalCase): evalCase is EvalCase {
  return evalCase.tags.includes("deal_copy");
}

