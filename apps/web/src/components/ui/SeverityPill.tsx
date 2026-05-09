import { cn } from "@/lib/cn";

type Severity = "INFO" | "WARN" | "BLOCKER";

const styles: Record<Severity, string> = {
  INFO: "bg-white/10 text-white/80 border-white/15",
  WARN: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/25",
  BLOCKER: "bg-[color:var(--danger)]/15 text-[color:var(--danger)] border-[color:var(--danger)]/25",
};

export function SeverityPill(props: { severity: Severity; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", styles[props.severity], props.className)}>
      {props.severity}
    </span>
  );
}

