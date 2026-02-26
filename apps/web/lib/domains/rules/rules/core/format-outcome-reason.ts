/**
 * Rewrites low-level rule-engine reasons into end-user friendly guidance.
 *
 * The rules engine emits reasons that are helpful for debugging ("missing mention @x"),
 * but these can read awkwardly in the UI. This formatter keeps the intent while
 * turning it into an actionable instruction.
 */

const joinNaturalList = (items: string[]): string => {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const uniqInOrder = (items: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
};

const normalizePatternForDisplay = (value: string): string => {
  const trimmed = value.trim().replace(/[.]+$/g, "");
  if (!trimmed) return trimmed;
  return trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/g, "");
};

/**
 * Best-effort conversion of reasons like:
 * - "Cast is missing required elements: missing mention @x."
 * - "Deterministic checks failed: missing link matching example.com."
 */
export function formatOutcomeReasonForUser(reason: string): string {
  const raw = (reason ?? "").trim();
  if (!raw) return raw;

  const lower = raw.toLowerCase();
  const mentionsMissing = lower.includes("missing mention");
  const linkMissing = lower.includes("missing link");

  if (!mentionsMissing && !linkMissing) return raw;

  const mentions = mentionsMissing
    ? uniqInOrder(
        Array.from(raw.matchAll(/@([a-z0-9_]{1,15})/gi)).map((m) => (m[1] ?? "").toLowerCase())
      )
    : [];

  const linkPatterns: string[] = [];
  if (linkMissing) {
    for (const match of raw.matchAll(/missing link matching\s+([^\n;]+)/gi)) {
      const captured = match[1];
      if (typeof captured !== "string") continue;
      const cleaned = normalizePatternForDisplay(captured);
      if (cleaned) linkPatterns.push(cleaned);
    }
  }
  const links = uniqInOrder(linkPatterns);

  if (mentions.length === 0 && links.length === 0) return raw;

  const instructions: string[] = [];
  if (mentions.length > 0) {
    const handles = mentions.map((handle) => `@${handle}`);
    instructions.push(
      handles.length === 1 ? `tag ${handles[0]}` : `tag ${joinNaturalList(handles)}`
    );
  }
  if (links.length > 0) {
    instructions.push(
      links.length === 1
        ? `include a link to ${links[0]}`
        : `include a link to ${joinNaturalList(links)}`
    );
  }

  const combined = instructions.join(" and ");
  return `Post not eligible. Please ${combined} in your post, then submit again.`;
}
