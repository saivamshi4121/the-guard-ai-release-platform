import { cn } from "@/lib/cn";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

type Severity = "INFO" | "WARN" | "BLOCKER";

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function fmt(x: number, digits = 2): string {
  return x.toFixed(digits);
}

function fmtPct(delta: number): string {
  const pct = delta * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}

function severityForDelta(delta: number, thresholds: { warn: number; blocker: number }): Severity {
  // Default polarity assumes "higher is better" (regression means candidate is lower).
  // For alternate polarity (lower is better), we handle in the caller by transforming delta.
  const drop = -delta; // positive when candidate < baseline
  if (drop >= thresholds.blocker) return "BLOCKER";
  if (drop >= thresholds.warn) return "WARN";
  return "INFO";
}

const severityStyles: Record<Severity, string> = {
  INFO: "text-white/70 border-white/10 bg-white/5",
  WARN: "text-[color:var(--warning)] border-[color:var(--warning)]/25 bg-[color:var(--warning)]/10",
  BLOCKER: "text-[color:var(--danger)] border-[color:var(--danger)]/25 bg-[color:var(--danger)]/10",
};

/**
 * DeltaMetric is the core visual language for comparisons.
 *
 * Shows:
 * baseline → candidate
 * arrow direction
 * delta percentage
 * severity color (based on drop thresholds)
 *
 * Notes:
 * - Delta is computed as candidate - baseline.
 * - Provide thresholds tuned per metric (e.g. factual grounding vs latency).
 */
export function DeltaMetric(props: {
  baseline: number;
  candidate: number;
  label?: string;
  digits?: number;
  /**
   * What direction is considered "good" for this metric.
   * Example: hallucination rate is worse when it increases => lower is better.
   */
  polarity?: "higher_better" | "lower_better";
  /**
   * Severity thresholds in absolute units (0..1 scale). For pass rates / scores.
   * Example: warn=0.05 blocker=0.15
   */
  thresholds?: { warn: number; blocker: number };
  className?: string;
}) {
  const baseline = clamp01(props.baseline);
  const candidate = clamp01(props.candidate);
  const delta = candidate - baseline;
  const thresholds = props.thresholds ?? { warn: 0.05, blocker: 0.15 };
  const polarity = props.polarity ?? "higher_better";

  // Transform delta so severityForDelta can assume "higher is better" semantics:
  // severityForDelta treats regression as "candidate lower than baseline".
  // - higher_better: delta' = candidate - baseline
  // - lower_better: regression is candidate higher, so invert the delta sign
  const deltaForSeverity = polarity === "lower_better" ? -delta : delta;
  const sev = severityForDelta(deltaForSeverity, thresholds);

  const Icon = delta > 0.001 ? ArrowUpRight : delta < -0.001 ? ArrowDownRight : ArrowRight;
  const deltaText = fmtPct(delta);

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-md border px-2 py-1", severityStyles[sev], props.className)}>
      {props.label ? <span className="text-[11px] text-[var(--muted)]">{props.label}</span> : null}
      <span className="text-[12px] font-mono tabular-nums text-white/80">
        {fmt(baseline, props.digits ?? 2)} <span className="text-white/40">→</span> {fmt(candidate, props.digits ?? 2)}
      </span>
      <span className="inline-flex items-center gap-1 text-[11px] font-medium tabular-nums">
        <Icon className="h-3.5 w-3.5" />
        {deltaText}
      </span>
    </div>
  );
}

