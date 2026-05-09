"use client";

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReleaseOverviewMock } from "@/lib/mock/types";

export function ScoreTrendLineChart(props: { trend: ReleaseOverviewMock["scoreTrends"] }) {
  const data = props.trend.x.map((label, i) => ({
    label,
    baseline: props.trend.baseline[i] ?? 0,
    candidate: props.trend.candidate[i] ?? 0,
  }));

  return (
    <div className="h-[260px] min-h-[260px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={260}>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} interval={0} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} domain={[0, 1]} />
          <Tooltip
            contentStyle={{
              background: "#0b0f19",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: 12,
            }}
            formatter={(v: any) => Number(v).toFixed(3)}
          />
          <Line type="monotone" dataKey="baseline" name="baseline" stroke="rgba(96,165,250,0.95)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="candidate" name="candidate" stroke="rgba(239,68,68,0.95)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

