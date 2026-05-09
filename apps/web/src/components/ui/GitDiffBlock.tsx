import { cn } from "@/lib/cn";

type DiffLine = { type: "add" | "del" | "ctx" | "hunk"; text: string };

function toLines(s: string): string[] {
  return s.split(/\r?\n/);
}

function buildDiff(baseline: string, candidate: string): DiffLine[] {
  const a = toLines(baseline);
  const b = toLines(candidate);
  const aSet = new Set(a);
  const bSet = new Set(b);

  const removed = a.filter((l) => !bSet.has(l));
  const added = b.filter((l) => !aSet.has(l));

  const out: DiffLine[] = [];
  out.push({ type: "hunk", text: `@@ -${a.length} +${b.length} @@` });

  // Show context lines first (first 24), then explicit adds/dels
  const ctx = a.filter((l) => bSet.has(l)).slice(0, 24);
  for (const l of ctx) out.push({ type: "ctx", text: l });
  for (const l of removed.slice(0, 24)) out.push({ type: "del", text: l });
  for (const l of added.slice(0, 24)) out.push({ type: "add", text: l });

  return out.slice(0, 96);
}

/**
 * GitDiffBlock is a git-style diff viewer optimized for infra dashboards.
 * It is intentionally minimal (line-summary) but uses git-like formatting and coloring.
 */
export function GitDiffBlock(props: { fileLabel?: string; baseline: string; candidate: string; className?: string }) {
  const lines = buildDiff(props.baseline, props.candidate);
  return (
    <div className={cn("rounded-lg border border-[var(--border)] bg-black/20 overflow-hidden", props.className)}>
      <div className="px-3 py-2 border-b border-[var(--border)] text-[11px] text-[var(--muted)] flex items-center justify-between">
        <span>Diff</span>
        {props.fileLabel ? <span className="font-mono text-white/60">{props.fileLabel}</span> : null}
      </div>
      <pre className="px-3 py-2 text-[12px] leading-5 font-mono overflow-auto">
        {lines.map((l, idx) => {
          const color =
            l.type === "add"
              ? "text-[color:var(--success)]"
              : l.type === "del"
                ? "text-[color:var(--danger)]"
                : l.type === "hunk"
                  ? "text-[color:var(--info)]"
                  : "text-white/70";
          const prefix = l.type === "add" ? "+" : l.type === "del" ? "-" : l.type === "hunk" ? "" : " ";
          const bg =
            l.type === "add"
              ? "bg-[color:var(--success)]/10"
              : l.type === "del"
                ? "bg-[color:var(--danger)]/10"
                : "bg-transparent";
          return (
            <div key={idx} className={cn("whitespace-pre px-1", color, bg)}>
              {prefix} {l.text}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

