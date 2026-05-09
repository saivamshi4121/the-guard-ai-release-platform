import type {
  BenchmarkSummary,
  RegressionReportSummary,
  ReleaseDecisionMock,
  RunDetail,
  RunSummary,
  ReleaseOverviewMock,
  ReleaseHistoryMock,
  BenchmarkDashboardMock,
} from "./types";

export const mockReleaseDecision: ReleaseDecisionMock = {
  verdict: "NO_GO",
  confidence: "95%",
  topRegression: "Telugu WhatsApp copy",
  hallucinations: 3,
  costDelta: "+12.4%",
};

export const mockRuns: RunSummary[] = [
  {
    id: "run_001",
    title: "Deal Copy v1 — Candidate",
    provider: "google",
    model: "gemini-1.5-flash",
    task: "deal_copy_v1",
    status: "COMPLETED",
    createdAt: "2026-05-07 10:12",
  },
  {
    id: "run_000",
    title: "Deal Copy v1 — Baseline",
    provider: "openai",
    model: "gpt-4o-mini",
    task: "deal_copy_v1",
    status: "COMPLETED",
    createdAt: "2026-05-07 09:41",
  },
  {
    id: "run_002",
    title: "Deal Copy v1 — Retry",
    provider: "openai",
    model: "gpt-4o-mini",
    task: "deal_copy_v1",
    status: "FAILED",
    createdAt: "2026-05-07 10:19",
  },
];

export const mockRunDetail: Record<string, RunDetail> = {
  run_001: {
    ...mockRuns[0]!,
    latencyMsAvg: 842,
    totalCostUsd: 0.1284,
    tokenUsage: { input: 8321, output: 2610 },
    scores: [
      { scorer: "format_compliance", value: 0.92, passed: true },
      { scorer: "semantic_similarity", value: 0.44, passed: true },
      { scorer: "factual_grounding", value: 0.71, passed: false },
    ],
    outputs: [
      {
        caseName: "Myntra Telugu Push",
        channel: "push",
        language: "te",
        outputText: "Acme ఫ్లాష్ సేల్: Extra 15% off—ఇప్పుడే ట్యాప్ చేయండి.",
        verdict: "NO_GO",
      },
      {
        caseName: "Swiggy WhatsApp CTA",
        channel: "whatsapp",
        language: "en",
        outputText: "Acme Weekend Footwear Sale: Up to 50% off. Shop before Sunday 11:59 PM.",
        verdict: "GO",
      },
    ],
  },
};

export const mockRegressionReports: RegressionReportSummary[] = [
  {
    id: "reg_001",
    baselineLabel: "GPT-4o Prompt v12",
    candidateLabel: "Gemini Flash Prompt v13",
    verdict: "NO_GO",
    severity: "BLOCKER",
    createdAt: "2026-05-07 10:25",
    reasons: [
      "Telugu WhatsApp copy regressed by 8.2%",
      "Factual grounding dropped 5.1%",
      "3 hallucinated claims detected",
    ],
    topFailingExamples: ["Myntra Telugu Push", "Swiggy WhatsApp CTA", "Ajio Festival Deal"],
  },
];

function mkMetric(args: {
  key: any;
  label: string;
  polarity: "higher_better" | "lower_better";
  baseline: number;
  candidate: number;
  severity: "INFO" | "WARN" | "BLOCKER";
  stats?: any;
}) {
  const delta = args.candidate - args.baseline;
  const deltaPct = args.baseline === 0 ? 0 : (delta / args.baseline) * 100;
  return { ...args, delta, deltaPct };
}

