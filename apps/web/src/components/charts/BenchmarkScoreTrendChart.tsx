"use client";

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BenchmarkDashboardMock } from "@/lib/mock/types";

export function BenchmarkScoreTrendChart(props: { points: BenchmarkDashboardMock["scoreTrend"] }) {
  // Render as two lines by model by filtering
  const models = [...new Set(props.points.map((p) => p.model))];
  const x = [...new Set(props.points.map((p) => p.t))];
  const data = x.map((t) => {
    const row: any = { t };
    for (const m of models) {
      const p = props.points.find((pp) => pp.t === t && pp.model === m);
      row[`score:${m}`] = p?.avgScore ?? null;
      row[`pass:${m}`] = p?.passRate ?? null;
    }
    return row;
  });

  const colors = ["rgba(96,165,250,0.95)", "rgba(34,197,94,0.95)", "rgba(245,158,11,0.95)"];

  return (
    <div className="h-[280px] min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="t" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
          <YAxis domain={[0, 1]} tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#0b0f19", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12 }} />
          {models.map((m, i) => (
            <Line key={m} dataKey={`score:${m}`} name={`${m} avg score`} stroke={colors[i % colors.length]!} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

