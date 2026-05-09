import { SeverityPill } from "@/components/ui/SeverityPill";
import { cn } from "@/lib/cn";
import type { HallucinationClaimPreview } from "@/lib/mock/types";

function barWidth(conf: number) {
  return `${Math.round(Math.max(0, Math.min(1, conf)) * 100)}%`;
}

export function HallucinationTracePanel(props: { traces: HallucinationClaimPreview[]; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-[var(--border)] bg-[color:var(--panel)]", props.className)}>
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="text-sm font-semibold">Hallucination traces</div>
        <div className="text-[11px] text-[var(--muted)] mt-0.5">Unsupported claims with confidence and evidence.</div>
      </div>
      <div className="p-4 space-y-3">
        {props.traces.length === 0 ? (
          <div className="text-[12px] text-[var(--muted)]">No unsupported claims detected for this case.</div>
        ) : (
          props.traces.map((t) => (
            <details key={t.claim} className="rounded-md border border-white/10 bg-black/10 p-3">
              <summary className="cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white/90 truncate">{t.claim}</div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">{t.segment}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <SeverityPill severity="BLOCKER" />
                    <div className="text-[11px] text-white/70 tabular-nums">{Math.round(t.confidence * 100)}%</div>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded bg-white/10 overflow-hidden">
                  <div className="h-full bg-[color:var(--danger)]" style={{ width: barWidth(t.confidence) }} />
                </div>
              </summary>
              <div className="mt-2 text-[12px] text-white/70 leading-6">
                <div>
                  Missing source fields: <span className="text-white/80 font-mono">{t.sourceFields.join(", ")}</span>
                </div>
                <div className="mt-1">{t.explanation}</div>
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}

