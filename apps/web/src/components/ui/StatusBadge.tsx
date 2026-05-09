import { cn } from "@/lib/cn";

type Status = "GO" | "NO_GO" | "INCONCLUSIVE" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

const styles: Record<string, string> = {
  GO: "bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/25",
  NO_GO: "bg-[color:var(--danger)]/15 text-[color:var(--danger)] border-[color:var(--danger)]/25",
  INCONCLUSIVE: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/25",
  QUEUED: "bg-white/10 text-white/80 border-white/15",
  RUNNING: "bg-[color:var(--info)]/15 text-[color:var(--info)] border-[color:var(--info)]/25",
  COMPLETED: "bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/25",
  FAILED: "bg-[color:var(--danger)]/15 text-[color:var(--danger)] border-[color:var(--danger)]/25",
  CANCELLED: "bg-white/10 text-white/70 border-white/15",
};

export function StatusBadge(props: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        styles[props.status] ?? "bg-white/10 text-white/80 border-white/15",
        props.className,
      )}
    >
      {props.status}
    </span>
  );
}

