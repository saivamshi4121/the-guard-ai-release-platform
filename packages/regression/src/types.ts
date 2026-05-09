import type { RegressionSeverity } from "@the-guard/contracts";

export type SegmentKey = "overall" | "language:en" | "language:te" | "channel:whatsapp" | "channel:push";

export type MetricKey =
  | "score:format_compliance"
  | "score:semantic_similarity"
  | "score:factual_grounding"
  | "hallucination:unsupported_rate"
  | "pass_rate:any"
  | "pass_rate:all";

export type MetricComparison = {
  metric: MetricKey;
  segment: SegmentKey;
  baseline: number;
  candidate: number;
  delta: number;
  ci95: { low: number; high: number };
  pValue: number;
  isSignificant: boolean;
  n: number;
};

export type RegressionFinding = {
  severity: RegressionSeverity;
  metric: MetricKey;
  segment: SegmentKey;
  summary: string;
  comparison: MetricComparison;
  /** scorer ids / tags used to classify the finding */
  signals: string[];
};

export type FailingExample = {
  caseId: string;
  caseName: string;
  tags: string[];
  metric: MetricKey;
  segment: SegmentKey;
  baselineScore?: number | null;
  candidateScore?: number | null;
  baselineOutput?: string | null;
  candidateOutput?: string | null;
  delta?: number | null;
};

export type RegressionReport = {
  id: string;
  baselineRunId: string;
  candidateRunId: string;
  createdAt: string;
  comparisons: MetricComparison[];
  findings: RegressionFinding[];
  worstExamples: FailingExample[];
  biggestDrops: MetricComparison[];
  decision: {
    verdict: "GO" | "NO_GO" | "INCONCLUSIVE";
    reasons: string[];
    severity: RegressionSeverity;
  };
};

