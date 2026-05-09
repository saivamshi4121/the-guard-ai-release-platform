import { RegressionSeverity } from "@the-guard/contracts";
import { pairedBootstrapMeanDelta } from "../stats/bootstrap.js";
import type {
  FailingExample,
  MetricComparison,
  MetricKey,
  RegressionFinding,
  RegressionReport,
  SegmentKey,
} from "../types.js";

export type RunCaseRecord = {
  caseId: string;
  caseName: string;
  tags: string[];
  // scores are keyed by scorer_id
  scores: Record<string, { value: number; passed: boolean }>;
  outputText?: string | null;
};

export type RunSnapshot = {
  runId: string;
  // keyed by caseId
  cases: Record<string, RunCaseRecord>;
};

function segmentKeysForCase(tags: string[]): SegmentKey[] {
  const seg: SegmentKey[] = ["overall"];
  if (tags.includes("en")) seg.push("language:en");
  if (tags.includes("te")) seg.push("language:te");
  if (tags.includes("whatsapp")) seg.push("channel:whatsapp");
  if (tags.includes("push")) seg.push("channel:push");
  return seg;
}

function metricKeys(): MetricKey[] {
  return [
    "score:format_compliance",
    "score:semantic_similarity",
    "score:factual_grounding",
    "hallucination:unsupported_rate",
    "pass_rate:any",
    "pass_rate:all",
  ];
}

