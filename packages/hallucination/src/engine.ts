import type { ClaimTrace, HallucinationTrace } from "./types.js";

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function flattenFacts(input: Record<string, unknown>, prefix = ""): Array<{ path: string; value: string }> {
  const out: Array<{ path: string; value: string }> = [];
  for (const [k, v] of Object.entries(input)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v === null || v === undefined) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out.push({ path: p, value: String(v) });
    } else if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const iv = v[i];
        if (typeof iv === "string" || typeof iv === "number" || typeof iv === "boolean") out.push({ path: `${p}[${i}]`, value: String(iv) });
      }
    } else if (typeof v === "object") {
      out.push(...flattenFacts(v as Record<string, unknown>, p));
    }
  }
  return out;
}

function extractClaims(text: string): string[] {
  const t = text.trim();
  if (!t) return [];

  const claims: string[] = [];

  // Percent claims: "38%", "up to 50%"
  const pct = t.match(/\b(?:up to\s+)?\d{1,3}(?:\.\d+)?%\b/gi) ?? [];
  claims.push(...pct);

  // Currency / numbers: "₹499", "$19", "10% cashback" is covered by pct
  const money = t.match(/(?:₹|\$)\s?\d+(?:[.,]\d+)?/g) ?? [];
  claims.push(...money);

  // Dates/times snippets: very light
  const time = t.match(/\b\d{1,2}:\d{2}\b/g) ?? [];
  claims.push(...time);

  // Deduplicate while keeping order
  const seen = new Set<string>();
  return claims.filter((c) => (seen.has(c) ? false : (seen.add(c), true)));
}

function bestSupport(claim: string, facts: Array<{ path: string; value: string }>): { paths: string[]; supported: boolean; confidence: number; explanation: string } {
  const claimNorm = claim.toLowerCase();

  // Strong support: exact substring match of value in claim or claim in value.
  const hits = facts.filter((f) => {
    const v = f.value.toLowerCase();
    return v.includes(claimNorm) || claimNorm.includes(v);
  });
  if (hits.length) {
    return {
      paths: hits.slice(0, 3).map((h) => h.path),
      supported: true,
      confidence: 0.9,
      explanation: `Matched claim against source fields: ${hits.slice(0, 3).map((h) => h.path).join(", ")}`,
    };
  }

  // Weak support: numbers that appear in any fact value.
  const num = claim.match(/\d+(?:\.\d+)?/g)?.[0];
  if (num) {
    const numHits = facts.filter((f) => f.value.includes(num));
    if (numHits.length) {
      return {
        paths: numHits.slice(0, 3).map((h) => h.path),
        supported: true,
        confidence: 0.6,
        explanation: `Matched numeric token "${num}" in source fields: ${numHits.slice(0, 3).map((h) => h.path).join(", ")}`,
      };
    }
  }

  return {
    paths: [],
    supported: false,
    confidence: 0.94,
    explanation: "No supporting data found in provided source fields",
  };
}

/**
 * HallucinationTraceEngine extracts simple numeric/time/money claims and verifies they exist in source input fields.
 *
 * Architectural decision:
 * - deterministic heuristics first (cheap, debuggable)
 * - designed so an LLM-based verifier can be added later behind a feature flag
 */
export class HallucinationTraceEngine {
  analyze(args: { runId: string; caseId: string; outputText: string; sourceInput: Record<string, unknown> }): HallucinationTrace {
    const facts = flattenFacts(args.sourceInput);
    const claims = extractClaims(args.outputText);

    const traces: ClaimTrace[] = claims.map((claim) => {
      const support = bestSupport(claim, facts);
      return {
        claim,
        sourceFields: support.paths,
        verified: support.supported,
        confidence: clamp01(support.confidence),
        explanation: support.explanation,
      };
    });

    const unsupported = traces.filter((t) => !t.verified);
    const maxConfidenceUnsupported = unsupported.reduce((m, t) => Math.max(m, t.confidence), 0);

    return {
      runId: args.runId,
      caseId: args.caseId,
      traces,
      summary: {
        totalClaims: traces.length,
        unsupportedClaims: unsupported.length,
        unsupportedRate: traces.length ? unsupported.length / traces.length : 0,
        maxConfidenceUnsupported,
      },
    };
  }
}