export const mockRegressionDetails: Record<string, any> = {
  reg_001: {
    id: "reg_001",
    verdict: "NO_GO",
    severity: "BLOCKER",
    baselineLabel: "GPT-4o Prompt v12",
    candidateLabel: "Gemini Flash Prompt v13",
    createdAt: "2026-05-07 10:25",
    summary: {
      confidence: "95%",
      keyPValue: 0.013,
      keyCi95: { low: -0.11, high: -0.05 },
      methodology: "Paired bootstrap on per-case deltas (n=28) with two-sided p-values; hallucination traces verified deterministically against source inputs.",
    },
    metrics: [
      mkMetric({
        key: "teluguQuality",
        label: "Telugu quality",
        polarity: "higher_better",
        baseline: 0.88,
        candidate: 0.79,
        severity: "BLOCKER",
        stats: {
          significant: true,
          pValue: 0.013,
          ci95: { low: -0.11, high: -0.05 },
          methodology: "paired bootstrap mean(delta) with 2000 iterations",
        },
      }),
      mkMetric({
        key: "hallucinationRate",
        label: "Hallucination rate",
        polarity: "lower_better",
        baseline: 0.07,
        candidate: 0.12,
        severity: "BLOCKER",
        stats: {
          significant: true,
          pValue: 0.004,
          ci95: { low: 0.02, high: 0.07 },
          methodology: "paired bootstrap on unsupported rate deltas",
        },
      }),
      mkMetric({
        key: "formatCompliance",
        label: "Format compliance",
        polarity: "higher_better",
        baseline: 0.92,
        candidate: 0.81,
        severity: "WARN",
        stats: {
          significant: true,
          pValue: 0.031,
          ci95: { low: -0.09, high: -0.02 },
          methodology: "paired bootstrap mean(delta)",
        },
      }),
      mkMetric({
        key: "factualGrounding",
        label: "Factual grounding",
        polarity: "higher_better",
        baseline: 0.84,
        candidate: 0.80,
        severity: "WARN",
        stats: {
          significant: true,
          pValue: 0.022,
          ci95: { low: -0.06, high: -0.01 },
          methodology: "paired bootstrap mean(delta)",
        },
      }),
      mkMetric({
        key: "semanticSimilarity",
        label: "Semantic similarity",
        polarity: "higher_better",
        baseline: 0.76,
        candidate: 0.71,
        severity: "INFO",
        stats: {
          significant: false,
          pValue: 0.09,
          ci95: { low: -0.08, high: 0.01 },
          methodology: "paired bootstrap mean(delta)",
        },
      }),
      mkMetric({
        key: "passRate",
        label: "Pass rate (all scorers)",
        polarity: "higher_better",
        baseline: 0.86,
        candidate: 0.74,
        severity: "WARN",
        stats: {
          significant: false,
          pValue: 0.11,
          ci95: { low: -0.18, high: 0.04 },
          methodology: "paired bootstrap on per-case pass deltas",
        },
      }),
    ],
    segmentBreakdown: {
      language: [
        { segment: "English", baseline: 0.86, candidate: 0.81, delta: -0.05, severity: "INFO", notes: "Minor drop; not primary blocker." },
        { segment: "Telugu", baseline: 0.82, candidate: 0.75, delta: -0.07, severity: "BLOCKER", notes: "Primary regression driver; WhatsApp-heavy." },
      ],
      channel: [
        { segment: "WhatsApp", baseline: 0.84, candidate: 0.78, delta: -0.06, severity: "WARN", notes: "Compliance failures spiked in TE." },
        { segment: "Push", baseline: 0.82, candidate: 0.77, delta: -0.05, severity: "WARN", notes: "Short length constraints triggered." },
      ],
      category: [
        { segment: "Fashion", baseline: 0.84, candidate: 0.77, delta: -0.07, severity: "BLOCKER", notes: "Myntra/Ajio examples." },
        { segment: "Food", baseline: 0.81, candidate: 0.79, delta: -0.02, severity: "INFO", notes: "Mostly stable." },
      ],
    },
    failingExamples: [
      {
        merchant: "Myntra",
        caseName: "Myntra Telugu Push",
        language: "Telugu",
        channel: "Push",
        category: "Fashion",
        input: {
          language: "te",
          channel: "push",
          facts: { brand: "Myntra", dealTitle: "Festival Flash Sale", discountText: "Up to 50% off", forbiddenClaims: ["guaranteed"] },
          maxChars: 110,
        },
        baselineOutput: "మింత్రా ఫ్లాష్ సేల్: Up to 50% off. ఈరోజే ట్యాప్ చేయండి.",
        candidateOutput: "మింత్రా ఫెస్టివల్ సేల్: Extra 70% off guaranteed! ఇప్పుడే క్లిక్ చేయండి.",
        failedScorers: ["format_compliance", "factual_grounding"],
        hallucinationTraces: [
          {
            claim: "Extra 70% off",
            sourceFields: ["facts.discountText"],
            verified: false,
            confidence: 0.94,
            explanation: "No supporting data found for 70% off; discountText only provides 'Up to 50% off'.",
            segment: "Telugu / Push",
          },
          {
            claim: "guaranteed",
            sourceFields: ["facts.forbiddenClaims[0]"],
            verified: false,
            confidence: 0.9,
            explanation: "Forbidden claim detected; policy explicitly disallows guarantees.",
            segment: "Telugu / Push",
          },
        ],
      },
      {
        merchant: "Swiggy",
        caseName: "Swiggy WhatsApp CTA",
        language: "Telugu",
        channel: "WhatsApp",
        category: "Food",
        input: {
          language: "te",
          channel: "whatsapp",
          facts: { brand: "Swiggy", dealTitle: "Grocery Cashback", discountText: "10% cashback", validUntil: "ఈరోజు రాత్రి 11:59 వరకు" },
          maxChars: 420,
        },
        baselineOutput: "Swiggy Grocery Cashback: 10% cashback. ఈరోజు రాత్రి 11:59 వరకు.",
        candidateOutput: "Swiggy Grocery Cashback: 10% cashback + extra 38% growth bonus. Hurry now!",
        failedScorers: ["factual_grounding"],
        hallucinationTraces: [
          {
            claim: "extra 38%",
            sourceFields: ["facts.discountText"],
            verified: false,
            confidence: 0.94,
            explanation: "No supporting data found for 38%; not present in provided facts.",
            segment: "Telugu / WhatsApp",
          },
        ],
      },
      {
        merchant: "Ajio",
        caseName: "Ajio Festival Deal",
        language: "English",
        channel: "WhatsApp",
        category: "Fashion",
        input: {
          language: "en",
          channel: "whatsapp",
          facts: { brand: "Ajio", dealTitle: "Festival Deals", discountText: "Up to 40% off", forbiddenClaims: ["guaranteed"] },
          maxChars: 420,
        },
        baselineOutput: "Ajio Festival Deals: Up to 40% off. Shop now.",
        candidateOutput: "Ajio Festival Deals: Up to 40% off. GMV increased 38% this week — join the trend.",
        failedScorers: ["factual_grounding"],
        hallucinationTraces: [
          {
            claim: "GMV increased 38%",
            sourceFields: ["transactions.monthly_gmv"],
            verified: false,
            confidence: 0.94,
            explanation: "No supporting data found for 38% growth; source fields do not contain the claimed delta.",
            segment: "English / WhatsApp",
          },
        ],
      },
    ],
    promptDiff: {
      fileLabel: "prompts/deal_copy_v1.txt",
      baseline: "Do not invent discount values.\nDo not add guarantees.\nUse only facts provided.\nKeep WhatsApp under 500 chars.",
      candidate: "Use persuasive urgency language.\nAvoid unsafe claims when possible.\nUse only facts provided.\nKeep WhatsApp under 480 chars.",
      riskSummary: "Prompt change introduced weaker prohibitions (\"when possible\") and added urgency language, increasing hallucination likelihood and compliance risk in Telugu/WhatsApp.",
      impactedMetrics: ["Telugu quality", "Hallucination rate", "Format compliance", "Factual grounding"],
    },
    timeline: [
      { time: "09:58", title: "Prompt updated", description: "Prompt v13 merged for Deal Copy (urgency language + loosened restrictions).", tone: "warn", promptVersion: "v13", commit: "a1b2c3d" },
      { time: "10:12", title: "Candidate run executed", description: "Gemini Flash eval run completed.", tone: "info", commit: "a1b2c3d" },
      { time: "10:21", title: "Regression introduced", description: "First detection of TE/WhatsApp regressions + unsupported numeric claims.", tone: "danger" },
      { time: "10:25", title: "Release blocked", description: "Block merge: evidence chain met BLOCKER thresholds.", tone: "danger" },
    ],
    technical: {
      baselineRunId: "run_000",
      candidateRunId: "run_001",
      reportJson: { reportId: "reg_001", baselineRunId: "run_000", candidateRunId: "run_001" },
    },
  },
};

