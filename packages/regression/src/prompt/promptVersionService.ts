import { createHash } from "node:crypto";

/**
 * PromptVersionService provides prompt hashing and lightweight version storage semantics.
 *
 * Architectural decision:
 * - We store immutable prompt versions (template + metadata) in `prompt_versions`.
 * - Hashing enables dedupe and fast "did the prompt change?" checks in release workflows.
 */
export class PromptVersionService {
  hashPrompt(template: string): string {
    return createHash("sha256").update(template, "utf8").digest("hex");
  }
}

