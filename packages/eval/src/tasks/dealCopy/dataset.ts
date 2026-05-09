import type { EvalCase, TaskType } from "@the-guard/contracts";

/**
 * Deal Copy dataset cases are stored as `EvalCase` for now.
 *
 * Architectural decision:
 * - Keep datasets as code (fast iteration) while the platform is being bootstrapped.
 * - Later, these cases can be stored in `eval_cases` and loaded via repositories.
 */

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

type DealCopyExpected = {
  referenceCopy?: string;
};

function mkCase(args: {
  id: string;
  name: string;
  input: DealCopyInput;
  expected?: DealCopyExpected;
  tags: string[];
}): EvalCase {
  const now = new Date().toISOString();
  return {
    id: args.id,
    taskType: "QA" as TaskType,
    name: args.name,
    description: "Deal copy generation evaluation case",
    input: args.input,
    expected: args.expected ?? null,
    tags: args.tags,
    createdAt: now,
    updatedAt: now,
  };
}

export const dealCopyDataset: EvalCase[] = [
  mkCase({
    id: "dealcopy_en_whatsapp_01",
    name: "EN WhatsApp - 50% off Shoes",
    input: {
      language: "en",
      channel: "whatsapp",
      maxChars: 420,
      facts: {
        brand: "Acme",
        dealTitle: "Weekend Footwear Sale",
        discountText: "Up to 50% off",
        validUntil: "Sunday 11:59 PM",
        forbiddenClaims: ["guaranteed", "100% safe", "free forever"],
      },
      audience: "existing_users",
    },
    expected: {
      referenceCopy: "Acme Weekend Footwear Sale: Up to 50% off. Shop before Sunday 11:59 PM.",
    },
    tags: ["deal_copy", "en", "whatsapp"],
  }),
  mkCase({
    id: "dealcopy_te_whatsapp_01",
    name: "TE WhatsApp - Grocery cashback",
    input: {
      language: "te",
      channel: "whatsapp",
      maxChars: 420,
      facts: {
        brand: "Acme",
        dealTitle: "Grocery Cashback",
        discountText: "10% cashback",
        validUntil: "ఈరోజు రాత్రి 11:59 వరకు",
        forbiddenClaims: ["guaranteed", "free forever"],
      },
      audience: "new_users",
    },
    expected: {
      referenceCopy: "Acme లో Grocery Cashback: 10% cashback. ఈరోజు రాత్రి 11:59 వరకు.",
    },
    tags: ["deal_copy", "te", "whatsapp"],
  }),
  mkCase({
    id: "dealcopy_en_push_01",
    name: "EN Push - Electronics flash sale",
    input: {
      language: "en",
      channel: "push",
      maxChars: 110,
      facts: {
        brand: "Acme",
        dealTitle: "Flash Sale",
        discountText: "Extra 15% off",
        forbiddenClaims: ["guaranteed"],
      },
    },
    expected: {
      referenceCopy: "Acme Flash Sale: Extra 15% off today. Tap to shop.",
    },
    tags: ["deal_copy", "en", "push"],
  }),

  // Fashion
  mkCase({
    id: "dealcopy_en_whatsapp_02",
    name: "EN WhatsApp - Fashion coupon required",
    input: {
      language: "en",
      channel: "whatsapp",
      maxChars: 420,
      facts: {
        brand: "MyntraMart",
        dealTitle: "Monsoon Style Drop",
        discountText: "Flat 20% off with coupon SAVE20",
        validUntil: "Friday 10:00 PM",
        forbiddenClaims: ["free forever", "guaranteed"],
      },
      audience: "new_users",
    },
    expected: {
      referenceCopy: "MyntraMart Monsoon Style Drop: Flat 20% off with coupon SAVE20. Valid until Friday 10:00 PM.",
    },
    tags: ["deal_copy", "en", "whatsapp", "fashion", "coupon"],
  }),
  mkCase({
    id: "dealcopy_en_push_02",
    name: "EN Push - Fashion (single-line constraint)",
    input: {
      language: "en",
      channel: "push",
      maxChars: 90,
      facts: {
        brand: "MyntraMart",
        dealTitle: "Sneaker Hour",
        discountText: "Up to 30% off",
        validUntil: "8 PM",
        forbiddenClaims: ["free delivery", "guaranteed"],
      },
      audience: "existing_users",
    },
    expected: {
      referenceCopy: "Sneaker Hour: Up to 30% off till 8 PM. Shop now on MyntraMart.",
    },
    tags: ["deal_copy", "en", "push", "fashion"],
  }),

  // Grocery
  mkCase({
    id: "dealcopy_te_push_01",
    name: "TE Push - Grocery coupon failure prone",
    input: {
      language: "te",
      channel: "push",
      maxChars: 110,
      facts: {
        brand: "SwiggyKart",
        dealTitle: "Daily Essentials",
        discountText: "₹100 off with coupon FRESH100",
        validUntil: "ఈరోజు 9 PM వరకు",
        forbiddenClaims: ["free forever", "100% safe", "guaranteed"],
      },
      audience: "existing_users",
    },
    expected: {
      referenceCopy: "SwiggyKart Daily Essentials: ₹100 off (FRESH100). ఈరోజు 9 PM వరకు.",
    },
    tags: ["deal_copy", "te", "push", "grocery", "coupon"],
  }),
  mkCase({
    id: "dealcopy_en_whatsapp_03",
    name: "EN WhatsApp - Grocery (misleading discount edge)",
    input: {
      language: "en",
      channel: "whatsapp",
      maxChars: 420,
      facts: {
        brand: "FreshBasket",
        dealTitle: "Green Veggies",
        discountText: "Up to 15% off selected items",
        validUntil: "Today 6 PM",
        // Edge: discourage overclaiming “15% off everything”.
        forbiddenClaims: ["15% off everything", "guaranteed"],
      },
    },
    expected: {
      referenceCopy: "FreshBasket Green Veggies: Up to 15% off selected items. Order before Today 6 PM.",
    },
    tags: ["deal_copy", "en", "whatsapp", "grocery", "edge_misleading_discount"],
  }),

  // Electronics
  mkCase({
    id: "dealcopy_en_whatsapp_04",
    name: "EN WhatsApp - Electronics (hallucination-prone warranty claim)",
    input: {
      language: "en",
      channel: "whatsapp",
      maxChars: 420,
      facts: {
        brand: "AjioTech",
        dealTitle: "Headphone Deals",
        discountText: "Extra 10% off",
        validUntil: "Sunday",
        forbiddenClaims: ["2-year warranty", "guaranteed"],
      },
    },
    expected: {
      referenceCopy: "AjioTech Headphone Deals: Extra 10% off. Valid until Sunday.",
    },
    tags: ["deal_copy", "en", "whatsapp", "electronics", "edge_hallucination_prone"],
  }),
  mkCase({
    id: "dealcopy_te_whatsapp_02",
    name: "TE WhatsApp - Electronics (format + Telugu)",
    input: {
      language: "te",
      channel: "whatsapp",
      maxChars: 420,
      facts: {
        brand: "AjioTech",
        dealTitle: "Mobile Accessories",
        discountText: "25% వరకు తగ్గింపు",
        validUntil: "ఆదివారం",
        forbiddenClaims: ["free forever", "guaranteed"],
      },
    },
    expected: {
      referenceCopy: "AjioTech లో Mobile Accessories: 25% వరకు తగ్గింపు. ఆదివారం వరకు.",
    },
    tags: ["deal_copy", "te", "whatsapp", "electronics"],
  }),

  // Travel
  mkCase({
    id: "dealcopy_en_push_03",
    name: "EN Push - Travel (dates are hallucination-prone)",
    input: {
      language: "en",
      channel: "push",
      maxChars: 110,
      facts: {
        brand: "Triply",
        dealTitle: "Weekend Getaway",
        discountText: "Save ₹500 on hotels",
        validUntil: "This weekend",
        forbiddenClaims: ["limited seats", "guaranteed", "non-stop flights"],
      },
    },
    expected: {
      referenceCopy: "Triply Weekend Getaway: Save ₹500 on hotels this weekend. Book now.",
    },
    tags: ["deal_copy", "en", "push", "travel", "edge_hallucination_prone"],
  }),
  mkCase({
    id: "dealcopy_te_push_02",
    name: "TE Push - Travel (single-line + Telugu)",
    input: {
      language: "te",
      channel: "push",
      maxChars: 110,
      facts: {
        brand: "Triply",
        dealTitle: "బీచ్ ట్రిప్ డీల్",
        discountText: "హోటళ్లపై ₹500 తగ్గింపు",
        validUntil: "ఈ వారాంతం",
        forbiddenClaims: ["guaranteed", "free forever"],
      },
    },
    expected: {
      referenceCopy: "Triply: ఈ వారాంతం హోటళ్లపై ₹500 తగ్గింపు. ఇప్పుడే బుక్ చేయండి.",
    },
    tags: ["deal_copy", "te", "push", "travel"],
  }),

  // Edge cases: missing coupon code, formatting violations, missing critical fact mention
  mkCase({
    id: "dealcopy_en_whatsapp_05",
    name: "EN WhatsApp - Missing coupon code edge",
    input: {
      language: "en",
      channel: "whatsapp",
      maxChars: 420,
      facts: {
        brand: "FreshBasket",
        dealTitle: "Pantry Staples",
        discountText: "₹150 off with coupon (code must be mentioned)",
        validUntil: "Tonight",
        forbiddenClaims: ["guaranteed", "free forever"],
      },
    },
    expected: {
      referenceCopy: "FreshBasket Pantry Staples: ₹150 off with coupon. Apply code at checkout. Valid until Tonight.",
    },
    tags: ["deal_copy", "en", "whatsapp", "grocery", "edge_missing_coupon_code"],
  }),
  mkCase({
    id: "dealcopy_en_push_04",
    name: "EN Push - Formatting violation prone (tight maxChars)",
    input: {
      language: "en",
      channel: "push",
      maxChars: 70,
      facts: {
        brand: "Acme",
        dealTitle: "Flash Sale",
        discountText: "Extra 15% off",
        validUntil: "2 hours",
        forbiddenClaims: ["guaranteed"],
      },
    },
    expected: {
      referenceCopy: "Acme Flash Sale: Extra 15% off for 2 hours. Shop now.",
    },
    tags: ["deal_copy", "en", "push", "electronics", "edge_formatting"],
  }),
  mkCase({
    id: "dealcopy_te_whatsapp_03",
    name: "TE WhatsApp - Misleading 'free delivery' forbidden",
    input: {
      language: "te",
      channel: "whatsapp",
      maxChars: 420,
      facts: {
        brand: "SwiggyKart",
        dealTitle: "సూపర్ సేవింగ్స్",
        discountText: "ఆర్డర్‌పై 12% తగ్గింపు",
        validUntil: "ఈరోజు",
        forbiddenClaims: ["free delivery", "ఫ్రీ డెలివరీ", "guaranteed"],
      },
    },
    expected: {
      referenceCopy: "SwiggyKart సూపర్ సేవింగ్స్: ఆర్డర్‌పై 12% తగ్గింపు. ఈరోజు వరకు.",
    },
    tags: ["deal_copy", "te", "whatsapp", "grocery", "edge_forbidden_claim"],
  }),
  
  // Fashion: missing coupon code edge (semantic mismatch vs reference copy)
  mkCase({
    id: "dealcopy_en_push_06",
    name: "EN Push - Fashion missing coupon code edge",
    input: {
      language: "en",
      channel: "push",
      maxChars: 90,
      facts: {
        brand: "MyntraMart",
        dealTitle: "Winter Jackets",
        // Edge: coupon code is intentionally NOT present in discountText.
        discountText: "Flat 15% off with coupon (code must be mentioned)",
        validUntil: "Saturday 9 PM",
        forbiddenClaims: ["guaranteed", "free forever"],
      },
      audience: "new_users",
    },
    expected: {
      // Reference includes the coupon code to make semantic similarity fail
      // when model output omits SAVE15.
      referenceCopy: "MyntraMart Winter Jackets: Flat 15% off with coupon SAVE15. Valid until Saturday 9 PM.",
    },
    tags: ["deal_copy", "en", "push", "fashion", "edge_missing_coupon_code"],
  }),

  // Grocery: hallucination-prone absolute "free delivery" edge.
  mkCase({
    id: "dealcopy_te_whatsapp_04",
    name: "TE WhatsApp - Grocery hallucination-prone free delivery",
    input: {
      language: "te",
      channel: "whatsapp",
      maxChars: 420,
      facts: {
        brand: "FreshBasket",
        dealTitle: "Veg Essentials",
        // Edge: "free delivery" is explicitly included in discountText and
        // forbiddenClaims will force a factual grounding failure.
        discountText: "20% వరకు తగ్గింపు + free delivery",
        validUntil: "ఈ ఆదివారం",
        forbiddenClaims: ["free delivery", "ఫ్రీ డెలివరీ", "guaranteed"],
      },
      audience: "existing_users",
    },
    expected: {
      referenceCopy: "FreshBasket లో Veg Essentials: 20% వరకు తగ్గింపు + free delivery. ఈ ఆదివారం వరకు.",
    },
    tags: ["deal_copy", "te", "whatsapp", "grocery", "edge_hallucination_prone", "free_delivery_forbidden"],
  }),
];

