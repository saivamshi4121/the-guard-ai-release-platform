"use client";

import { cn } from "@/lib/cn";

export function ChartCard(props: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-[var(--border)] bg-[color:var(--panel)]", props.className)}>
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="text-sm font-semibold">{props.title}</div>
        {props.subtitle ? <div className="text-[11px] text-[var(--muted)]">{props.subtitle}</div> : null}
      </div>
      <div className="p-4">{props.children}</div>
    </div>
  );
}

