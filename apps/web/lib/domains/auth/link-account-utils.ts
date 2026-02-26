export function parseLinkErrorMessage(error: unknown): string {
  const raw = String(error ?? "");
  return raw.includes(": ") ? raw.split(": ").slice(1).join(": ") : raw;
}
