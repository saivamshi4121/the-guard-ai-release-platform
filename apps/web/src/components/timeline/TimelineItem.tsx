import { cn } from "@/lib/cn";

/**
 * TimelineItem is a compact, log-like building block for infra tooling.
 *
 * Design goals:
 * - dense scanability (like CI logs)
 * - consistent alignment for timestamps + badges
 * - low-ceremony composition (no heavy timeline framework)
 */
export function TimelineItem(props: {
  time?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
  tone?: "default" | "info" | "warn" | "danger";
  className?: string;
}) {
  const tone =
    props.tone === "danger"
      ? "bg-[color:var(--danger)]/10 border-[color:var(--danger)]/20"
      : props.tone === "warn"
        ? "bg-[color:var(--warning)]/10 border-[color:var(--warning)]/20"
        : props.tone === "info"
          ? "bg-[color:var(--info)]/10 border-[color:var(--info)]/20"
          : "bg-white/5 border-white/10";

  return (
    <div className={cn("flex items-start gap-3 rounded-md border px-3 py-2", tone, props.className)}>
      <div className="w-[86px] shrink-0 pt-0.5 text-[11px] text-[var(--muted)] tabular-nums">
        {props.time ?? "—"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-sm font-medium text-white/90 truncate">{props.title}</div>
          {props.right ? <div className="shrink-0">{props.right}</div> : null}
        </div>
        {props.description ? (
          <div className="mt-0.5 text-[12px] leading-5 text-white/70">{props.description}</div>
        ) : null}
      </div>
    </div>
  );
}

