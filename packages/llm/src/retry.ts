import { ProviderError } from "./errors.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredBackoffMs(attempt: number, maxDelayMs: number): number {
  // exponential backoff with full jitter (AWS style)
  const base = Math.min(maxDelayMs, 2 ** attempt * 200);
  return Math.floor(Math.random() * base);
}

/**
 * Generic retry wrapper for provider calls.
 *
 * Architectural decision:
 * - Retrying belongs in the provider layer so all callers get consistent behavior and metadata.
 * - Providers decide which errors are retryable; higher layers can still override policies.
 */
export async function withRetry<T>(args: {
  maxRetries: number;
  maxRetryDelayMs: number;
  fn: (attempt: number) => Promise<T>;
  shouldRetry: (err: unknown) => boolean;
}): Promise<T> {
  const { maxRetries, maxRetryDelayMs, fn, shouldRetry } = args;
  let attempt = 0;
  // attempt = 0 is the first try; retries happen for attempt 1..maxRetries
  // total tries = maxRetries + 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= maxRetries || !shouldRetry(err)) throw err;
      attempt += 1;
      await sleep(jitteredBackoffMs(attempt, maxRetryDelayMs));
    }
  }
}

export function defaultShouldRetry(err: unknown): boolean {
  if (err instanceof ProviderError) return err.info.retryable;
  return false;
}

