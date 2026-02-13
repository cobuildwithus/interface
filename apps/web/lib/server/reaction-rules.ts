import "server-only";

import { parseUnits } from "viem";
import type { Reaction } from "@/generated/prisma/enums";
import { ALLOWED_REACTIONS, type ReactionType } from "@/lib/domains/rules/rules/reaction-types";
import { listRulesForAddress, upsertRulesForAddress } from "@/app/api/me/rules/queries";
import { type ErrorResult, type OkResult } from "@/lib/server/result";
import { isRecord } from "@/lib/server/validation";
import type { JsonValue } from "@/lib/shared/json";

export type ReactionRuleRecord = {
  reaction: ReactionType;
  enabled: boolean;
  amount: string;
};

export type ReactionRulesResponse = {
  rules: ReactionRuleRecord[];
};

type ReactionPayload = {
  enabled?: boolean;
  amount?: string | number;
};

type RulesUpsertRequestBody = {
  reactions: Partial<Record<ReactionType, ReactionPayload>>;
};

const MAX_USD_MICROS: bigint = 1_000_000n * 1_000_000n;
const MIN_USD_MICROS: bigint = 50_000n;

function isValidReactionType(reaction: string): reaction is ReactionType {
  return ALLOWED_REACTIONS.includes(reaction as ReactionType);
}

function normalizeAmountToMicrosOrThrow(amount: string | number): string {
  const raw = String(amount).trim();
  if (raw.length === 0) {
    throw new Error("amount must not be empty");
  }
  if (raw.startsWith("-")) {
    throw new Error("amount must be non-negative");
  }

  const decimalIndex = raw.indexOf(".");
  if (decimalIndex !== -1) {
    const fractional = raw.slice(decimalIndex + 1);
    if (fractional.length > 6) {
      throw new Error("Too many decimal places");
    }
  }

  let micros: bigint;
  try {
    micros = parseUnits(raw, 6);
  } catch {
    throw new Error("invalid amount format");
  }

  if (micros < 0n) {
    throw new Error("amount must be non-negative");
  }
  if (micros > 0n && micros < MIN_USD_MICROS) {
    throw new Error("amount below minimum of $0.05");
  }
  if (micros > MAX_USD_MICROS) {
    throw new Error("amount too large");
  }

  return micros.toString();
}

export async function getReactionRulesForAddress(
  address: string | null
): Promise<OkResult<ReactionRulesResponse> | ErrorResult> {
  if (!address) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  try {
    const rows = await listRulesForAddress(address);
    const seen = new Set<string>();
    const rules: ReactionRuleRecord[] = [];

    for (const row of rows) {
      const key = String(row.reaction);
      if (!isValidReactionType(key)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      rules.push({
        reaction: key,
        enabled: row.enabled,
        amount: row.amount,
      });
    }

    return { ok: true, data: { rules } };
  } catch {
    return { ok: false, status: 500, error: "Failed to fetch rules" };
  }
}

export async function updateReactionRulesForAddress(
  address: string | null,
  body: JsonValue | null | undefined
): Promise<OkResult<{ ok: true }> | ErrorResult> {
  if (!address) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (!isRecord(body)) {
    return { ok: false, status: 400, error: "Invalid request body" };
  }

  const { reactions } = body as RulesUpsertRequestBody;
  if (!reactions || typeof reactions !== "object") {
    return { ok: false, status: 400, error: "reactions must be provided" };
  }

  const preparedUpdates: Array<{
    reaction: Reaction;
    enabled?: boolean;
    amountMicros?: string;
  }> = [];

  for (const [reactionKey, payloadUnknown] of Object.entries(reactions)) {
    if (!isValidReactionType(reactionKey)) {
      return { ok: false, status: 400, error: `Unknown reaction: ${reactionKey}` };
    }

    if (!isRecord(payloadUnknown)) {
      return {
        ok: false,
        status: 400,
        error: `Invalid payload for reaction: ${reactionKey}`,
      };
    }

    const payload = payloadUnknown as ReactionPayload;

    if (payload.enabled !== undefined && typeof payload.enabled !== "boolean") {
      return {
        ok: false,
        status: 400,
        error: `enabled must be a boolean for reaction: ${reactionKey}`,
      };
    }

    let amountMicros: string | undefined;
    if (payload.amount !== undefined) {
      try {
        amountMicros = normalizeAmountToMicrosOrThrow(payload.amount);
      } catch (err) {
        const message = err instanceof Error ? err.message : "invalid amount";
        return {
          ok: false,
          status: 400,
          error: `amount invalid for reaction ${reactionKey}: ${message}`,
        };
      }
    }

    if (payload.enabled === undefined && amountMicros === undefined) {
      continue;
    }

    preparedUpdates.push({
      reaction: reactionKey as Reaction,
      enabled: payload.enabled,
      amountMicros,
    });
  }

  if (preparedUpdates.length === 0) {
    return { ok: true, data: { ok: true } };
  }

  await upsertRulesForAddress(address, preparedUpdates);

  return { ok: true, data: { ok: true } };
}
