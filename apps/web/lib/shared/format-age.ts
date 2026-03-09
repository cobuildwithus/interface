/**
 * Format a date as a human-readable age string (e.g., "12d old", "3mo old")
 */
export function formatAge(date: Date | string): string {
  const now = new Date();
  const normalizedDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(normalizedDate.getTime())) {
    return "unknown";
  }

  const diffMs = now.getTime() - normalizedDate.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays < 1) return "today";
  if (diffDays === 1) return "1d old";
  if (diffDays < 7) return `${diffDays}d old`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w old`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo old`;
  return `${Math.floor(diffDays / 365)}y old`;
}
