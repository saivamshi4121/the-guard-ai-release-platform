export type RunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type ReleaseVerdict = "GO" | "NO_GO" | "INCONCLUSIVE";
export type RegressionSeverity = "INFO" | "WARN" | "BLOCKER";

export type RunSummary = {
  id: string;
  title: string;
  provider: string;
  model: string;
  task: string;
  status: RunStatus;
  createdAt: string;
};

export type RunDetail = RunSummary & {
  latencyMsAvg: number;
  totalCostUsd: number;
  tokenUsage: { input: number; output: number };
  scores: Array<{ scorer: string; value: number; passed: boolean }>;
  outputs: Array<{ caseName: string; channel: string; language: string; outputText: string; verdict: ReleaseVerdict }>;
};

export type RegressionReportSummary = {
  id: string;
  baselineLabel: string;
  candidateLabel: string;
  verdict: ReleaseVerdict;
  severity: RegressionSeverity;
  createdAt: string;
  reasons: string[];
  topFailingExamples: string[];
};

export type RegressionMetricRow = {
  key: MetricKey;
  label: string;
  polarity: "higher_better" | "lower_better";
  baseline: number;
  candidate: number;
  delta: number;
  deltaPct: number;
  severity: RegressionSeverity;
  stats?: MetricStats;
};

export type RegressionFailingExample = {
  merchant: string;
  caseName: string;
  language: "English" | "Telugu";
  channel: "WhatsApp" | "Push";
  category: "Fashion" | "Food" | "Electronics" | string;
  input: Record<string, unknown>;
  baselineOutput: string;
  candidateOutput: string;
  failedScorers: string[];
  hallucinationTraces: HallucinationClaimPreview[];
};

export type SegmentBreakdownRow = {
  segment: string;
  baseline: number;
  candidate: number;
  delta: number;
  severity: RegressionSeverity;
  notes?: string;
};

export type RegressionDetailMock = {
  id: string;
  verdict: ReleaseVerdict;
  severity: RegressionSeverity;
  baselineLabel: string;
  candidateLabel: string;
  createdAt: string;
  summary: {
    confidence: string;
    keyPValue: number;
    keyCi95: { low: number; high: number };
    methodology: string;
  };
  metrics: RegressionMetricRow[];
  segmentBreakdown: {
    language: SegmentBreakdownRow[];
    channel: SegmentBreakdownRow[];
    category: SegmentBreakdownRow[];
  };
  failingExamples: RegressionFailingExample[];
  promptDiff: {
    fileLabel: string;
    baseline: string;
    candidate: string;
    riskSummary: string;
    impactedMetrics: string[];
  };
  timeline: Array<
    TimelineEntry & {
      promptVersion?: string;
      commit?: string;
    }
  >;
  technical: {
    baselineRunId: string;
    candidateRunId: string;
    reportJson: Record<string, unknown>;
  };
};

export type BenchmarkSummary = {
  id: string;
  rows: Array<{
    runId: string;
    provider: string;
    model: string;
    passRateAll: number;
    avgScore: number;
    avgLatencyMs: number;
    totalCostUsd: number;
    costPerSuccessUsd: number;
  }>;
  recommendations: string[];
};

export type BenchmarkSegmentRow = {
  segment: "overall" | "language:te" | "language:en" | "channel:whatsapp" | "channel:push" | "task:financial_narrative";
  model: string;
  provider: string;
  passRateAll: number;
  avgScore: number;
  avgLatencyMs: number;
  costPerSuccessUsd: number;
};

export type BenchmarkDashboardMock = {
  matrix: BenchmarkSummary;
  segments: BenchmarkSegmentRow[];
  recommendations: {
    cheapestAcceptable: string;
    bestQuality: string;
    balanced: string;
  };
  latencyDistributionMs: Array<{ model: string; p50: number; p90: number; p99: number }>;
  scoreTrend: Array<{ t: string; model: string; avgScore: number; passRate: number }>;
};

export type ReleaseEvent = {
  id: string;
  time: string;
  title: string;
  verdict: ReleaseVerdict;
  severity: RegressionSeverity;
  impacted: string[];
  description?: string;
  kind: "release" | "prompt_change" | "regression" | "recovery" | "model_swap" | "rollback";
};

export type PromptNode = {
  id: string;
  label: string;
  parentId?: string | null;
  verdict: ReleaseVerdict;
  severity: RegressionSeverity;
};