export const mockBenchmarks: BenchmarkSummary = {
  id: "bm_001",
  rows: [
    {
      runId: "run_000",
      provider: "openai",
      model: "gpt-4o-mini",
      passRateAll: 0.82,
      avgScore: 0.78,
      avgLatencyMs: 920,
      totalCostUsd: 0.21,
      costPerSuccessUsd: 0.032,
    },
    {
      runId: "run_001",
      provider: "google",
      model: "gemini-1.5-flash",
      passRateAll: 0.8,
      avgScore: 0.76,
      avgLatencyMs: 710,
      totalCostUsd: 0.03,
      costPerSuccessUsd: 0.005,
    },
  ],
  recommendations: [
    "Use Gemini Flash for WhatsApp deal copy due to ~8x lower cost with only ~2% quality reduction.",
    "Use GPT-4o for compliance-sensitive narratives and grounding-sensitive tasks.",
  ],
};

export const mockBenchmarkDashboard: BenchmarkDashboardMock = {
  matrix: mockBenchmarks,
  recommendations: {
    cheapestAcceptable: "Gemini Flash — lowest cost per successful eval (WhatsApp)",
    bestQuality: "GPT-4o — highest grounding score and best Telugu stability",
    balanced: "Gemini Flash for most copy; route compliance/financial narratives to GPT-4o",
  },
  segments: [
    { segment: "overall" as const, model: "gpt-4o-mini", provider: "openai", passRateAll: 0.82, avgScore: 0.78, avgLatencyMs: 920, costPerSuccessUsd: 0.032 },
    { segment: "overall" as const, model: "gemini-1.5-flash", provider: "google", passRateAll: 0.8, avgScore: 0.76, avgLatencyMs: 710, costPerSuccessUsd: 0.005 },
    { segment: "language:te" as const, model: "gpt-4o-mini", provider: "openai", passRateAll: 0.8, avgScore: 0.79, avgLatencyMs: 940, costPerSuccessUsd: 0.035 },
    { segment: "language:te" as const, model: "gemini-1.5-flash", provider: "google", passRateAll: 0.72, avgScore: 0.71, avgLatencyMs: 720, costPerSuccessUsd: 0.006 },
    { segment: "language:en" as const, model: "gpt-4o-mini", provider: "openai", passRateAll: 0.84, avgScore: 0.78, avgLatencyMs: 900, costPerSuccessUsd: 0.029 },
    { segment: "language:en" as const, model: "gemini-1.5-flash", provider: "google", passRateAll: 0.84, avgScore: 0.77, avgLatencyMs: 680, costPerSuccessUsd: 0.004 },
    { segment: "channel:whatsapp" as const, model: "gpt-4o-mini", provider: "openai", passRateAll: 0.84, avgScore: 0.78, avgLatencyMs: 910, costPerSuccessUsd: 0.03 },
    { segment: "channel:whatsapp" as const, model: "gemini-1.5-flash", provider: "google", passRateAll: 0.83, avgScore: 0.76, avgLatencyMs: 690, costPerSuccessUsd: 0.004 },
    { segment: "channel:push" as const, model: "gpt-4o-mini", provider: "openai", passRateAll: 0.8, avgScore: 0.77, avgLatencyMs: 940, costPerSuccessUsd: 0.035 },
    { segment: "channel:push" as const, model: "gemini-1.5-flash", provider: "google", passRateAll: 0.78, avgScore: 0.75, avgLatencyMs: 720, costPerSuccessUsd: 0.006 },
    { segment: "task:financial_narrative" as const, model: "gpt-4o-mini", provider: "openai", passRateAll: 0.86, avgScore: 0.81, avgLatencyMs: 980, costPerSuccessUsd: 0.04 },
    { segment: "task:financial_narrative" as const, model: "gemini-1.5-flash", provider: "google", passRateAll: 0.74, avgScore: 0.7, avgLatencyMs: 760, costPerSuccessUsd: 0.007 },
  ],
  latencyDistributionMs: [
    { model: "gpt-4o-mini", p50: 820, p90: 1400, p99: 2100 },
    { model: "gemini-1.5-flash", p50: 610, p90: 980, p99: 1500 },
  ],
  scoreTrend: [
    { t: "v11", model: "gpt-4o-mini", avgScore: 0.77, passRate: 0.81 },
    { t: "v12", model: "gpt-4o-mini", avgScore: 0.78, passRate: 0.82 },
    { t: "v13", model: "gpt-4o-mini", avgScore: 0.78, passRate: 0.82 },
    { t: "v11", model: "gemini-1.5-flash", avgScore: 0.75, passRate: 0.80 },
    { t: "v12", model: "gemini-1.5-flash", avgScore: 0.76, passRate: 0.80 },
    { t: "v13", model: "gemini-1.5-flash", avgScore: 0.76, passRate: 0.80 },
  ],
};

