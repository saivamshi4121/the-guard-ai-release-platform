export type RunBenchmarkRow = {
  runId: string;
  provider: string;
  model: string;
  taskType?: string | null;
  passRateAll: number;
  avgScore: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  costPerSuccessfulEvalUsd: number;
};

export type BenchmarkMatrix = {
  rows: RunBenchmarkRow[];
  recommendations: Array<{ text: string; metadata?: Record<string, unknown> }>;
};