export type ReleaseHistoryMock = {
  events: ReleaseEvent[];
  trends: {
    x: string[];
    regressionCount: number[];
    hallucinationRate: number[];
    teluguQuality: number[];
  };
  promptLineage: PromptNode[];
};

export type ReleaseDecisionMock = {
  verdict: ReleaseVerdict;
  confidence: string;
  topRegression: string;
  hallucinations: number;
  costDelta: string;
};

export type MetricKey =
  | "factualGrounding"
  | "semanticSimilarity"
  | "teluguQuality"
  | "formatCompliance"
  | "hallucinationRate"
  | "passRate";

export type MetricStats = {
  significant: boolean;
  pValue: number;
  ci95: { low: number; high: number };
  methodology: string;
};

export type HallucinationClaimPreview = {
  claim: string;
  sourceFields: string[];
  verified: false; // mock traces are intentionally unverified when they matter
  confidence: number; // 0..1
  explanation: string;
  segment: string;
};

export type ReleaseEvidenceItem = {
  statement: string;
  metric: string;
  severity: RegressionSeverity;
  confidence?: string;
};

export type TimelineEntry = {
  time: string;
  title: string;
  description?: string;
  tone?: "default" | "info" | "warn" | "danger";
};

export type TopRegressionRow = {
  caseName: string;
  merchant: string;
  language: "English" | "Telugu";
  channel: "WhatsApp" | "Push";
  severity: RegressionSeverity;
  deltaPercent: number;
  baseline: number | null;
  candidate: number | null;
  failedScorers: string[];
  hallucinationCount: number;
};

export type ReleaseOverviewMock = {
  decision: ReleaseDecisionMock & {
    severity: RegressionSeverity;
    confidenceLevel: number; // 0..1
  };
  context: {
    decisionTimestamp: string;
    affectedSegments: string[];
    releaseVersion: string;
    baselineProviderModel: string;
    candidateProviderModel: string;
  };
  metricComparisons: {
    factualGrounding: { baseline: number; candidate: number };
    teluguQuality: { baseline: number; candidate: number };
    semanticSimilarity: { baseline: number; candidate: number };
    formatCompliance: { baseline: number; candidate: number };
    hallucinationRate: { baseline: number; candidate: number };
    passRate: { baseline: number; candidate: number };
  };
  metricSignificance: Partial<Record<MetricKey, MetricStats>>;
  deltaChart: Array<{ label: string; baseline: number; candidate: number; polarity?: "higher_better" | "lower_better" }>;
  scoreTrends: {
    metricLabel: string;
    x: string[];
    baseline: number[];
    candidate: number[];
  };
  segmentAnalysis: {
    english: { baseline: number; candidate: number };
    telugu: { baseline: number; candidate: number };
    whatsapp: { baseline: number; candidate: number };
    push: { baseline: number; candidate: number };
    languageSlices: Array<{ label: "English" | "Telugu"; baseline: number; candidate: number }>;
    channelSlices: Array<{ label: "WhatsApp" | "Push"; baseline: number; candidate: number }>;
    categorySlices: Array<{ label: "Fashion" | "Food" | string; baseline: number; candidate: number }>;
  };
  topRegressions: {
    rows: TopRegressionRow[];
    biggestMetricDrops: Array<{ metric: string; baseline: number; candidate: number; deltaPercent: number; direction: "up" | "down" }>;
    hallucinationIncreases: Array<{ segment: string; unsupportedRateDelta: number; examples: string[] }>;
    worstExamples: string[];
  };
  promptDiff: {
    changedLines: number;
    riskSummary: string;
    impactedMetrics: string[];
    promptExcerpt: { baseline: string; candidate: string };
    risk: {
      increasedHallucinationLikelihood: boolean;
      degradedFactualGrounding: boolean;
      teluguLiteralTranslationRisk: boolean;
    };
    impactedMetricsDeltas: Array<{ metric: string; baseline: number; candidate: number }>;
  };
  hallucinationSummary: {
    unsupportedClaimsCount: number;
    hallucinationRateDeltaPp: number;
    topUnsupportedClaims: HallucinationClaimPreview[];
    confidenceSummary: string;
  };
  benchmark: {
    primaryRecommendation: string;
    cheapestAcceptable: string;
    highestQuality: string;
    balancedRecommendation: string;
  };
  timeline: TimelineEntry[];
  evidenceChain: ReleaseEvidenceItem[];
};

