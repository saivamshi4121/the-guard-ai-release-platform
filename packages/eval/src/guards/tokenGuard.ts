/**
 * TokenGuard provides conservative safety checks without requiring a tokenizer dependency.
 *
 * We use a rough heuristic: 1 token ≈ 4 characters (English-ish).
 * This is intentionally conservative for safety mode.
 */

export type TokenLimits = {
  maxInputTokens: number;
  maxOutputTokens: number;
};

export function estimateTokens(text: string): number {
  // Very rough, but stable and conservative.
  return Math.ceil((text ?? "").length / 4);
}

export function truncateToTokenLimit(text: string, maxTokens: number): { text: string; truncated: boolean; estimatedTokens: number } {
  const est = estimateTokens(text);
  if (est <= maxTokens) return { text, truncated: false, estimatedTokens: est };

  // Convert tokens back to characters using the same heuristic.
  const maxChars = Math.max(0, maxTokens * 4);
  const truncatedText = text.slice(0, maxChars);
  return { text: truncatedText, truncated: true, estimatedTokens: estimateTokens(truncatedText) };
}

