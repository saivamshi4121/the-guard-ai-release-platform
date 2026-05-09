"use client";

import { ResponsiveContainer, ScatterChart, Scatter, CartesianGrid, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import type { BenchmarkDashboardMock } from "@/lib/mock/types";

export function CostQualityScatter(props: { rows: BenchmarkDashboardMock["matrix"]["rows"] }) {
  const data = props.rows.map((r) => ({
    model: r.model,
    provider: r.provider,
    costPerSuccessUsd: r.costPerSuccessUsd,
    avgScore: r.avgScore,
    passRateAll: r.passRateAll,
  }));

  return (
    <div className="h-[280px] min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
        <ScatterChart>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis
            type="number"
            dataKey="costPerSuccessUsd"
            name="Cost per success"
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
            tickFormatter={(v) => `$${Number(v).toFixed(3)}`}
          />
          <YAxis
            type="number"
            dataKey="avgScore"
            name="Avg score"
            domain={[0, 1]}
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
          />
          <ZAxis type="number" dataKey="passRateAll" range={[60, 180]} />
          <Tooltip
            contentStyle={{ background: "#0b0f19", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12 }}
            formatter={(v: any, name: any) => {
              if (name === "costPerSuccessUsd") return [`$${Number(v).toFixed(4)}`, "cost/success"];
              if (name === "avgScore") return [Number(v).toFixed(3), "avg score"];
              if (name === "passRateAll") return [`${(Number(v) * 100).toFixed(1)}%`, "pass rate"];
              return [String(v), String(name)];
            }}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as any;
              return p ? `${p.model} (${p.provider})` : "";
            }}
          />
          <Scatter data={data} fill="rgba(96,165,250,0.95)" isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

