import type { EvalRunner } from "./types.js";
import { createScorePipeline } from "./pipeline.js";
import { ProviderError } from "@the-guard/llm";
import type { ScoreResult } from "./types.js";
import { EvalPersistenceService } from "../persistence/service.js";
import { HallucinationTraceEngine } from "@the-guard/hallucination";

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function summarizeScores(scores: ScoreResult[]): { avg: number; passed: number; failed: number } {
  if (scores.length === 0) return { avg: 0, passed: 0, failed: 0 };
  const avg = scores.reduce((acc, s) => acc + clamp01(s.value), 0) / scores.length;
  const passed = scores.filter((s) => s.passed).length;
  const failed = scores.length - passed;
  return { avg, passed, failed };
}

/**
 * Default runner implements the explicit flow:
 * dataset → provider → scoring → persistence → GO/NO-GO
 */
export function createEvalRunner(args: { persistence: EvalPersistenceService }): EvalRunner {
  const { persistence } = args;
  const hallucination = new HallucinationTraceEngine();

  return {
    async run({ ctx, task, dataset }) {
      const pipeline = createScorePipeline(task.scorers);

      ctx.logger.info(`Starting eval run`, {
        runId: ctx.runId,
        taskId: task.id,
        provider: ctx.provider.name,
        model: ctx.provider.model,
        cases: dataset.length,
      });

      // Production-safe persistence: ensure FK targets exist before writing outputs/scores.
      await persistence.ensureCasesExist({ cases: dataset });

      let passedCases = 0;
      let failedCases = 0;

      for (let i = 0; i < dataset.length; i++) {
        const evalCase = dataset[i]!;
        const caseLabel = `${i + 1}/${dataset.length} ${evalCase.name} (${evalCase.id})`;

        ctx.logger.info(`Case start: ${caseLabel}`, {
          provider: ctx.provider.name,
          model: ctx.provider.model,
        });

        const { system, prompt } = task.renderPrompt({
          evalCase,
          input: evalCase.input as Record<string, unknown>,
        });

        let output;
        try {
          output = await ctx.provider.generate({
            system,
            prompt,
            requestId: `${ctx.runId}:${evalCase.id}`,
          });
        } catch (err) {
          // Persist a "provider failure" record via outputs so investigation is possible.
          const pe =
            err instanceof ProviderError
              ? err
              : new ProviderError("Provider generate failed", {
                  code: "UNKNOWN",
                  provider: ctx.provider.name,
                  model: ctx.provider.model,
                  retryable: false,
                  cause: err,
                });

          await persistence.saveOutputFailure({
            runId: ctx.runId,
            caseId: evalCase.id,
            provider: ctx.provider.name,
            model: ctx.provider.model,
            error: pe,
          });

          failedCases += 1;
          ctx.logger.error(`Case error: ${caseLabel}`, { code: pe.info.code, message: pe.message });
          continue;
        }

        const parsed = task.parseOutput?.(output.text);
        const scores = await pipeline.run({ ctx, evalCase, output, parsed });
        const decision = task.decideCase(scores);
        const scoreSummary = summarizeScores(scores);

        await persistence.saveCaseResult({
          runId: ctx.runId,
          caseId: evalCase.id,
          output,
          parsed,
          scores,
        });

        // Hallucination trace: deterministic claim checks against the case input.
        // Stored for later regression + release reporting.
        try {
          const trace = hallucination.analyze({
            runId: ctx.runId,
            caseId: evalCase.id,
            outputText: output.text,
            sourceInput: evalCase.input,
          });
          await persistence.saveHallucinationTrace(trace);
        } catch {
          // tracing is best-effort; scoring/persistence is the primary path
        }

        if (decision.verdict === "GO") passedCases += 1;
        else failedCases += 1;

        ctx.logger.info(`Case done: ${caseLabel}`, {
          verdict: decision.verdict,
          reasons: decision.reasons,
          latencyMs: output.metadata.latencyMs,
          usage: output.metadata.usage,
          costUsd: output.metadata.cost.totalCost,
          scoreAvg: scoreSummary.avg,
          scorePassed: scoreSummary.passed,
          scoreFailed: scoreSummary.failed,
        });
      }

      const verdict = failedCases > 0 ? "NO_GO" : "GO";
      ctx.logger.info(`Eval run completed`, {
        runId: ctx.runId,
        verdict,
        passedCases,
        failedCases,
      });

      await persistence.finalizeRun({
        runId: ctx.runId,
        status: verdict === "GO" ? "COMPLETED" : "COMPLETED",
      });

      return {
        runId: ctx.runId,
        taskId: task.id,
        totalCases: dataset.length,
        passedCases,
        failedCases,
        verdict,
      };
    },
  };
}

