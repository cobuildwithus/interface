/**
 * Normalize a provider-native post identifier into the canonical format used by
 * `capital_allocation.round_submissions.post_id` and `capital_allocation.ai_model_outputs.post_id`.
 *
 * - Farcaster: 0x-prefixed 40 hex chars (lowercase)
 * - X: numeric string (trimmed)
 * - Unknown: trimmed, unchanged
 */
export function normalizePostId(value: string | number | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^0x[0-9a-f]{40}$/i.test(trimmed)) return `0x${trimmed.slice(2).toLowerCase()}`;
  if (/^[0-9a-f]{40}$/i.test(trimmed)) return `0x${trimmed.toLowerCase()}`;

  return trimmed;
}
