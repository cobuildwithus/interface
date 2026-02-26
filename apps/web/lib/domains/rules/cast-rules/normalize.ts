/**
 * Normalizes a 20-byte Farcaster cast hash.
 * Accepts inputs with or without a 0x prefix.
 * Returns lowercase hex string without prefix, or null if invalid.
 */
export function normalizeCastHashRaw(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const withoutPrefix =
    trimmed.startsWith("0x") || trimmed.startsWith("0X") ? trimmed.slice(2) : trimmed;
  const normalized = withoutPrefix.toLowerCase();
  return /^[0-9a-f]{40}$/.test(normalized) ? normalized : null;
}

/**
 * Normalizes a Farcaster cast hash to a lowercase 0x-prefixed hex string.
 */
export function normalizeCastHash(value: string | null | undefined): string | null {
  const normalized = normalizeCastHashRaw(value);
  return normalized ? `0x${normalized}` : null;
}

/**
 * Converts a Farcaster cast hash into its Buffer representation.
 */
export function castHashToBuffer(value: string | null | undefined): Buffer | null {
  const normalized = normalizeCastHash(value);
  if (!normalized) return null;
  return Buffer.from(normalized.slice(2), "hex");
}
