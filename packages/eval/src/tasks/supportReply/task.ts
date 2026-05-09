import type { EvalTaskDefinition } from "../../engine/types.js";
import { FormatComplianceScorer } from "../../scorers/formatCompliance.js";
import { SemanticSimilarityScorer } from "../../scorers/semanticSimilarity.js";
import { EmpathyScorer } from "../../scorers/empathy.js";
import { PolicyGroundingScorer } from "../../scorers/policyGrounding.js";
import type { TaskType } from "@the-guard/contracts";

type SupportReplyInput = {
  language: "en" | "te";
  channel: "chat" | "email";
  maxChars?: number;
  customer: {
    name?: string;
    tone?: "neutral" | "angry" | "abusive";
    message: string;
  };
  order: {
    orderId: string;
    merchant: string;
    eta?: string;
    delivered?: boolean;
  };
  issue:
    | { type: "refund_request"; reason: string }
    | { type: "delayed_delivery"; delay: string }
    | { type: "coupon_failure"; couponCode: string; errorMessage?: string }
    | { type: "damaged_item"; item: string }
    | { type: "account_issue"; detail: string };
  policy: {
    refundEligible: boolean;
    refundWindowDays: number;
    couponRefundable: boolean;
    escalationRequired?: boolean;
  };
};

export const SupportReplyEvalTask: EvalTaskDefinition<SupportReplyInput> = {
  id: "support_reply_v1",
  name: "Support Reply Evaluation",
  taskType: "QA" as TaskType,
  version: 1,

  renderPrompt({ input }) {
    const langRules = input.language === "te" ? "Write in Telugu." : "Write in English.";
    const channelRules =
      input.channel === "email"
        ? "Write a short email reply (2–6 sentences)."
        : "Write a chat reply (2–5 sentences).";
    const toneRules =
      input.customer.tone === "abusive"
        ? "Be calm and professional. Set boundaries about respectful language."
        : input.customer.tone === "angry"
          ? "Be calm and empathetic."
          : "Be helpful and concise.";

    const issue = input.issue;
    const issueLine =
      issue.type === "refund_request"
        ? `Issue: Refund request. Reason: ${issue.reason}.`
        : issue.type === "delayed_delivery"
          ? `Issue: Delayed delivery. Delay: ${issue.delay}. ETA: ${input.order.eta ?? "unknown"}.`
          : issue.type === "coupon_failure"
            ? `Issue: Coupon failure. Coupon: ${issue.couponCode || "(missing)"}. Error: ${issue.errorMessage ?? "unknown"}.`
            : issue.type === "damaged_item"
              ? `Issue: Damaged item. Item: ${issue.item}.`
              : `Issue: Account issue. Detail: ${issue.detail}.`;

    const policy = input.policy;
    const policyLines = [
      `Policy facts:`,
      `- refundEligible: ${policy.refundEligible ? "true" : "false"}`,
      `- refundWindowDays: ${policy.refundWindowDays}`,
      `- couponRefundable: ${policy.couponRefundable ? "true" : "false"}`,
      `- escalationRequired: ${policy.escalationRequired ? "true" : "false"}`,
    ].join("\n");

    const maxChars = input.maxChars ?? 800;

    return {
      system: "You are a customer support agent. Never promise outcomes that contradict policy facts. Avoid absolute guarantees.",
      prompt: [
        `${langRules} ${channelRules} ${toneRules}`,
        `Keep it under ${maxChars} characters.`,
        "",
        `Customer message: ${input.customer.message}`,
        `Order: ${input.order.orderId} (${input.order.merchant}).`,
        issueLine,
        "",
        policyLines,
        "",
        "Include: (a) empathy, (b) next steps, (c) escalation guidance if required.",
        "Return only the reply text (no bullet labels, no analysis).",
      ].join("\n"),
    };
  },

  parseOutput(text) {
    const warnings: string[] = [];
    if (/```/.test(text)) warnings.push("Contains markdown fence");
    if (/^\s*\{[\s\S]*\}\s*$/.test(text.trim())) warnings.push("Looks like JSON; expected plain text");
    return { warnings };
  },

  scorers: [FormatComplianceScorer, EmpathyScorer, PolicyGroundingScorer, SemanticSimilarityScorer],

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

