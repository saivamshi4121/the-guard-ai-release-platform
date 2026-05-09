import { cn } from "@/lib/cn";

export function MetricCard(props: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[color:var(--panel)] px-4 py-3",
        props.className,
      )}
    >
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{props.label}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{props.value}</div>
      {props.hint ? <div className="mt-1 text-[11px] text-[var(--muted)]">{props.hint}</div> : null}
    </div>
  );
}