function scoreForMetric(rec: RunCaseRecord, metric: MetricKey): number {
  if (metric === "score:format_compliance") return rec.scores["format_compliance"]?.value ?? 0;
  if (metric === "score:semantic_similarity") return rec.scores["semantic_similarity"]?.value ?? 0;
  if (metric === "score:factual_grounding") return rec.scores["factual_grounding"]?.value ?? 0;
  if (metric === "hallucination:unsupported_rate") return rec.scores["hallucination_unsupported_rate"]?.value ?? 0;

  if (metric === "pass_rate:any") {
    const anyFail = Object.values(rec.scores).some((s) => !s.passed);
    return anyFail ? 0 : 1;
  }
  if (metric === "pass_rate:all") {
    const allPass = Object.values(rec.scores).every((s) => s.passed);
    return allPass ? 1 : 0;
  }

  return 0;
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function isSignificant(ci: { low: number; high: number }, pValue: number): boolean {
  // practical rule: CI excludes zero AND p < 0.05
  return (ci.low > 0 || ci.high < 0) && pValue < 0.05;
}

function classifySeverity(args: {
  metric: MetricKey;
  delta: number;
  significant: boolean;
  segment: SegmentKey;
}): RegressionSeverity {
  const { metric, delta, significant, segment } = args;
  if (!significant) return RegressionSeverity.INFO;

  // Negative delta means candidate worse (we define delta = candidate - baseline).
  const drop = -delta;
  if (drop <= 0) return RegressionSeverity.INFO;

  // Factual grounding regressions are highest risk.
  if (metric === "score:factual_grounding") {
    if (drop >= 0.15) return RegressionSeverity.BLOCKER;
    return RegressionSeverity.WARN;
  }

  // Formatting regressions are often user-visible and compliance-relevant.
  if (metric === "score:format_compliance") {
    if (drop >= 0.2) return RegressionSeverity.BLOCKER;
    return RegressionSeverity.WARN;
  }

  // Hallucinations: any significant increase in unsupported rate is a blocker for release safety.
  if (metric === "hallucination:unsupported_rate") {
    if (drop >= 0.02) return RegressionSeverity.BLOCKER;
    return RegressionSeverity.WARN;
  }

  // Localization regressions: Telugu segment drops are more impactful.
  if (segment === "language:te" && (metric === "pass_rate:all" || metric === "pass_rate:any")) {
    if (drop >= 0.1) return RegressionSeverity.WARN;
  }

  if (metric.startsWith("pass_rate:")) {
    if (drop >= 0.1) return RegressionSeverity.WARN;
  }

  return RegressionSeverity.INFO;
}

export class RegressionAnalyzer {
  analyze(args: {
    baseline: RunSnapshot;
    candidate: RunSnapshot;
    iterations?: number;
    seed?: number;
    reportId: string;
  }): RegressionReport {
    const { baseline, candidate, iterations, seed, reportId } = args;

    // Only compare paired cases present in both runs.
    const pairedCaseIds = Object.keys(baseline.cases).filter((id) => candidate.cases[id]);

    const comparisons: MetricComparison[] = [];
    const findings: RegressionFinding[] = [];

    // Build segment buckets of paired per-case values per metric.
    const buckets = new Map<string, { baseline: number[]; candidate: number[]; caseIds: string[] }>();
    const push = (metric: MetricKey, segment: SegmentKey, caseId: string, b: number, c: number) => {
      const key = `${metric}::${segment}`;
      const cur = buckets.get(key) ?? { baseline: [], candidate: [], caseIds: [] };
      cur.baseline.push(b);
      cur.candidate.push(c);
      cur.caseIds.push(caseId);
      buckets.set(key, cur);
    };

    for (const caseId of pairedCaseIds) {
      const b = baseline.cases[caseId]!;
      const c = candidate.cases[caseId]!;
      const segments = segmentKeysForCase([...new Set([...(b.tags ?? []), ...(c.tags ?? [])])]);

      for (const metric of metricKeys()) {
        const bv = scoreForMetric(b, metric);
        const cv = scoreForMetric(c, metric);
        for (const seg of segments) push(metric, seg, caseId, bv, cv);
      }
    }

    for (const metric of metricKeys()) {
      for (const segment of ["overall", "language:en", "language:te", "channel:whatsapp", "channel:push"] as SegmentKey[]) {
        const key = `${metric}::${segment}`;
        const bucket = buckets.get(key);
        if (!bucket || bucket.baseline.length < 3) continue; // avoid noisy stats

        const bAvg = avg(bucket.baseline);
        const cAvg = avg(bucket.candidate);
        const stats = pairedBootstrapMeanDelta({ baseline: bucket.baseline, candidate: bucket.candidate, iterations, seed });
        const significant = isSignificant(stats.ci95, stats.pValue);

        const cmp: MetricComparison = {
          metric,
          segment,
          baseline: bAvg,
          candidate: cAvg,
          delta: cAvg - bAvg,
          ci95: stats.ci95,
          pValue: stats.pValue,
          isSignificant: significant,
          n: bucket.baseline.length,
        };
        comparisons.push(cmp);

        const severity = classifySeverity({ metric, delta: cmp.delta, significant, segment });
        if (severity !== "INFO" || (significant && cmp.delta < 0)) {
          if (cmp.delta < 0) {
            findings.push({
              severity,
              metric,
              segment,
              summary: `${metric} regressed in ${segment}: ${(cmp.delta * 100).toFixed(2)}pp (p=${cmp.pValue.toFixed(3)})`,
              comparison: cmp,
              signals: [metric, segment],
            });
          }
        }
      }
    }

    // Biggest drops: sort by delta ascending among significant comparisons.
    const biggestDrops = [...comparisons]
      .filter((c) => c.isSignificant)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 10);

    // Worst examples: choose cases with biggest negative deltas on key scorers.
    const worstExamples: FailingExample[] = [];
    const keyMetrics: MetricKey[] = ["score:factual_grounding", "score:format_compliance", "hallucination:unsupported_rate", "pass_rate:all"];

    for (const metric of keyMetrics) {
      const perCase: Array<{ caseId: string; delta: number }> = [];
      for (const caseId of pairedCaseIds) {
        const b = baseline.cases[caseId]!;
        const c = candidate.cases[caseId]!;
        const d = scoreForMetric(c, metric) - scoreForMetric(b, metric);
        perCase.push({ caseId, delta: d });
      }
      perCase.sort((a, b) => a.delta - b.delta);
      for (const ex of perCase.slice(0, 3)) {
        const b = baseline.cases[ex.caseId]!;
        const c = candidate.cases[ex.caseId]!;
        const seg = segmentKeysForCase(b.tags)[0] ?? "overall";
        worstExamples.push({
          caseId: ex.caseId,
          caseName: b.caseName,
          tags: b.tags,
          metric,
          segment: seg,
          baselineScore: scoreForMetric(b, metric),
          candidateScore: scoreForMetric(c, metric),
          baselineOutput: b.outputText ?? null,
          candidateOutput: c.outputText ?? null,
          delta: ex.delta,
        });
      }
    }

    // Decision is delegated to ReleaseDecisionEngine, but provide a minimal placeholder here.
    const severity: RegressionSeverity =
      findings.some((f) => f.severity === RegressionSeverity.BLOCKER)
        ? RegressionSeverity.BLOCKER
        : findings.some((f) => f.severity === RegressionSeverity.WARN)
          ? RegressionSeverity.WARN
          : RegressionSeverity.INFO;

    return {
      id: reportId,
      baselineRunId: baseline.runId,
      candidateRunId: candidate.runId,
      createdAt: new Date().toISOString(),
      comparisons,
      findings,
      worstExamples,
      biggestDrops,
      decision: { verdict: "INCONCLUSIVE", reasons: ["Decision engine not applied"], severity },
    };
  }
}