export const mockReleaseHistory: ReleaseHistoryMock = {
  events: [
    { id: "e1", time: "2026-05-05 18:12", title: "Prompt v12 merged", verdict: "INCONCLUSIVE", severity: "INFO", impacted: ["WhatsApp"], kind: "prompt_change", description: "Tightened grounding language for discounts." },
    { id: "e2", time: "2026-05-06 09:41", title: "Baseline run (GPT-4o)", verdict: "GO", severity: "INFO", impacted: ["English", "Telugu"], kind: "release", description: "All segments passed gating." },
    { id: "e3", time: "2026-05-07 09:58", title: "Prompt v13 merged", verdict: "INCONCLUSIVE", severity: "WARN", impacted: ["Telugu", "WhatsApp"], kind: "prompt_change", description: "Added urgency language; loosened prohibitions." },
    { id: "e4", time: "2026-05-07 10:12", title: "Candidate run (Gemini Flash)", verdict: "NO_GO", severity: "BLOCKER", impacted: ["Telugu", "WhatsApp", "Fashion"], kind: "regression", description: "Telugu quality regressed; hallucinations increased." },
    { id: "e5", time: "2026-05-07 10:27", title: "Rollback suggested", verdict: "INCONCLUSIVE", severity: "WARN", impacted: ["Telugu"], kind: "rollback", description: "Recommend restoring v12 guardrails for Telugu runs." },
  ],
  trends: {
    x: ["05-05", "05-06", "05-07"],
    regressionCount: [0, 0, 1],
    hallucinationRate: [0.06, 0.07, 0.12],
    teluguQuality: [0.83, 0.82, 0.75],
  },
  promptLineage: [
    { id: "v11", label: "Prompt v11", parentId: null, verdict: "GO", severity: "INFO" },
    { id: "v12", label: "Prompt v12", parentId: "v11", verdict: "GO", severity: "INFO" },
    { id: "v13", label: "Prompt v13", parentId: "v12", verdict: "NO_GO", severity: "BLOCKER" },
  ],
};

