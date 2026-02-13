import { fetchJsonWithTimeout } from "@/lib/integrations/http/fetch";

import {
  NEYNAR_API_BASE,
  NEYNAR_JSON_HEADERS,
  getNeynarApiKey,
} from "@/lib/integrations/farcaster/neynar/constants";
import { getErrorMessage, getErrorStatus } from "@/lib/integrations/farcaster/neynar/errors";
import type { ErrorLike } from "@/lib/shared/errors";
import type {
  FetchNeynarOptions,
  NeynarUser,
  UpdateUserProfileInput,
  UpdateUserProfileResult,
} from "@/lib/integrations/farcaster/neynar/types";

/**
 * Fetch users by fids from Neynar API.
 */
export async function neynarFetchUsersByFids(
  fids: number[],
  options?: FetchNeynarOptions
): Promise<NeynarUser[]> {
  const apiKey = getNeynarApiKey();
  if (!apiKey) return [];

  const unique = Array.from(new Set(fids.filter((n) => Number.isFinite(n) && n > 0)));
  if (unique.length === 0) return [];

  try {
    const data = await fetchJsonWithTimeout<{ users?: NeynarUser[] }>(
      `${NEYNAR_API_BASE}/user/bulk/?fids=${unique.join(",")}`,
      {
        headers: { "x-api-key": apiKey },
        timeoutMs: options?.timeoutMs,
      }
    );
    return data?.users ?? [];
  } catch {
    return [];
  }
}

/**
 * Update a Farcaster user profile using Neynar API.
 */
export async function neynarUpdateUserProfile(
  input: UpdateUserProfileInput
): Promise<UpdateUserProfileResult> {
  const apiKey = getNeynarApiKey();
  if (!apiKey) {
    return { ok: false, error: "Neynar API key not configured." };
  }

  const payload: {
    signer_uuid: string;
    display_name?: string | null;
    pfp_url?: string | null;
  } = {
    signer_uuid: input.signerUuid,
  };

  if (input.displayName !== undefined) payload.display_name = input.displayName;
  if (input.pfpUrl !== undefined) payload.pfp_url = input.pfpUrl;

  try {
    await fetchJsonWithTimeout<void>(`${NEYNAR_API_BASE}/user/`, {
      method: "PATCH",
      headers: {
        ...NEYNAR_JSON_HEADERS,
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    return { ok: true };
  } catch (err) {
    const error = err as ErrorLike;
    return {
      ok: false,
      error: getErrorMessage(error, "Failed to update user profile."),
      status: getErrorStatus(error),
    };
  }
}

/**
 * Extract a Neynar score from a Neynar user payload.
 * Prefers `experimental.neynar_user_score`, falls back to top-level `score` if present.
 */
export function extractScoreFromNeynarUser(user: NeynarUser | undefined): number | null {
  if (!user) return null;
  const experimentalScore = user.experimental?.neynar_user_score;
  const topLevelScore = user.score;
  const candidate = typeof experimentalScore === "number" ? experimentalScore : topLevelScore;
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
}
