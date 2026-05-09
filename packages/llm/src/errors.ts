import type { ProviderName } from "./types.js";

export type ProviderErrorCode =
  | "TIMEOUT"
  | "CANCELLED"
  | "AUTH"
  | "RATE_LIMIT"
  | "INVALID_REQUEST"
  | "UPSTREAM"
  | "RETRYABLE"
  | "UNKNOWN";

/**
 * ProviderError exists so callers can reliably decide:
 * - retry vs fail fast
 * - what to log
 * - what to surface to users
 *
 * We keep the surface area small and stable; provider-specific error shapes remain in `cause`.
 */
export class ProviderError extends Error {
  readonly name = "ProviderError";

  constructor(
    message: string,
    public readonly info: {
      code: ProviderErrorCode;
      provider: ProviderName;
      model: string;
      retryable: boolean;
      statusCode?: number;
      requestId?: string;
      cause?: unknown;
    },
  ) {
    super(message);
  }
}

export function isProviderError(err: unknown): err is ProviderError {
  return err instanceof ProviderError;
}

