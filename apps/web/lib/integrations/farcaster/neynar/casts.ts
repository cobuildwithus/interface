import { fetchJsonWithTimeout } from "@/lib/integrations/http/fetch";
import { isFullCastHash } from "@/lib/integrations/farcaster/parse-cast-url";

import {
  NEYNAR_ACCEPT_HEADERS,
  NEYNAR_API_BASE,
  NEYNAR_JSON_HEADERS,
  getNeynarApiKey,
} from "@/lib/integrations/farcaster/neynar/constants";
import { getErrorMessage, getErrorStatus } from "@/lib/integrations/farcaster/neynar/errors";
import type { ErrorLike } from "@/lib/shared/errors";
import type {
  DeleteCastInput,
  DeleteCastPayload,
  DeleteCastResponse,
  DeleteCastResult,
  FetchNeynarOptions,
  NeynarCast,
  NeynarCastFetchPayload,
  NeynarCastFetchResult,
  NeynarCastSummary,
  PublishCastInput,
  PublishCastPayload,
  PublishCastResponse,
  PublishCastResult,
  ResolveCastResult,
} from "@/lib/integrations/farcaster/neynar/types";

const HASH_REGEX = /^0x[a-f0-9]{40}$/i;

function normalizeCastHashInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized =
    trimmed.startsWith("0x") || trimmed.startsWith("0X") ? trimmed : `0x${trimmed}`;
  return HASH_REGEX.test(normalized) ? normalized.toLowerCase() : null;
}

function isCastDeleted(cast: NeynarCast): boolean {
  if (cast.deleted_at) return true;
  if (typeof cast.deleted === "boolean") return cast.deleted;
  return false;
}

/**
 * Resolve a cast hash from a Farcaster URL using Neynar API.
 */
export async function neynarResolveCastFromUrl(url: string): Promise<ResolveCastResult> {
  const apiKey = getNeynarApiKey();
  if (!apiKey) {
    return { ok: false, error: "Neynar API key not configured." };
  }

  const endpoint = `${NEYNAR_API_BASE}/cast?identifier=${encodeURIComponent(url)}&type=url`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        ...NEYNAR_ACCEPT_HEADERS,
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        error: response.status === 404 ? "Cast not found." : `Neynar API error: ${response.status}`,
      };
    }

    const data = (await response.json()) as { cast?: NeynarCastSummary };
    const hash = data?.cast?.hash;
    if (typeof hash === "string" && isFullCastHash(hash)) {
      return { ok: true, hash };
    }

    return { ok: false, error: "Could not resolve cast hash from URL." };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to resolve cast.",
    };
  }
}

/**
 * Fetch a Farcaster cast from Neynar by hash using the public V2 API.
 */
export async function neynarFetchCastByHash(
  hash: string,
  options?: FetchNeynarOptions
): Promise<NeynarCastFetchResult> {
  const apiKey = getNeynarApiKey();
  if (!apiKey) {
    return { ok: false, error: "Neynar API key not configured." };
  }

  const normalized = normalizeCastHashInput(hash);
  if (!normalized) {
    return { ok: false, error: "Invalid cast hash." };
  }

  const endpoint = `${NEYNAR_API_BASE}/cast?identifier=${encodeURIComponent(normalized)}&type=hash`;

  try {
    const data = await fetchJsonWithTimeout<NeynarCastFetchPayload>(endpoint, {
      headers: {
        ...NEYNAR_ACCEPT_HEADERS,
        "x-api-key": apiKey,
      },
      timeoutMs: options?.timeoutMs,
    });

    const cast = data?.cast ?? null;
    if (!cast) {
      return { ok: false, error: "Cast not found.", notFound: true };
    }

    if (isCastDeleted(cast)) {
      return { ok: false, error: "Cast deleted.", deleted: true };
    }

    return { ok: true, cast };
  } catch (err) {
    const error = err as ErrorLike;
    const status = getErrorStatus(error);
    if (status === 404 || status === 410) {
      return { ok: false, error: "Cast not found.", status, notFound: true };
    }
    return {
      ok: false,
      error: getErrorMessage(error, "Failed to fetch cast."),
      status,
    };
  }
}

/**
 * Publish a cast (or reply) using Neynar API.
 */
export async function neynarPublishCast(input: PublishCastInput): Promise<PublishCastResult> {
  const apiKey = getNeynarApiKey();
  if (!apiKey) {
    return { ok: false, error: "Neynar API key not configured." };
  }

  const payload: PublishCastPayload = {
    signer_uuid: input.signerUuid,
    text: input.text,
  };

  if (input.parentHash) payload.parent = input.parentHash;
  if (typeof input.parentAuthorFid === "number") payload.parent_author_fid = input.parentAuthorFid;
  if (input.idem) payload.idem = input.idem;
  if (input.embeds?.length) payload.embeds = input.embeds;

  try {
    const data = await fetchJsonWithTimeout<PublishCastResponse>(`${NEYNAR_API_BASE}/cast/`, {
      method: "POST",
      headers: {
        ...NEYNAR_JSON_HEADERS,
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      timeoutMs: input.timeoutMs,
      retriesOn429: input.retriesOn429,
    });

    const hash = data?.cast?.hash;
    if (data?.success && typeof hash === "string" && isFullCastHash(hash)) {
      return { ok: true, hash, cast: data.cast };
    }

    return { ok: false, error: "Unexpected response from Neynar API." };
  } catch (err) {
    const error = err as ErrorLike;
    return {
      ok: false,
      error: getErrorMessage(error, "Failed to publish cast."),
      status: getErrorStatus(error),
    };
  }
}

/**
 * Delete a cast using Neynar API.
 */
export async function neynarDeleteCast(input: DeleteCastInput): Promise<DeleteCastResult> {
  const apiKey = getNeynarApiKey();
  if (!apiKey) {
    return { ok: false, error: "Neynar API key not configured." };
  }

  const targetHash = normalizeCastHashInput(input.castHash);
  if (!targetHash) {
    return { ok: false, error: "Invalid cast hash." };
  }

  const payload: DeleteCastPayload = {
    signer_uuid: input.signerUuid,
    target_hash: targetHash,
  };

  try {
    const data = await fetchJsonWithTimeout<DeleteCastResponse>(`${NEYNAR_API_BASE}/cast/`, {
      method: "DELETE",
      headers: {
        ...NEYNAR_JSON_HEADERS,
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      timeoutMs: input.timeoutMs,
      retriesOn429: input.retriesOn429,
    });

    if (data?.success) {
      return { ok: true };
    }

    return { ok: false, error: data?.message ?? "Unexpected response from Neynar API." };
  } catch (err) {
    const error = err as ErrorLike;
    const status = getErrorStatus(error);
    const message = getErrorMessage(error, "Failed to delete cast.");
    if (status === 404 && message.toLowerCase().includes("cast not found or already deleted")) {
      return { ok: true };
    }
    return {
      ok: false,
      error: message,
      status,
    };
  }
}
