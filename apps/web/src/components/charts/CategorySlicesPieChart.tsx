"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";
import type { ReleaseOverviewMock } from "@/lib/mock/types";

const COLORS = ["rgba(96,165,250,0.95)", "rgba(239,68,68,0.95)", "rgba(245,158,11,0.95)", "rgba(34,197,94,0.95)"];

export function CategorySlicesPieChart(props: { slices: ReleaseOverviewMock["segmentAnalysis"]["categorySlices"] }) {
  // Visualizes candidate slice "magnitude" normalized to 1.
  const total = props.slices.reduce((a, b) => a + b.candidate, 0) || 1;
  const data = props.slices.map((s) => ({ name: s.label, value: s.candidate / total }));

  return (
    <div className="h-[260px] min-h-[260px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={260}>
        <PieChart>
          <Tooltip
            contentStyle={{
              background: "#0b0f19",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: 12,
            }}
            formatter={(v: any, name: any) => `${String(name)}: ${(Number(v) * 100).toFixed(1)}%`}
          />
          <Pie data={data} dataKey="value" innerRadius={54} outerRadius={82}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length] ?? COLORS[0]!} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

