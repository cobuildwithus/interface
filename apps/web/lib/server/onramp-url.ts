import "server-only";

import { generateJwt } from "@coinbase/cdp-sdk/auth";
import { isAddress } from "viem";
import { type Result } from "@/lib/server/result";
import { normalizeAddress } from "@/lib/shared/address";
import { isRecord } from "@/lib/server/validation";
import type { JsonValue } from "@/lib/shared/json";

const JWT_EXPIRES_IN_SECONDS = 120;
const NETWORK = "base" as const;
const ASSET_SYMBOL = "USDC" as const;
const MIN_FIAT_AMOUNT = 2;

type OnrampBody = {
  address?: string;
  presetFiatAmount?: number;
  presetCryptoAmount?: number;
  fiatCurrency?: string;
  redirectUrl?: string;
};

type OnrampTokenResponse = {
  token: string;
};

function buildCoinbaseOnrampBuyUrl({
  sessionToken,
  defaultAsset,
  defaultNetwork,
  presetFiatAmount,
  presetCryptoAmount,
  fiatCurrency,
  redirectUrl,
  partnerUserId,
}: {
  sessionToken: string;
  defaultAsset?: string;
  defaultNetwork?: string;
  presetFiatAmount?: number;
  presetCryptoAmount?: number;
  fiatCurrency?: string;
  redirectUrl?: string;
  partnerUserId?: string;
}): string {
  const u = new URL("https://pay.coinbase.com/buy");
  u.searchParams.set("sessionToken", sessionToken);
  if (defaultAsset) u.searchParams.set("defaultAsset", defaultAsset);
  if (defaultNetwork) u.searchParams.set("defaultNetwork", defaultNetwork);
  if (typeof presetFiatAmount === "number") {
    u.searchParams.set("presetFiatAmount", String(presetFiatAmount));
    if (fiatCurrency) u.searchParams.set("fiatCurrency", fiatCurrency);
  }
  if (typeof presetCryptoAmount === "number") {
    u.searchParams.set("presetCryptoAmount", String(presetCryptoAmount));
  }
  if (redirectUrl) u.searchParams.set("redirectUrl", redirectUrl);
  if (partnerUserId) u.searchParams.set("partnerUserId", partnerUserId);
  return u.toString();
}

function resolveRedirectUrl(origin: string, redirectUrl?: string): string {
  const fallback = `${origin}/onramp-return`;
  if (!redirectUrl) return fallback;
  try {
    const candidate = new URL(redirectUrl, origin);
    if (candidate.origin !== origin) return fallback;
    return candidate.toString();
  } catch {
    return fallback;
  }
}

export async function getCoinbaseOnrampUrl(
  sessionAddress: string | null,
  body: JsonValue | null | undefined,
  origin: string
): Promise<Result<{ url: string }>> {
  if (!sessionAddress) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (!isRecord(body)) {
    return { ok: false, status: 400, error: "Invalid request body" };
  }

  const {
    address,
    presetFiatAmount,
    presetCryptoAmount,
    fiatCurrency = "USD",
    redirectUrl,
  } = body as OnrampBody;

  if (!address || typeof address !== "string" || !isAddress(address)) {
    return { ok: false, status: 400, error: "Invalid address" };
  }

  const normalizedAddress = normalizeAddress(address);
  if (sessionAddress !== normalizedAddress) {
    return { ok: false, status: 403, error: "Address mismatch" };
  }

  if (
    presetFiatAmount !== undefined &&
    (!Number.isFinite(presetFiatAmount) || presetFiatAmount < MIN_FIAT_AMOUNT)
  ) {
    return {
      ok: false,
      status: 400,
      error: `Minimum amount is $${MIN_FIAT_AMOUNT}`,
    };
  }

  if (
    presetCryptoAmount !== undefined &&
    (!Number.isFinite(presetCryptoAmount) || presetCryptoAmount <= 0)
  ) {
    return {
      ok: false,
      status: 400,
      error: "presetCryptoAmount must be a positive number",
    };
  }

  if (fiatCurrency && typeof fiatCurrency !== "string") {
    return { ok: false, status: 400, error: "fiatCurrency must be a string" };
  }

  const apiKeyId = process.env.CDP_API_KEY_ID;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET;
  if (!apiKeyId || !apiKeySecret) {
    return { ok: false, status: 500, error: "Server not configured for Coinbase CDP" };
  }

  const jwt = await generateJwt({
    apiKeyId,
    apiKeySecret,
    requestMethod: "POST",
    requestHost: "api.developer.coinbase.com",
    requestPath: "/onramp/v1/token",
    expiresIn: JWT_EXPIRES_IN_SECONDS,
  });

  const resp = await fetch("https://api.developer.coinbase.com/onramp/v1/token", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      addresses: [{ address: normalizedAddress, blockchains: [NETWORK] }],
      assets: [ASSET_SYMBOL],
    }),
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    return { ok: false, status: 502, error: `session token failed: ${text}` };
  }

  const { token } = (await resp.json()) as OnrampTokenResponse;
  const onrampUrl = buildCoinbaseOnrampBuyUrl({
    sessionToken: token,
    defaultAsset: ASSET_SYMBOL,
    defaultNetwork: NETWORK,
    presetFiatAmount,
    presetCryptoAmount,
    fiatCurrency,
    redirectUrl: resolveRedirectUrl(origin, redirectUrl),
    partnerUserId: normalizedAddress,
  });

  return { ok: true, data: { url: onrampUrl } };
}
