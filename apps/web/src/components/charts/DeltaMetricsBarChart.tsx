"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReleaseOverviewMock } from "@/lib/mock/types";

function deltaPct(baseline: number, candidate: number) {
  if (baseline === 0) return 0;
  return ((candidate - baseline) / baseline) * 100;
}

function colorForDelta(args: {
  deltaPctValue: number;
  polarity?: "higher_better" | "lower_better";
}) {
  const { deltaPctValue, polarity } = args;
  const polarityValue = polarity ?? "higher_better";
  // Higher-better: regression is deltaPct < 0
  // Lower-better: regression is deltaPct > 0
  const isRegression =
    polarityValue === "lower_better" ? deltaPctValue > 0 : deltaPctValue < 0;
  return isRegression ? "rgba(239,68,68,0.95)" : "rgba(34,197,94,0.95)";
}

export function DeltaMetricsBarChart(props: {
  items: ReleaseOverviewMock["deltaChart"];
}) {
  const data = props.items.map((it) => ({
    label: it.label,
    deltaPct: deltaPct(it.baseline, it.candidate),
    polarity: it.polarity,
  }));

  return (
    <div className="h-[260px] min-h-[260px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={260}>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} interval={0} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#0b0f19",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: 12,
            }}
            formatter={(v: unknown) => `${Number(v).toFixed(1)}%`}
            labelFormatter={(l: unknown) => String(l)}
          />
          <Bar dataKey="deltaPct" isAnimationActive={false}>
            {data.map((d, idx) => (
              <Cell
                key={idx}
                fill={colorForDelta({ deltaPctValue: d.deltaPct, polarity: d.polarity })}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

