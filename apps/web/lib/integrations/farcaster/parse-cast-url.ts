const CAST_HASH_REGEX = /^0x[a-fA-F0-9]{40}$/;
const CAST_HASH_PARTIAL_REGEX = /^0x[a-fA-F0-9]+$/;

export type ParsedCastUrl = {
  hash: string;
  isFullHash: boolean;
  url: string | null;
  /** The username extracted from the URL, if available. Null for raw hashes, conversation URLs, and supercast URLs. */
  username: string | null;
};

/**
 * Parse a cast URL or hash string into its components.
 * Supports:
 * - Raw hashes: 0x1234...
 * - farcaster.xyz/~/conversations/{hash}
 * - farcaster.xyz/{username}/{hash}
 * - warpcast.com/{username}/{hash}
 * - supercast.xyz/c/{hash}
 */
export function parseCastInput(input: string): ParsedCastUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Raw hash
  if (CAST_HASH_PARTIAL_REGEX.test(trimmed)) {
    return {
      hash: trimmed,
      isFullHash: trimmed.length === 42,
      url: null,
      username: null,
    };
  }

  // farcaster.xyz/~/conversations/{hash} - no username available
  const conversationMatch = trimmed.match(
    /(https?:\/\/(?:www\.)?farcaster\.xyz\/~\/conversations\/(0x[a-fA-F0-9]+))/i
  );
  if (conversationMatch) {
    const hash = conversationMatch[2];
    return {
      hash,
      isFullHash: hash.length === 42,
      url: conversationMatch[1],
      username: null,
    };
  }

  // farcaster.xyz/{username}/{hash} or warpcast.com/{username}/{hash}
  const farcasterMatch = trimmed.match(
    /(https?:\/\/(?:www\.)?(?:warpcast\.com|farcaster\.xyz)\/([^/]+)\/(0x[a-fA-F0-9]+))/i
  );
  if (farcasterMatch) {
    const hash = farcasterMatch[3];
    // Skip special paths that aren't usernames
    const potentialUsername = farcasterMatch[2];
    const username = potentialUsername === "~" ? null : potentialUsername;
    return {
      hash,
      isFullHash: hash.length === 42,
      url: farcasterMatch[1],
      username,
    };
  }

  // supercast.xyz/c/{hash} - no username available
  const supercastMatch = trimmed.match(
    /(https?:\/\/(?:www\.)?supercast\.xyz\/c\/(0x[a-fA-F0-9]+))/i
  );
  if (supercastMatch) {
    const hash = supercastMatch[2];
    return {
      hash,
      isFullHash: hash.length === 42,
      url: supercastMatch[1],
      username: null,
    };
  }

  return null;
}

/**
 * Extract just the username from a Farcaster cast URL.
 * Returns null for raw hashes, conversation URLs, and supercast URLs.
 */
export function extractUsernameFromCastUrl(input: string): string | null {
  return parseCastInput(input)?.username ?? null;
}

/**
 * Extract a full cast hash directly from a URL if possible.
 * Returns null if the URL format doesn't allow direct extraction
 * or if the hash is not a full 40-character hash.
 */
export function extractFullHashFromUrl(url: string): string | null {
  const parsed = parseCastInput(url);
  if (parsed?.isFullHash) {
    return parsed.hash;
  }
  return null;
}

/**
 * Check if a string is a valid full cast hash (0x + 40 hex chars).
 */
export function isFullCastHash(hash: string): boolean {
  return CAST_HASH_REGEX.test(hash);
}
