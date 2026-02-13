/**
 * Inserts @mentions into cast text at their byte positions.
 *
 * Farcaster stores mentions separately from text:
 * - mentionedFids: array of user FIDs
 * - mentionsPositions: byte positions where each mention should be inserted
 * - The positions are byte offsets, not character indices (matters for unicode)
 *
 * @example
 * insertMentions("hello  world", [6], [{ fid: 123, username: "alice" }])
 * // returns "hello @alice world"
 */
export type MentionProfileInput = {
  fid?: number | string | bigint | null;
  fname?: string | number | null;
  [key: string]: number | string | bigint | null | undefined;
};

export function insertMentions(
  text: string,
  positions: number[],
  profiles: Array<{ fid: number; username?: string | null }>
): string {
  if (!positions.length || !profiles.length) return text;
  if (positions.length !== profiles.length) return text;

  const textBytes = new TextEncoder().encode(text);
  const sortedMentions = positions
    .map((pos, i) => ({ pos, profile: profiles[i] }))
    .sort((a, b) => b.pos - a.pos);

  let resultBytes = textBytes;

  for (const { pos, profile } of sortedMentions) {
    const username = profile?.username;
    if (!username || pos < 0 || pos > resultBytes.length) continue;

    const mentionText = `@${username}`;
    const mentionBytes = new TextEncoder().encode(mentionText);

    const before = resultBytes.slice(0, pos);
    const after = resultBytes.slice(pos);
    resultBytes = new Uint8Array([...before, ...mentionBytes, ...after]);
  }

  return new TextDecoder().decode(resultBytes);
}

function toNumberOrNull(value: number | string | bigint | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toOptionalString(value: string | number | null | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export function parseMentionProfiles(
  mentionProfiles: Array<MentionProfileInput | null | undefined> | null | undefined
): Array<{ fid: number; username: string | null }> {
  if (!Array.isArray(mentionProfiles)) return [];

  const result: Array<{ fid: number; username: string | null }> = [];

  for (const entry of mentionProfiles) {
    if (!entry) continue;

    const fid = toNumberOrNull(entry.fid);
    if (fid === null) continue;

    const username = toOptionalString(entry.fname);
    result.push({ fid, username });
  }

  return result;
}

export function insertMentionsFromProfiles(
  text: string | null,
  positions: number[] | null,
  mentionProfiles: Array<MentionProfileInput | null | undefined> | null | undefined
): string {
  const resolvedText = text ?? "";
  if (!positions || positions.length === 0) return resolvedText;

  const profiles = parseMentionProfiles(mentionProfiles);
  if (profiles.length === 0) return resolvedText;

  return insertMentions(resolvedText, positions, profiles);
}
