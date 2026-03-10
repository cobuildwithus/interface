import "server-only";

import { normalizeEvmAddress as normalizeAddress } from "@cobuild/wire";
import type { Hex } from "viem";
import { BASE_CHAIN_ID, contracts } from "@/lib/domains/token/onchain/addresses";
import { getClient } from "@/lib/domains/token/onchain/clients";
import { parseEntityId } from "@/lib/shared/entity-id";
import { formatRulesCheckError } from "@/lib/domains/rules/rules-api/http-error-json";
import {
  postRulesApiJson,
  RulesApiNotConfiguredError,
} from "@/lib/domains/rules/rules-api/post-json";
import prisma from "@/lib/server/db/cobuild-db-client";
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

type RegisterDirectIntentOptions = {
  ownerAddress: `0x${string}`;
};

async function verifyDirectIntentOwnership(params: {
  txHash: `0x${string}`;
  chainId: number;
  ownerAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  recipient: `0x${string}` | null;
}): Promise<{ ok: false; status: number; error: string } | null> {
  if (params.chainId !== BASE_CHAIN_ID) {
    return {
      ok: false,
      status: 400,
      error: `Unsupported chainId: ${params.chainId}`,
    };
  }

  const indexedSwap = await prisma.swapExecuted.findUnique({
    where: {
      txHash: params.txHash,
    },
    select: {
      chainId: true,
      from: true,
      recipient: true,
      tokenOut: true,
    },
  });

  if (indexedSwap) {
    if (
      indexedSwap.chainId !== params.chainId ||
      normalizeAddress(indexedSwap.from, "swapExecuted.from") !== params.ownerAddress
    ) {
      return {
        ok: false,
        status: 403,
        error: "Transaction does not belong to the authenticated wallet.",
      };
    }

    if (normalizeAddress(indexedSwap.tokenOut, "swapExecuted.tokenOut") !== params.tokenAddress) {
      return {
        ok: false,
        status: 403,
        error: "Transaction token does not match the requested boost token.",
      };
    }

    if (
      params.recipient &&
      normalizeAddress(indexedSwap.recipient, "swapExecuted.recipient") !== params.recipient
    ) {
      return {
        ok: false,
        status: 403,
        error: "Transaction recipient does not match the requested boost recipient.",
      };
    }

    return null;
  }

  const publicClient = getClient(BASE_CHAIN_ID);
  let transaction: Awaited<ReturnType<typeof publicClient.getTransaction>>;
  try {
    transaction = await publicClient.getTransaction({
      hash: params.txHash as Hex,
    });
  } catch {
    return {
      ok: false,
      status: 400,
      error: "Transaction could not be verified on Base.",
    };
  }

  if (normalizeAddress(transaction.from, "transaction.from") !== params.ownerAddress) {
    return {
      ok: false,
      status: 403,
      error: "Transaction does not belong to the authenticated wallet.",
    };
  }

  return null;
}

export async function registerDirectIntent(
  body: JsonValue | null | undefined,
  options: RegisterDirectIntentOptions
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

  const ownershipError = await verifyDirectIntentOwnership({
    txHash: txHash as `0x${string}`,
    chainId,
    ownerAddress: options.ownerAddress,
    tokenAddress: normalizeAddress(tokenAddress, "tokenAddress"),
    recipient: recipient ? normalizeAddress(recipient, "recipient") : null,
  });
  if (ownershipError) {
    return ownershipError;
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
