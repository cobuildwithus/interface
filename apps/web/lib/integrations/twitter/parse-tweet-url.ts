const TWEET_ID_REGEX = /^\d{5,32}$/;

export type ParsedTweetUrl = {
  tweetId: string;
  url: string | null;
  /** The username extracted from the URL, if available. Null for raw tweet IDs. */
  username: string | null;
};

/**
 * Parse an X/Twitter status URL (or raw tweet id) into a tweet id and username.
 * Supports:
 * - Raw tweet id: 1999394881027080400
 * - x.com/{user}/status/{id}
 * - twitter.com/{user}/status/{id}
 * - mobile.twitter.com/{user}/status/{id}
 */
export function parseTweetInput(input: string): ParsedTweetUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (TWEET_ID_REGEX.test(trimmed)) {
    return { tweetId: trimmed, url: null, username: null };
  }

  const match = trimmed.match(
    /(https?:\/\/(?:www\.)?(?:x\.com|twitter\.com|mobile\.twitter\.com)\/([^/]+)\/status\/(\d+))/i
  );
  if (!match) return null;

  return {
    tweetId: match[3],
    url: match[1],
    username: match[2],
  };
}

/**
 * Extract just the username from an X/Twitter status URL.
 * Returns null for raw tweet IDs or invalid URLs.
 */
export function extractUsernameFromTweetUrl(input: string): string | null {
  return parseTweetInput(input)?.username ?? null;
}