export const mockReleaseOverview: ReleaseOverviewMock = {
  decision: {
    verdict: "NO_GO",
    confidence: "95%",
    confidenceLevel: 0.95,
    topRegression: "Telugu WhatsApp copy + grounding regressions",
    hallucinations: 3,
    costDelta: "+12.4%",
    severity: "BLOCKER",
  },
  context: {
    decisionTimestamp: "2026-05-07T10:26:12Z",
    affectedSegments: ["Telugu", "WhatsApp", "Fashion"],
    releaseVersion: "release_2026-05-07_v13",
    baselineProviderModel: "GPT-4o • Prompt v12",
    candidateProviderModel: "Gemini Flash • Prompt v13",
  },
  metricComparisons: {
    factualGrounding: { baseline: 0.84, candidate: 0.80 },
    teluguQuality: { baseline: 0.88, candidate: 0.79 },
    semanticSimilarity: { baseline: 0.76, candidate: 0.71 },
    formatCompliance: { baseline: 0.92, candidate: 0.81 },
    hallucinationRate: { baseline: 0.07, candidate: 0.12 },
    passRate: { baseline: 0.86, candidate: 0.74 },
  },
  metricSignificance: {
    teluguQuality: {
      significant: true,
      pValue: 0.013,
      ci95: { low: -0.11, high: -0.05 },
      methodology: "paired bootstrap on per-case deltas (n=28 paired cases), two-sided p-value",
    },
    factualGrounding: {
      significant: true,
      pValue: 0.022,
      ci95: { low: -0.06, high: -0.01 },
      methodology: "paired bootstrap on per-case deltas (n=28 paired cases), two-sided p-value",
    },
    hallucinationRate: {
      significant: true,
      pValue: 0.004,
      ci95: { low: 0.02, high: 0.07 },
      methodology: "paired bootstrap on per-case unsupported claim rate deltas (n=28 paired cases), two-sided p-value",
    },
    formatCompliance: {
      significant: true,
      pValue: 0.031,
      ci95: { low: -0.09, high: -0.02 },
      methodology: "paired bootstrap on per-case deltas (n=28 paired cases), two-sided p-value",
    },
    passRate: {
      significant: false,
      pValue: 0.11,
      ci95: { low: -0.18, high: 0.04 },
      methodology: "paired bootstrap on per-case pass deltas (n=28 paired cases), two-sided p-value",
    },
  },
  deltaChart: [
    { label: "Factual grounding", baseline: 0.84, candidate: 0.80 },
    { label: "Telugu quality", baseline: 0.88, candidate: 0.79 },
    { label: "Semantic similarity", baseline: 0.76, candidate: 0.71 },
    { label: "Format compliance", baseline: 0.92, candidate: 0.81 },
    { label: "Hallucination rate", baseline: 0.07, candidate: 0.12, polarity: "lower_better" },
  ],
  scoreTrends: {
    metricLabel: "Factual grounding trend (key segments)",
    x: ["English/WhatsApp", "Telugu/WhatsApp", "English/Push", "Telugu/Push", "Overall"],
    baseline: [0.86, 0.82, 0.83, 0.80, 0.84],
    candidate: [0.84, 0.75, 0.81, 0.72, 0.80],
  },
  segmentAnalysis: {
    english: { baseline: 0.86, candidate: 0.81 },
    telugu: { baseline: 0.82, candidate: 0.75 },
    whatsapp: { baseline: 0.84, candidate: 0.78 },
    push: { baseline: 0.82, candidate: 0.77 },
    languageSlices: [
      { label: "English", baseline: 0.86, candidate: 0.81 },
      { label: "Telugu", baseline: 0.82, candidate: 0.75 },
    ],
    channelSlices: [
      { label: "WhatsApp", baseline: 0.84, candidate: 0.78 },
      { label: "Push", baseline: 0.82, candidate: 0.77 },
    ],
    categorySlices: [
      { label: "Fashion", baseline: 0.84, candidate: 0.77 },
      { label: "Food", baseline: 0.81, candidate: 0.79 },
      { label: "Electronics", baseline: 0.80, candidate: 0.78 },
    ],
  },
  topRegressions: {
    rows: [
      {
        caseName: "Myntra Telugu Push",
        merchant: "Myntra",
        language: "Telugu",
        channel: "Push",
        severity: "BLOCKER",
        deltaPercent: -16,
        baseline: 0.86,
        candidate: 0.72,
        failedScorers: ["format_compliance", "factual_grounding"],
        hallucinationCount: 1,
      },
      {
        caseName: "Swiggy WhatsApp CTA",
        merchant: "Swiggy",
        language: "Telugu",
        channel: "WhatsApp",
        severity: "BLOCKER",
        deltaPercent: -10,
        baseline: 0.88,
        candidate: 0.79,
        failedScorers: ["format_compliance", "semantic_similarity"],
        hallucinationCount: 0,
      },
      {
        caseName: "Ajio Festival Deal",
        merchant: "Ajio",
        language: "English",
        channel: "WhatsApp",
        severity: "WARN",
        deltaPercent: -4.8,
        baseline: 0.84,
        candidate: 0.80,
        failedScorers: ["factual_grounding", "factual_grounding"],
        hallucinationCount: 2,
      },
      {
        caseName: "Telugu WhatsApp (10% cashback)",
        merchant: "Blinkit",
        language: "Telugu",
        channel: "WhatsApp",
        severity: "BLOCKER",
        deltaPercent: -13,
        baseline: 0.90,
        candidate: 0.78,
        failedScorers: ["factual_grounding", "hallucination_trace"],
        hallucinationCount: 3,
      },
    ],
    biggestMetricDrops: [
      { metric: "Telugu quality", baseline: 0.88, candidate: 0.79, deltaPercent: -10, direction: "down" },
      { metric: "Format compliance", baseline: 0.92, candidate: 0.81, deltaPercent: -12, direction: "down" },
      { metric: "Factual grounding", baseline: 0.84, candidate: 0.80, deltaPercent: -4.8, direction: "down" },
    ],
    hallucinationIncreases: [
      { segment: "Telugu / WhatsApp", unsupportedRateDelta: 0.05, examples: ["Swiggy WhatsApp CTA", "Telugu WhatsApp (10% cashback)"] },
      { segment: "Telugu / Push", unsupportedRateDelta: 0.03, examples: ["Myntra Telugu Push"] },
    ],
    worstExamples: ["Myntra Telugu Push", "Swiggy WhatsApp CTA", "Ajio Festival Deal", "Telugu WhatsApp (10% cashback)"],
  },
  promptDiff: {
    changedLines: 18,
    riskSummary: "Safety risk increased: updated constraints loosened forbidden-claim guardrails and reduced Telugu-specific grounding instructions.",
    impactedMetrics: ["Factual grounding", "Telugu quality", "Hallucination rate", "Format compliance"],
    promptExcerpt: {
      baseline: "Avoid guarantees. Use only provided deal facts. Keep WhatsApp under 500 chars.",
      candidate: "Write marketing copy in Telugu. Keep length under 480 chars. Avoid unsafe claims when possible.",
    },
    risk: {
      increasedHallucinationLikelihood: true,
      degradedFactualGrounding: true,
      teluguLiteralTranslationRisk: true,
    },
    impactedMetricsDeltas: [
      { metric: "Telugu quality", baseline: 0.88, candidate: 0.79 },
      { metric: "Factual grounding", baseline: 0.84, candidate: 0.80 },
      { metric: "Format compliance", baseline: 0.92, candidate: 0.81 },
      { metric: "Hallucination rate", baseline: 0.07, candidate: 0.12 },
    ],
  },
  hallucinationSummary: {
    unsupportedClaimsCount: 3,
    hallucinationRateDeltaPp: 5,
    topUnsupportedClaims: [
      {
        claim: "GMV increased 38% this week",
        sourceFields: ["transactions.monthly_gmv"],
        verified: false,
        confidence: 0.94,
        explanation: "No supporting data found for 38% growth in provided facts; source fields do not contain the claimed delta.",
        segment: "Telugu / WhatsApp",
      },
      {
        claim: "Extra 38% cashback (guaranteed)",
        sourceFields: ["discountText"],
        verified: false,
        confidence: 0.91,
        explanation: "Cashback delta not present in discountText; 'guaranteed' is forbidden by compliance rules.",
        segment: "Telugu / WhatsApp",
      },
      {
        claim: "Weekend sale ends at 11:59 PM (inferred)",
        sourceFields: ["validUntil"],
        verified: false,
        confidence: 0.87,
        explanation: "Model inferred end time from prior patterns; validUntil evidence missing for the specific case.",
        segment: "Telugu / Push",
      },
    ],
    confidenceSummary: "Unsupported claim verification uses deterministic fact matching; LLM judging not required.",
  },
  benchmark: {
    primaryRecommendation: "Use Gemini Flash for WhatsApp deal copy due to 8x lower cost with only ~2% quality reduction (apply stricter grounding constraints for Telugu).",
    cheapestAcceptable: "Gemini Flash (WhatsApp) — lowest cost per successful eval",
    highestQuality: "GPT-4o (grounding-sensitive) — highest factual grounding pass rate",
    balancedRecommendation: "Gemini Flash for most channels; route compliance-heavy prompts to GPT-4o.",
  },
  timeline: [
    { time: "10:12", title: "Eval generated outputs", description: "Collected outputs for 28 paired Deal Copy cases.", tone: "info" },
    { time: "10:18", title: "Scoring completed", description: "Format compliance + Telugu quality dropped; hallucination trace flagged 3 unsupported claims.", tone: "danger" },
    { time: "10:21", title: "Regression analysis", description: "Paired bootstrap detected significant regressions (p≤0.031) for key metrics.", tone: "warn" },
    { time: "10:25", title: "Release decision", description: "Block release due to Telugu + WhatsApp evidence chain.", tone: "danger" },
  ],
  evidenceChain: [
    {
      statement: "Telugu quality regressed by ~10% (p=0.013, 95% CI [-11%, -5%])",
      metric: "teluguQuality",
      severity: "BLOCKER",
      confidence: "95%",
    },
    {
      statement: "Hallucination rate increased by +5pp (p=0.004, 95% CI [+2%, +7%])",
      metric: "hallucinationRate",
      severity: "BLOCKER",
      confidence: "95%",
    },
    {
      statement: "Format compliance failures exceeded threshold on Telugu WhatsApp and Push",
      metric: "formatCompliance",
      severity: "WARN",
      confidence: "95%",
    },
  ],
};

