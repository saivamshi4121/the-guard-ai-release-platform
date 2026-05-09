/**
 * PromptDiffAnalyzer generates a human-readable summary of prompt differences.
 *
 * Practical approach:
 * - line-based diff summary (added/removed line counts + small excerpts)
 * - avoids heavy diff dependencies
 */
export type PromptDiffSummary = {
  addedLines: number;
  removedLines: number;
  changed: boolean;
  summary: string;
};

export class PromptDiffAnalyzer {
  diff(baseline: string, candidate: string): PromptDiffSummary {
    if (baseline === candidate) {
      return { addedLines: 0, removedLines: 0, changed: false, summary: "No changes" };
    }

    const a = baseline.split(/\r?\n/);
    const b = candidate.split(/\r?\n/);

    const aSet = new Set(a);
    const bSet = new Set(b);

    const removed = a.filter((l) => !bSet.has(l));
    const added = b.filter((l) => !aSet.has(l));

    const excerpt = [
      ...(removed.slice(0, 3).map((l) => `- ${l}`)),
      ...(added.slice(0, 3).map((l) => `+ ${l}`)),
    ].join("\n");

    return {
      addedLines: added.length,
      removedLines: removed.length,
      changed: true,
      summary: `Prompt changed. +${added.length} / -${removed.length}\n${excerpt}`.trim(),
    };
  }
}

