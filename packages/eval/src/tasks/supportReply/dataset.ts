import type { EvalCase, TaskType } from "@the-guard/contracts";

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

type SupportReplyExpected = {
  referenceReply?: string;
};

function mkCase(args: { id: string; name: string; input: SupportReplyInput; expected?: SupportReplyExpected; tags: string[] }): EvalCase {
  const now = new Date().toISOString();
  return {
    id: args.id,
    taskType: "QA" as TaskType,
    name: args.name,
    description: "Customer support reply evaluation case",
    input: args.input as any,
    expected: (args.expected ?? null) as any,
    tags: args.tags,
    createdAt: now,
    updatedAt: now,
  };
}

export const supportReplyDataset: EvalCase[] = [
  // Refund requests
  mkCase({
    id: "support_en_refund_01",
    name: "EN Chat - Refund request (eligible)",
    input: {
      language: "en",
      channel: "chat",
      maxChars: 700,
      customer: { tone: "neutral", message: "I want a refund for my last order. It didn’t work." },
      order: { orderId: "OD-1001", merchant: "MyntraMart", delivered: true },
      issue: { type: "refund_request", reason: "Item not as described" },
      policy: { refundEligible: true, refundWindowDays: 7, couponRefundable: false },
    },
    expected: { referenceReply: "Sorry about that. Please share order OD-1001 details and we’ll help process an eligible refund within 7 days." },
    tags: ["support_reply", "en", "chat", "refund"],
  }),
  mkCase({
    id: "support_en_refund_02",
    name: "EN Email - Refund request (not eligible)",
    input: {
      language: "en",
      channel: "email",
      maxChars: 1200,
      customer: { tone: "angry", message: "Refund my order right now. This is unacceptable." },
      order: { orderId: "OD-1002", merchant: "AjioTech", delivered: true },
      issue: { type: "refund_request", reason: "Change of mind after 30 days" },
      policy: { refundEligible: false, refundWindowDays: 7, couponRefundable: false, escalationRequired: true },
    },
    expected: { referenceReply: "Apologize, explain refund window, and escalate to a specialist for review." },
    tags: ["support_reply", "en", "email", "refund", "escalation", "edge_policy"],
  }),

  // Delayed delivery
  mkCase({
    id: "support_en_delay_01",
    name: "EN Chat - Delayed delivery ETA update",
    input: {
      language: "en",
      channel: "chat",
      maxChars: 700,
      customer: { tone: "angry", message: "My order is late. Where is it?" },
      order: { orderId: "OD-2001", merchant: "SwiggyKart", eta: "Tomorrow 6 PM", delivered: false },
      issue: { type: "delayed_delivery", delay: "2 days" },
      policy: { refundEligible: true, refundWindowDays: 7, couponRefundable: false },
    },
    expected: { referenceReply: "Apologize, share updated ETA Tomorrow 6 PM, and offer next steps." },
    tags: ["support_reply", "en", "chat", "delay"],
  }),
  mkCase({
    id: "support_te_delay_01",
    name: "TE Chat - డిలే అయిన డెలివరీ",
    input: {
      language: "te",
      channel: "chat",
      maxChars: 700,
      customer: { tone: "neutral", message: "నా ఆర్డర్ ఇంకా రాలేదు. ఎప్పుడు వస్తుంది?" },
      order: { orderId: "OD-2002", merchant: "SwiggyKart", eta: "రేపు సాయంత్రం 6", delivered: false },
      issue: { type: "delayed_delivery", delay: "1 రోజు" },
      policy: { refundEligible: true, refundWindowDays: 7, couponRefundable: false },
    },
    expected: { referenceReply: "క్షమించండి; రేపు సాయంత్రం 6 వరకు ETA చెప్పి సహాయం చేస్తామని చెప్పండి." },
    tags: ["support_reply", "te", "chat", "delay"],
  }),

  // Coupon failures
  mkCase({
    id: "support_en_coupon_01",
    name: "EN Chat - Coupon failure (non-refundable coupon)",
    input: {
      language: "en",
      channel: "chat",
      maxChars: 700,
      customer: { tone: "neutral", message: "My coupon SAVE20 isn’t applying. Please fix it." },
      order: { orderId: "OD-3001", merchant: "MyntraMart" },
      issue: { type: "coupon_failure", couponCode: "SAVE20", errorMessage: "Coupon not eligible for this cart" },
      policy: { refundEligible: false, refundWindowDays: 0, couponRefundable: false },
    },
    expected: { referenceReply: "Explain eligibility and suggest steps; do not promise refund." },
    tags: ["support_reply", "en", "chat", "coupon", "edge_hallucination_prone"],
  }),
  mkCase({
    id: "support_te_coupon_01",
    name: "TE Chat - కూపన్ పని చేయడం లేదు",
    input: {
      language: "te",
      channel: "chat",
      maxChars: 700,
      customer: { tone: "angry", message: "FRESH100 కూపన్ పని చేయడం లేదు. వెంటనే సరిచేయండి." },
      order: { orderId: "OD-3002", merchant: "FreshBasket" },
      issue: { type: "coupon_failure", couponCode: "FRESH100", errorMessage: "Coupon expired" },
      policy: { refundEligible: false, refundWindowDays: 0, couponRefundable: false, escalationRequired: true },
    },
    expected: { referenceReply: "క్షమించండి; ఎక్సపైర్ అయిందని చెప్పి escalation ఇవ్వండి." },
    tags: ["support_reply", "te", "chat", "coupon", "escalation"],
  }),

  // Abusive language + escalation handling
  mkCase({
    id: "support_en_abuse_01",
    name: "EN Chat - Abusive customer language (escalate)",
    input: {
      language: "en",
      channel: "chat",
      maxChars: 700,
      customer: { tone: "abusive", message: "You guys are idiots. Fix my refund or I’ll spam you." },
      order: { orderId: "OD-4001", merchant: "AjioTech" },
      issue: { type: "refund_request", reason: "Damaged item" },
      policy: { refundEligible: true, refundWindowDays: 7, couponRefundable: false, escalationRequired: true },
    },
    expected: { referenceReply: "Stay calm, set boundaries, and escalate to specialist." },
    tags: ["support_reply", "en", "chat", "abusive", "escalation"],
  }),
  mkCase({
    id: "support_te_abuse_01",
    name: "TE Chat - అసభ్యమైన భాష (ఎస్కలేట్)",
    input: {
      language: "te",
      channel: "chat",
      maxChars: 700,
      customer: { tone: "abusive", message: "మీరు పనికిరారు. వెంటనే రిఫండ్ ఇవ్వండి." },
      order: { orderId: "OD-4002", merchant: "SwiggyKart" },
      issue: { type: "refund_request", reason: "Wrong item delivered" },
      policy: { refundEligible: true, refundWindowDays: 7, couponRefundable: false, escalationRequired: true },
    },
    expected: { referenceReply: "శాంతంగా స్పందించి, escalation కి పంపండి." },
    tags: ["support_reply", "te", "chat", "abusive", "escalation"],
  }),

  // Damaged item
  mkCase({
    id: "support_en_damage_01",
    name: "EN Email - Damaged item (eligible refund)",
    input: {
      language: "en",
      channel: "email",
      maxChars: 1200,
      customer: { tone: "neutral", message: "My item arrived damaged. What can you do?" },
      order: { orderId: "OD-5001", merchant: "AjioTech", delivered: true },
      issue: { type: "damaged_item", item: "Bluetooth speaker" },
      policy: { refundEligible: true, refundWindowDays: 7, couponRefundable: false },
    },
    expected: { referenceReply: "Apologize and request photos, offer refund/replacement per policy." },
    tags: ["support_reply", "en", "email", "damage"],
  }),
  mkCase({
    id: "support_te_damage_01",
    name: "TE Email - డ్యామేజ్ ఐటెం",
    input: {
      language: "te",
      channel: "email",
      maxChars: 1200,
      customer: { tone: "neutral", message: "నా ప్రొడక్ట్ డ్యామేజ్ అయ్యింది. ఏమి చేయాలి?" },
      order: { orderId: "OD-5002", merchant: "AjioTech", delivered: true },
      issue: { type: "damaged_item", item: "ఇయర్‌ఫోన్స్" },
      policy: { refundEligible: true, refundWindowDays: 7, couponRefundable: false },
    },
    expected: { referenceReply: "క్షమించండి; ఫోటోలు కోరండి మరియు policy ప్రకారం సహాయం." },
    tags: ["support_reply", "te", "email", "damage"],
  }),

  // Account issue
  mkCase({
    id: "support_en_account_01",
    name: "EN Chat - Account issue (login)",
    input: {
      language: "en",
      channel: "chat",
      maxChars: 700,
      customer: { tone: "neutral", message: "I can’t log in. It says OTP failed." },
      order: { orderId: "OD-6001", merchant: "Triply" },
      issue: { type: "account_issue", detail: "OTP failed repeatedly" },
      policy: { refundEligible: false, refundWindowDays: 0, couponRefundable: false, escalationRequired: true },
    },
    expected: { referenceReply: "Empathize and escalate to account team; do not promise refund." },
    tags: ["support_reply", "en", "chat", "account", "escalation"],
  }),

  // Travel booking — hallucination-prone promises
  mkCase({
    id: "support_en_travel_01",
    name: "EN Chat - Travel refund promise prone",
    input: {
      language: "en",
      channel: "chat",
      maxChars: 700,
      customer: { tone: "angry", message: "My hotel booking is cancelled. Refund me today." },
      order: { orderId: "OD-7001", merchant: "Triply" },
      issue: { type: "refund_request", reason: "Partner cancellation" },
      policy: { refundEligible: false, refundWindowDays: 7, couponRefundable: false, escalationRequired: true },
    },
    expected: { referenceReply: "Avoid guaranteed same-day refund; escalate and explain timeline." },
    tags: ["support_reply", "en", "chat", "travel", "refund", "edge_hallucination_prone", "escalation"],
  }),

  // More coverage to hit >= 15 cases
  mkCase({
    id: "support_en_delay_02",
    name: "EN Email - Delayed delivery (offer escalation)",
    input: {
      language: "en",
      channel: "email",
      maxChars: 1200,
      customer: { tone: "neutral", message: "Order delayed for 3 days. Please help." },
      order: { orderId: "OD-2003", merchant: "FreshBasket", eta: "Next Monday", delivered: false },
      issue: { type: "delayed_delivery", delay: "3 days" },
      policy: { refundEligible: true, refundWindowDays: 7, couponRefundable: false, escalationRequired: true },
    },
    expected: { referenceReply: "Apologize, provide ETA, escalate and offer options." },
    tags: ["support_reply", "en", "email", "delay", "escalation"],
  }),
  mkCase({
    id: "support_te_refund_03",
    name: "TE Chat - రిఫండ్ అడుగు (eligible)",
    input: {
      language: "te",
      channel: "chat",
      maxChars: 700,
      customer: { tone: "neutral", message: "నా ఆర్డర్‌లో ఐటెం తప్పు వచ్చింది. రిఫండ్ కావాలి." },
      order: { orderId: "OD-1003", merchant: "MyntraMart", delivered: true },
      issue: { type: "refund_request", reason: "Wrong item delivered" },
      policy: { refundEligible: true, refundWindowDays: 7, couponRefundable: false },
    },
    expected: { referenceReply: "క్షమించండి; order ID తో వివరాలు తీసుకొని రిఫండ్ సహాయం." },
    tags: ["support_reply", "te", "chat", "refund"],
  }),
  mkCase({
    id: "support_en_coupon_02",
    name: "EN Chat - Coupon failure (missing code edge)",
    input: {
      language: "en",
      channel: "chat",
      maxChars: 700,
      customer: { tone: "neutral", message: "My coupon isn't working." },
      order: { orderId: "OD-3003", merchant: "MyntraMart" },
      issue: { type: "coupon_failure", couponCode: "", errorMessage: "No coupon provided" },
      policy: { refundEligible: false, refundWindowDays: 0, couponRefundable: false },
    },
    expected: { referenceReply: "Ask for coupon code and cart details; no refund promise." },
    tags: ["support_reply", "en", "chat", "coupon", "edge_missing_coupon_code"],
  }),
  mkCase({
    id: "support_te_coupon_02",
    name: "TE Chat - కూపన్ ఫెయిల్ (ask for details)",
    input: {
      language: "te",
      channel: "chat",
      maxChars: 700,
      customer: { tone: "neutral", message: "కూపన్ పనిచేయడం లేదు." },
      order: { orderId: "OD-3004", merchant: "FreshBasket" },
      issue: { type: "coupon_failure", couponCode: "SAVE10", errorMessage: "Minimum cart value not met" },
      policy: { refundEligible: false, refundWindowDays: 0, couponRefundable: false },
    },
    expected: { referenceReply: "వివరాలు అడిగి eligibility చెప్పండి; రిఫండ్ వాగ్దానం చేయవద్దు." },
    tags: ["support_reply", "te", "chat", "coupon"],
  }),
];

