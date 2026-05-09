"use client";

import type { BenchmarkSummary } from "@/lib/mock/types";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function PassRateChart(props: { rows: BenchmarkSummary["rows"] }) {
  return (
    <div className="h-[240px] min-h-[240px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
        <BarChart data={props.rows}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="model" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#0b0f19",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: 12,
            }}
          />
          <Bar dataKey="passRateAll" fill="rgba(96,165,250,0.9)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

