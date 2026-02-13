export const FARCASTER_USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{0,15}$/;

export function normalizeFarcasterUsername(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, "");
}

export function isValidFarcasterUsername(value: string): boolean {
  if (!value) return false;
  return FARCASTER_USERNAME_REGEX.test(normalizeFarcasterUsername(value));
}
