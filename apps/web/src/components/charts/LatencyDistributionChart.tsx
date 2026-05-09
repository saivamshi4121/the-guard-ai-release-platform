"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BenchmarkDashboardMock } from "@/lib/mock/types";

export function LatencyDistributionChart(props: { dist: BenchmarkDashboardMock["latencyDistributionMs"] }) {
  const data = props.dist.map((d) => ({ model: d.model, p50: d.p50, p90: d.p90, p99: d.p99 }));
  return (
    <div className="h-[280px] min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="model" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#0b0f19", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12 }} />
          <Bar dataKey="p50" fill="rgba(96,165,250,0.7)" />
          <Bar dataKey="p90" fill="rgba(245,158,11,0.7)" />
          <Bar dataKey="p99" fill="rgba(239,68,68,0.7)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

