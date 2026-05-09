/**
 * Paired bootstrap for per-case deltas.
 *
 * Practical design:
 * - Works on arrays of paired values (baseline_i, candidate_i)
 * - Uses resampling with replacement of indices
 * - Returns CI and a two-sided p-value for mean(delta) != 0
 *
 * This is robust enough for release workflows without heavy statistics libraries.
 */

export type BootstrapResult = {
  meanDelta: number;
  ci95: { low: number; high: number };
  pValue: number;
};

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const a = sorted[base]!;
  const b = sorted[Math.min(base + 1, sorted.length - 1)]!;
  return a + rest * (b - a);
}

/**
 * Mulberry32 PRNG for deterministic bootstraps in CI.
 */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function pairedBootstrapMeanDelta(args: {
  baseline: number[];
  candidate: number[];
  iterations?: number;
  seed?: number;
}): BootstrapResult {
  const iterations = args.iterations ?? 2000;
  const seed = args.seed ?? 1337;

  const n = Math.min(args.baseline.length, args.candidate.length);
  const deltas: number[] = [];
  for (let i = 0; i < n; i++) deltas.push((args.candidate[i] ?? 0) - (args.baseline[i] ?? 0));

  const obs = mean(deltas);
  if (n === 0) return { meanDelta: 0, ci95: { low: 0, high: 0 }, pValue: 1 };

  const rng = mulberry32(seed);
  const boot: number[] = [];

  for (let it = 0; it < iterations; it++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const idx = Math.floor(rng() * n);
      sum += deltas[idx]!;
    }
    boot.push(sum / n);
  }

  boot.sort((a, b) => a - b);
  const low = quantile(boot, 0.025);
  const high = quantile(boot, 0.975);

  // two-sided p-value based on bootstrap distribution around 0
  const le0 = boot.filter((x) => x <= 0).length / boot.length;
  const ge0 = boot.filter((x) => x >= 0).length / boot.length;
  const pValue = Math.min(1, 2 * Math.min(le0, ge0));

  return { meanDelta: obs, ci95: { low, high }, pValue };
}

