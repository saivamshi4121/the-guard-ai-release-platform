import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { GenerateOutput } from "@the-guard/llm";
import { demoKey } from "@the-guard/llm";
import { DealCopyEvalTask, SupportReplyEvalTask, dealCopyDataset, estimateTokens, supportReplyDataset, truncateToTokenLimit } from "@the-guard/eval";
import { estimateCostFromTokens } from "@the-guard/llm";

async function ensureDirForFile(path: string) {
  await mkdir(dirname(path), { recursive: true });
}

function synthDealCopyText(input: any): string {
  const brand = input?.facts?.brand ?? "Brand";
  const title = input?.facts?.dealTitle ?? "Deal";
  const discount = input?.facts?.discountText ?? "Offer";
  const until = input?.facts?.validUntil ? ` Valid until ${input.facts.validUntil}.` : "";
  if (input?.language === "te") {
    // Simple, deterministic Telugu-ish copy (not attempting perfect grammar).
    return `${brand}లో ${title} — ${discount}.${until}`.trim();
  }
  return `${brand}: ${title} — ${discount}.${until}`.trim();
}

function synthSupportReplyText(input: any): string {
  const orderId = input?.order?.orderId ?? "OD-XXXX";
  const merchant = input?.order?.merchant ?? "Merchant";
  const eta = input?.order?.eta ?? "";
  const lang = input?.language ?? "en";
  const escalation = input?.policy?.escalationRequired ? true : false;
  const refundEligible = input?.policy?.refundEligible ? true : false;
  const issueType = input?.issue?.type ?? "issue";

  if (lang === "te") {
    const empathy = "క్షమించండి. మేము మీకు సహాయం చేస్తాము.";
    const next = issueType === "delayed_delivery" && eta ? `అప్‌డేటెడ్ ETA: ${eta}.` : "దయచేసి ఆర్డర్ వివరాలు నిర్ధారించండి.";
    const refundLine = refundEligible ? "policy ప్రకారం రిఫండ్ సహాయం చేస్తాము." : "policy ప్రకారం రిఫండ్ హామీ ఇవ్వలేము.";
    const esc = escalation ? "మా టీమ్‌కి ఎస్కలేట్ చేస్తున్నాం." : "";
    return `${empathy} ఆర్డర్ ${orderId} (${merchant}). ${next} ${refundLine} ${esc}`.replace(/\s+/g, " ").trim();
  }

  const empathy = "Sorry about this — we’re here to help.";
  const next = issueType === "delayed_delivery" && eta ? `Updated ETA: ${eta}.` : "Please share any relevant details so we can assist.";
  const refundLine = refundEligible ? "If eligible, we can help with a refund per policy." : "We can’t guarantee a refund if it’s not eligible under policy.";
  const esc = escalation ? "I’m escalating this to our specialist team now." : "";
  return `${empathy} Order ${orderId} (${merchant}). ${next} ${refundLine} ${esc}`.replace(/\s+/g, " ").trim();
}

function makeOutput(args: { provider: "openai" | "google"; model: string; text: string; inputTokens: number; outputTokens: number }): GenerateOutput {
  const cost = estimateCostFromTokens({
    provider: args.provider,
    model: args.model,
    inputTokens: args.inputTokens,
    outputTokens: args.outputTokens,
  });
  return {
    text: args.text,
    metadata: {
      provider: args.provider,
      model: args.model,
      latencyMs: 120,
      usage: { inputTokens: args.inputTokens, outputTokens: args.outputTokens, totalTokens: args.inputTokens + args.outputTokens },
      cost,
      raw: { demo: true },
    },
  };
}

async function main() {
  const snapshotPath = process.env.DEMO_SNAPSHOT_PATH ?? "reports/demo/demo-snapshots.json";
  const regressionReportPath = process.env.DEMO_REGRESSION_REPORT_PATH ?? "reports/demo/demo-regression-report.json";

  const provider = (process.env.THE_GUARD_PROVIDER ?? "openai") as "openai" | "google";
  const model = process.env.THE_GUARD_MODEL ?? (provider === "google" ? "gemini-1.5-flash" : "gpt-4o-mini");
  const maxInputTokens = Number(process.env.MAX_INPUT_TOKENS ?? 2000);
  const maxOutputTokens = Number(process.env.MAX_OUTPUT_TOKENS ?? 250);

  const dealSnapshots = dealCopyDataset.map((c) => {
    const rendered = DealCopyEvalTask.renderPrompt({ input: c.input as any } as any);

    const system = rendered.system ? truncateToTokenLimit(rendered.system, Math.floor(maxInputTokens / 4)).text : undefined;
    const prompt = truncateToTokenLimit(rendered.prompt, maxInputTokens).text;

    const combined = `${system ?? ""}\n\n${prompt}`;
    const inputTokens = estimateTokens(combined);
    const outText = synthDealCopyText(c.input);
    const outputTokens = Math.min(maxOutputTokens, estimateTokens(outText));

    return {
      key: demoKey({ system, prompt }),
      provider,
      model,
      input: { system, prompt },
      output: makeOutput({ provider, model, text: outText, inputTokens, outputTokens }),
    };
  });

  const supportSnapshots = supportReplyDataset.map((c) => {
    const rendered = SupportReplyEvalTask.renderPrompt({ input: c.input as any } as any);

    const system = rendered.system ? truncateToTokenLimit(rendered.system, Math.floor(maxInputTokens / 4)).text : undefined;
    const prompt = truncateToTokenLimit(rendered.prompt, maxInputTokens).text;

    const combined = `${system ?? ""}\n\n${prompt}`;
    const inputTokens = estimateTokens(combined);
    const outText = synthSupportReplyText(c.input);
    const outputTokens = Math.min(maxOutputTokens, estimateTokens(outText));

    return {
      key: demoKey({ system, prompt }),
      provider,
      model,
      input: { system, prompt },
      output: makeOutput({ provider, model, text: outText, inputTokens, outputTokens }),
    };
  });

  const snapshots = [...dealSnapshots, ...supportSnapshots];

  await ensureDirForFile(snapshotPath);
  await writeFile(snapshotPath, JSON.stringify({ createdAt: new Date().toISOString(), snapshots }, null, 2), "utf8");

  // Minimal deterministic regression report for the demo regression-runner path.
  const regressionReport = {
    id: "demo-regression-report",
    baselineRunId: "demo-baseline",
    candidateRunId: "demo-candidate",
    createdAt: new Date().toISOString(),
    comparisons: [],
    findings: [],
    worstExamples: [],
    biggestDrops: [],
    decision: {
      verdict: "GO",
      reasons: ["Demo mode: deterministic pre-seeded report"],
      severity: "LOW",
    },
  };
  await ensureDirForFile(regressionReportPath);
  await writeFile(regressionReportPath, JSON.stringify(regressionReport, null, 2), "utf8");

  console.log(`Seeded demo snapshots: ${snapshotPath}`);
  console.log(`Seeded demo regression report: ${regressionReportPath}`);
  console.log(`Snapshots: ${snapshots.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

