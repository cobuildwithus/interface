/**
 * Truncate a string by words (not characters) and add an ellipsis when truncated.
 * Useful for breadcrumbs/titles where we want stable, readable fallbacks.
 */
export function truncateWords(text: string, maxWords: number, fallback = "Submission"): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return fallback;

  const words = trimmed.split(/\s+/).slice(0, maxWords);
  const truncated = words.join(" ");
  return truncated.length < trimmed.length ? `${truncated}…` : truncated;
}
