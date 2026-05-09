import { cn } from "@/lib/cn";

type DiffLine = { type: "add" | "del" | "ctx"; text: string };

function diffLines(a: string, b: string): DiffLine[] {
  // Minimal, readable line diff summary (not a full LCS diff).
  const al = a.split(/\r?\n/);
  const bl = b.split(/\r?\n/);
  const aSet = new Set(al);
  const bSet = new Set(bl);
  const out: DiffLine[] = [];

  for (const line of al) {
    if (!bSet.has(line)) out.push({ type: "del", text: line });
    else out.push({ type: "ctx", text: line });
  }
  for (const line of bl) {
    if (!aSet.has(line)) out.push({ type: "add", text: line });
  }
  return out.slice(0, 80);
}

export function CodeDiffBlock(props: { baseline: string; candidate: string; className?: string }) {
  const lines = diffLines(props.baseline, props.candidate);
  return (
    <div className={cn("rounded-lg border border-[var(--border)] bg-black/20 overflow-hidden", props.className)}>
      <div className="px-3 py-2 border-b border-[var(--border)] text-[11px] text-[var(--muted)]">
        Prompt diff (line summary)
      </div>
      <pre className="px-3 py-2 text-[12px] leading-5 font-mono overflow-auto">
        {lines.map((l, idx) => {
          const color =
            l.type === "add"
              ? "text-[color:var(--success)]"
              : l.type === "del"
                ? "text-[color:var(--danger)]"
                : "text-white/70";
          const prefix = l.type === "add" ? "+" : l.type === "del" ? "-" : " ";
          return (
            <div key={idx} className={cn("whitespace-pre", color)}>
              {prefix} {l.text}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

