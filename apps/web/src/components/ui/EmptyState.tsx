import { cn } from "@/lib/cn";

export function EmptyState(props: { title: string; description?: string; className?: string; action?: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-[var(--border)] bg-[color:var(--panel)] p-6", props.className)}>
      <div className="text-sm font-semibold">{props.title}</div>
      {props.description ? <div className="mt-1 text-[12px] text-[var(--muted)]">{props.description}</div> : null}
      {props.action ? <div className="mt-4">{props.action}</div> : null}
    </div>
  );
}

