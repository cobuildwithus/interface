export function normalizeUsernames(items: string[]): string[] {
  return items
    .map((item) => item.replace(/^@/, "").trim().toLowerCase())
    .filter((item) => item.length > 0);
}
