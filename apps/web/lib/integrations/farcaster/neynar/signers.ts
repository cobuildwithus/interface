import { fetchJsonWithTimeout } from "@/lib/integrations/http/fetch";
import { normalizeSignerPermissions } from "@/lib/integrations/farcaster/signer-utils";

import {
  NEYNAR_ACCEPT_HEADERS,
  NEYNAR_API_BASE,
  NEYNAR_JSON_HEADERS,
  getNeynarApiKey,
} from "@/lib/integrations/farcaster/neynar/constants";
import { getErrorMessage, getErrorStatus } from "@/lib/integrations/farcaster/neynar/errors";
import type { ErrorLike } from "@/lib/shared/errors";
import type {
  FetchNeynarOptions,
  NeynarCreateSignerPayload,
  NeynarCreateSignerResult,
  NeynarFreshFidPayload,
  NeynarFreshFidResult,
  NeynarRegisterAccountPayload,
  NeynarRegisterAccountResult,
  NeynarSignerStatusPayload,
  NeynarSignerStatusResult,
} from "@/lib/integrations/farcaster/neynar/types";

/**
 * Look up signer status from Neynar API.
 */
export async function neynarLookupSigner(signerUuid: string): Promise<NeynarSignerStatusResult> {
  const apiKey = getNeynarApiKey();
  if (!apiKey) {
    return { ok: false, error: "Neynar API key not configured." };
  }

  const endpoint = `${NEYNAR_API_BASE}/signer/?signer_uuid=${encodeURIComponent(signerUuid)}`;

  try {
    const payload = await fetchJsonWithTimeout<NeynarSignerStatusPayload>(endpoint, {
      headers: { ...NEYNAR_ACCEPT_HEADERS, "x-api-key": apiKey },
    });

    const resolved = payload?.result ?? payload ?? {};
    const status = typeof resolved.status === "string" ? resolved.status : null;
    const permissions = normalizeSignerPermissions(resolved.signer_permissions);

    return { ok: true, status, permissions };
  } catch (err) {
    const error = err as ErrorLike;
    return {
      ok: false,
      error: getErrorMessage(error, "Failed to look up signer status."),
      status: getErrorStatus(error),
    };
  }
}

export async function neynarGetFreshAccountFid(
  walletId: string,
  options?: FetchNeynarOptions
): Promise<NeynarFreshFidResult> {
  const apiKey = getNeynarApiKey();
  if (!apiKey) {
    return { ok: false, error: "Neynar API key not configured." };
  }

  try {
    const payload = await fetchJsonWithTimeout<NeynarFreshFidPayload>(
      `${NEYNAR_API_BASE}/user/fid`,
      {
        headers: {
          "x-api-key": apiKey,
          "x-wallet-id": walletId,
        },
        timeoutMs: options?.timeoutMs,
      }
    );

    const fid = payload?.fid;
    if (!Number.isFinite(fid) || !fid || fid <= 0) {
      return { ok: false, error: "Invalid FID response from Neynar." };
    }

    return { ok: true, fid };
  } catch (err) {
    const error = err as ErrorLike;
    return {
      ok: false,
      error: getErrorMessage(error, "Failed to fetch FID from Neynar."),
    };
  }
}

export async function neynarCreateSigner(): Promise<NeynarCreateSignerResult> {
  const apiKey = getNeynarApiKey();
  if (!apiKey) {
    return { ok: false, error: "Neynar API key not configured." };
  }

  try {
    const payload = await fetchJsonWithTimeout<NeynarCreateSignerPayload>(
      `${NEYNAR_API_BASE}/signer/`,
      {
        method: "POST",
        headers: {
          ...NEYNAR_JSON_HEADERS,
          "x-api-key": apiKey,
        },
        body: JSON.stringify({}),
      }
    );

    const signerUuid = payload?.signer_uuid;
    const publicKey = payload?.public_key;
    if (!signerUuid || !publicKey) {
      return { ok: false, error: "Signer response missing required fields." };
    }

    const rawPermissions =
      payload?.permissions ??
      (payload as { signer_permissions?: string[] } | null | undefined)?.signer_permissions;

    return {
      ok: true,
      signerUuid,
      publicKey: publicKey as `0x${string}`,
      permissions: normalizeSignerPermissions(rawPermissions) ?? null,
    };
  } catch (err) {
    const error = err as ErrorLike;
    return {
      ok: false,
      error: getErrorMessage(error, "Failed to create signer."),
      status: getErrorStatus(error),
    };
  }
}

export async function neynarRegisterAccount(
  payload: NeynarRegisterAccountPayload,
  walletId: string
): Promise<NeynarRegisterAccountResult> {
  const apiKey = getNeynarApiKey();
  if (!apiKey) {
    return { ok: false, error: "Neynar API key not configured." };
  }

  try {
    await fetchJsonWithTimeout<void>(`${NEYNAR_API_BASE}/user/`, {
      method: "POST",
      headers: {
        ...NEYNAR_JSON_HEADERS,
        "x-api-key": apiKey,
        "x-wallet-id": walletId,
      },
      body: JSON.stringify(payload),
    });

    return { ok: true };
  } catch (err) {
    const error = err as ErrorLike;
    return {
      ok: false,
      error: getErrorMessage(error, "Failed to register Farcaster account."),
      status: getErrorStatus(error),
    };
  }
}
