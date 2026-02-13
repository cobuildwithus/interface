import "server-only";

import { BASE_CHAIN_ID, contracts } from "@/lib/domains/token/onchain/addresses";
import { parseEntityId } from "@/lib/shared/entity-id";
import { formatRulesCheckError } from "@/lib/domains/rules/rules-api/http-error-json";
import {
  postRulesApiJson,
  RulesApiNotConfiguredError,
} from "@/lib/domains/rules/rules-api/post-json";
import { type Result } from "@/lib/server/result";
import { isRecord } from "@/lib/server/validation";
import type { JsonRecord, JsonValue } from "@/lib/shared/json";

const HEX_REGEX = /^0x[0-9a-f]+$/i;

function normalizeHex(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim().toLowerCase();
  if (!value) return null;
  const prefixed = value.startsWith("0x") ? value : `0x${value}`;
  if (!HEX_REGEX.test(prefixed)) return null;
  if ((prefixed.length - 2) % 2 !== 0) return null;
  return prefixed;
}

function isLikelyTxHash(value: string) {
  return value.length === 66;
}

function isLikelyAddress(value: string) {
  return value.length === 42;
}

function shortenHex(value: string | null, keep: number) {
  if (!value) return null;
  if (value.length <= keep * 2) return value;
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

type DirectIntentBody = {
  txHash?: string | null;
  tokenAddress?: string | null;
  entityId?: string | null;
  chainId?: number | string | null;
  recipient?: string | null;
};

export async function registerDirectIntent(
  body: JsonValue | null | undefined
): Promise<Result<JsonRecord>> {
  if (!isRecord(body)) {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  }

  const payload = body as DirectIntentBody;

  const txHash = normalizeHex(payload.txHash);
  if (!txHash || !isLikelyTxHash(txHash)) {
    return { ok: false, status: 400, error: "Invalid transaction hash." };
  }

  const tokenAddress = normalizeHex(payload.tokenAddress ?? contracts.CobuildToken);
  if (!tokenAddress || !isLikelyAddress(tokenAddress)) {
    return { ok: false, status: 400, error: "Invalid token address." };
  }

  const parsedEntity = parseEntityId(payload.entityId);
  if (!parsedEntity) {
    return { ok: false, status: 400, error: "Invalid entityId." };
  }

  const chainId = Number(payload.chainId ?? BASE_CHAIN_ID);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    return { ok: false, status: 400, error: "Invalid chainId." };
  }

  const recipient = payload.recipient ? normalizeHex(payload.recipient) : null;
  if (recipient && !isLikelyAddress(recipient)) {
    return { ok: false, status: 400, error: "Invalid recipient address." };
  }

  const rulesPayload: JsonRecord = {
    txHash,
    chainId,
    tokenAddress,
    entityId: parsedEntity.entityId,
    recipient,
  };

  if (parsedEntity.platform === "x") {
    rulesPayload.platform = "x";
  }

  try {
    console.info("[direct-intent] request", {
      chainId,
      platform: parsedEntity.platform,
      entityId: parsedEntity.entityId,
      txHash: shortenHex(txHash, 10),
      tokenAddress: shortenHex(tokenAddress, 10),
      recipient: shortenHex(recipient, 10),
    });
    const json = await postRulesApiJson<JsonRecord>("/v1/swaps/direct-intent", rulesPayload);
    console.info("[direct-intent] success", {
      entityId: parsedEntity.entityId,
      platform: parsedEntity.platform,
    });
    return { ok: true, data: json };
  } catch (err) {
    const error = err as Error & { status?: number };
    const status = typeof error.status === "number" ? error.status : 500;

    if (error instanceof RulesApiNotConfiguredError) {
      return { ok: false, status: 500, error: error.message };
    }

    console.error("[direct-intent] failed", {
      status,
      entityId: parsedEntity.entityId,
      platform: parsedEntity.platform,
      message: error.message,
    });
    return {
      ok: false,
      status,
      error: formatRulesCheckError(error, { defaultMessage: "Failed to record boost." }),
    };
  }
}
