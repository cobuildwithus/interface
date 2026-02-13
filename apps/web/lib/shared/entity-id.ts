import { extractFullHashFromUrl } from "@/lib/integrations/farcaster/parse-cast-url";

export type EntityIdPlatform = "farcaster" | "x";

type ParsedEntityId =
  | { platform: "farcaster"; entityId: `0x${string}`; queryAliases: string[] }
  | { platform: "x"; entityId: string; queryAliases: string[] }
  | { platform: "unknown"; entityId: string; queryAliases: string[] };

type ParseEntityIdOptions = {
  allowUnknown?: boolean;
  unknownCase?: "preserve" | "lower";
};

const FARCASTER_HEX_40 = /^[0-9a-f]{40}$/i;
const FARCASTER_0X_HEX_40 = /^0x[0-9a-f]{40}$/i;
const X_STATUS_ID = /^\d{5,32}$/;
const X_STATUS_URL = /(?:^|\/\/)(?:www\.)?(?:x|twitter)\.com\/.+?\/status\/(\d{5,32})(?:\b|\/|$)/i;

function normalizeFarcasterHash(value: string): `0x${string}` | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (FARCASTER_0X_HEX_40.test(trimmed)) {
    return trimmed.toLowerCase() as `0x${string}`;
  }

  if (FARCASTER_HEX_40.test(trimmed)) {
    return `0x${trimmed.toLowerCase()}` as `0x${string}`;
  }

  return null;
}

function normalizeXStatusId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(X_STATUS_URL);
  const candidate = urlMatch?.[1] ?? trimmed;
  if (!candidate) return null;

  return X_STATUS_ID.test(candidate) ? candidate : null;
}

export function parseEntityId(
  input: string | null | undefined,
  options: ParseEntityIdOptions = {}
): ParsedEntityId | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const farcasterFromUrl = extractFullHashFromUrl(trimmed);
  const farcaster = normalizeFarcasterHash(farcasterFromUrl ?? trimmed);
  if (farcaster) {
    return {
      platform: "farcaster",
      entityId: farcaster,
      queryAliases: [farcaster, farcaster.slice(2)],
    };
  }

  const xPostId = normalizeXStatusId(trimmed);
  if (xPostId) return { platform: "x", entityId: xPostId, queryAliases: [xPostId] };

  if (options.allowUnknown) {
    const unknownCase = options.unknownCase ?? "preserve";
    const entityId = unknownCase === "lower" ? trimmed.toLowerCase() : trimmed;
    return { platform: "unknown", entityId, queryAliases: [entityId] };
  }

  return null;
}

type NormalizeEntityIdOptions = {
  allowUnknown?: boolean;
  unknownCase?: "preserve" | "lower";
};

export function normalizeEntityId(
  input: string | null | undefined,
  options: NormalizeEntityIdOptions = {}
): string | null {
  return parseEntityId(input, options)?.entityId ?? null;
}
