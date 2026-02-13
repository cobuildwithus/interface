import { parseCastInput, type ParsedCastUrl } from "@/lib/integrations/farcaster/parse-cast-url";
import { parseTweetInput, type ParsedTweetUrl } from "@/lib/integrations/twitter/parse-tweet-url";

export type PostPlatform = "farcaster" | "x";

export type LinkedAccountState = {
  farcaster: boolean;
  twitter: boolean;
};

type PostRefCandidate =
  | { kind: "ready"; postRef: string; username: string | null }
  | { kind: "needs_resolution"; url: string; username: string | null }
  | { kind: "incomplete"; error: string }
  | { kind: "error"; error: string };

type PlatformDefinition = {
  id: PostPlatform;
  label: string;
  linkAccountButtonType: "farcaster" | "twitter";
  composeUrl: (text?: string | null) => string;
  isLinked: (linked: LinkedAccountState) => boolean;
  buttonClassName: string;
  input: {
    placeholder: string;
    cta: {
      label: string;
      busyLabel: string;
    };
    toPostRefCandidate: (input: string) => PostRefCandidate;
  };
};

function buildFarcasterComposeUrl(text?: string | null): string {
  const base = "https://farcaster.xyz/~/compose";
  const params = new URLSearchParams({ channelKey: "cobuild" });
  if (text) params.set("text", text);
  return `${base}?${params.toString()}`;
}

const FARCASTER_TO_X_HANDLES: Record<string, string> = {
  "@cobuild": "@justcobuild",
};

function mapMentionsForX(text: string): string {
  let result = text;
  for (const [farcaster, x] of Object.entries(FARCASTER_TO_X_HANDLES)) {
    result = result.replaceAll(farcaster, x);
  }
  return result;
}

function buildXComposeUrl(text?: string | null): string {
  const base = "https://x.com/intent/post";
  const params = new URLSearchParams();
  if (text) params.set("text", mapMentionsForX(text));
  return params.size > 0 ? `${base}?${params.toString()}` : base;
}

function farcasterCandidate(parsed: ParsedCastUrl | null): PostRefCandidate {
  if (!parsed) return { kind: "error", error: "Paste a valid Farcaster URL or hash." };
  if (parsed.isFullHash) return { kind: "ready", postRef: parsed.hash, username: parsed.username };
  if (!parsed.url) {
    return { kind: "incomplete", error: "Short hashes require a Farcaster URL to resolve." };
  }
  return { kind: "needs_resolution", url: parsed.url, username: parsed.username };
}

function xCandidate(parsed: ParsedTweetUrl | null): PostRefCandidate {
  if (!parsed) return { kind: "error", error: "Paste a valid X status URL or id." };
  return { kind: "ready", postRef: parsed.tweetId, username: parsed.username };
}

export const PLATFORMS: Record<PostPlatform, PlatformDefinition> = {
  farcaster: {
    id: "farcaster",
    label: "Farcaster",
    linkAccountButtonType: "farcaster",
    composeUrl: buildFarcasterComposeUrl,
    isLinked: (linked) => linked.farcaster,
    buttonClassName: "flex-1 bg-[#8B5CF6] text-white hover:bg-[#7C3AED]",
    input: {
      placeholder: "farcaster.xyz/username/0x…",
      cta: { label: "Verify", busyLabel: "Verifying…" },
      toPostRefCandidate: (input) => farcasterCandidate(parseCastInput(input)),
    },
  },
  x: {
    id: "x",
    label: "X",
    linkAccountButtonType: "twitter",
    composeUrl: buildXComposeUrl,
    isLinked: (linked) => linked.twitter,
    buttonClassName:
      "flex-1 border border-transparent bg-black text-white hover:bg-neutral-800 dark:border-neutral-700",
    input: {
      placeholder: "x.com/user/status/… or post id",
      cta: { label: "Submit", busyLabel: "Submitting…" },
      toPostRefCandidate: (input) => xCandidate(parseTweetInput(input)),
    },
  },
};

export const POST_PLATFORMS: PostPlatform[] = ["farcaster", "x"];

export function parsePostInput(
  input: string
): { platform: PostPlatform; candidate: PostRefCandidate } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  for (const platform of POST_PLATFORMS) {
    const candidate = PLATFORMS[platform].input.toPostRefCandidate(trimmed);
    if (candidate.kind !== "error") return { platform, candidate };
  }

  return null;
}

export function detectPostPlatform(input: string): PostPlatform | null {
  return parsePostInput(input)?.platform ?? null;
}

export function formatPlatformList(platforms: PostPlatform[]): string {
  const labels = platforms.map((p) => PLATFORMS[p].label);
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
}

export function getDefaultPostInputPlaceholder(): string {
  return `${PLATFORMS.x.input.placeholder} or ${PLATFORMS.farcaster.input.placeholder}`;
}
