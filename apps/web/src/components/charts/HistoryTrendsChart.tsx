"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReleaseHistoryMock } from "@/lib/mock/types";

export function HistoryTrendsChart(props: { trends: ReleaseHistoryMock["trends"] }) {
  const data = props.trends.x.map((t, i) => ({
    t,
    regressionCount: props.trends.regressionCount[i] ?? 0,
    hallucinationRate: props.trends.hallucinationRate[i] ?? 0,
    teluguQuality: props.trends.teluguQuality[i] ?? 0,
  }));

  return (
    <div className="h-[260px] min-h-[260px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={260}>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="t" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#0b0f19", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12 }} />
          <Line dataKey="regressionCount" name="regressions" stroke="rgba(239,68,68,0.95)" strokeWidth={2} dot={false} />
          <Line dataKey="hallucinationRate" name="hallucination rate" stroke="rgba(245,158,11,0.95)" strokeWidth={2} dot={false} />
          <Line dataKey="teluguQuality" name="Telugu quality" stroke="rgba(96,165,250,0.95)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

