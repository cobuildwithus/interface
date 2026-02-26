/**
 * Format a date as a human-readable age string (e.g., "12d old", "3mo old")
 */
export function formatAge(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "today";
  if (diffDays === 1) return "1d old";
  if (diffDays < 7) return `${diffDays}d old`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w old`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo old`;
  return `${Math.floor(diffDays / 365)}y old`;
}
