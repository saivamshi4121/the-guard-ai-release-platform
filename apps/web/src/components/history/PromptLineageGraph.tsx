"use client";

import { cn } from "@/lib/cn";
import type { PromptNode } from "@/lib/mock/types";
import { SeverityPill } from "@/components/ui/SeverityPill";
import { StatusBadge } from "@/components/ui/StatusBadge";

type LayoutNode = PromptNode & { x: number; y: number };

function layout(nodes: PromptNode[]): LayoutNode[] {
  // Simple tree layout: vertical list with parent links.
  // Keeps it deterministic and dependency-free.
  const spacingX = 220;
  const spacingY = 64;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depth = (id: string): number => {
    const n = byId.get(id);
    if (!n?.parentId) return 0;
    return 1 + depth(n.parentId);
  };
  return nodes.map((n, i) => ({
    ...n,
    x: depth(n.id) * spacingX,
    y: i * spacingY,
  }));
}

export function PromptLineageGraph(props: { nodes: PromptNode[]; className?: string }) {
  const ln = layout(props.nodes);
  const height = Math.max(220, ln.length * 64);
  const width = 520;
  const byId = new Map(ln.map((n) => [n.id, n]));

  return (
    <div className={cn("rounded-lg border border-[var(--border)] bg-[color:var(--panel)]", props.className)}>
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="text-sm font-semibold">Prompt lineage</div>
        <div className="text-[11px] text-[var(--muted)] mt-0.5">Versions, parents, and outcomes (deterministic SVG).</div>
      </div>
      <div className="p-4 overflow-auto">
        <svg width={width} height={height}>
          {/* links */}
          {ln.map((n) => {
            if (!n.parentId) return null;
            const p = byId.get(n.parentId);
            if (!p) return null;
            return (
              <line
                key={`${p.id}->${n.id}`}
                x1={p.x + 160}
                y1={p.y + 18}
                x2={n.x}
                y2={n.y + 18}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={1}
              />
            );
          })}
          {/* nodes */}
          {ln.map((n) => (
            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
              <rect
                x={0}
                y={0}
                width={160}
                height={36}
                rx={6}
                fill="rgba(0,0,0,0.25)"
                stroke="rgba(255,255,255,0.12)"
              />
              <text x={10} y={22} fill="rgba(255,255,255,0.85)" fontSize={12} fontFamily="ui-sans-serif, system-ui">
                {n.label}
              </text>
            </g>
          ))}
        </svg>

        <div className="mt-4 space-y-2">
          {props.nodes.map((n) => (
            <div key={n.id} className="flex items-center justify-between rounded-md border border-white/10 bg-black/10 px-3 py-2">
              <div className="text-sm font-medium text-white/85">{n.label}</div>
              <div className="flex items-center gap-2">
                <SeverityPill severity={n.severity} />
                <StatusBadge status={n.verdict} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

