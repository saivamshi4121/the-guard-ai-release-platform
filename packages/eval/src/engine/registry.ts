import type { EvalTaskDefinition } from "./types.js";
import { ProviderError } from "@the-guard/llm";

/**
 * Task registry lets us add tasks without editing the runner.
 *
 * Architectural decision:
 * - A simple Map keyed by task id
 * - Versions are part of the task definition so we can evolve safely over time
 */
export class TaskRegistry {
  private readonly tasks = new Map<string, EvalTaskDefinition>();

  register(task: EvalTaskDefinition): void {
    this.tasks.set(task.id, task);
  }

  get(taskId: string): EvalTaskDefinition {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new ProviderError(`Unknown task "${taskId}"`, {
        code: "INVALID_REQUEST",
        provider: "other",
        model: "n/a",
        retryable: false,
      });
    }
    return task;
  }

  list(): EvalTaskDefinition[] {
    return [...this.tasks.values()];
  }
}

