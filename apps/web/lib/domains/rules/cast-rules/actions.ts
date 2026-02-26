"use server";

import { revalidateTag } from "next/cache";

import { castHashToBuffer, normalizeCastHashRaw } from "@/lib/domains/rules/cast-rules/normalize";
import {
  getOrFetchNeynarScore,
  NEYNAR_ELIGIBILITY_MIN_SCORE,
} from "@/lib/domains/eligibility/neynar-score";
import { getSession } from "@/lib/domains/auth/session";
import prisma from "@/lib/server/db/cobuild-db-client";
import { runPlatformRulesServerCheck } from "@/lib/domains/rules/rules/core/check";
import { farcasterRulesAdapter } from "@/lib/domains/rules/rules/platforms/registry";
import type {
  CastRulesServerCheckInput,
  CheckCastAgainstRuleInput,
  CheckCastAgainstRuleResult,
} from "@/lib/domains/rules/cast-rules/types";

async function runCastRulesServerCheck(
  input: CastRulesServerCheckInput
): Promise<CheckCastAgainstRuleResult> {
  const normalizedRuleId = Number(input.ruleId);
  if (!Number.isFinite(normalizedRuleId) || normalizedRuleId <= 0) {
    return { ok: false, error: "Invalid rule id." };
  }

  const normalizedHash = normalizeCastHashRaw(input.castHash);
  if (!normalizedHash) {
    return { ok: false, error: "Invalid cast hash." };
  }

  const result = await runPlatformRulesServerCheck(farcasterRulesAdapter, {
    ruleId: normalizedRuleId,
    postRef: `0x${normalizedHash}`,
    address: input.address,
    timeoutMs: input.timeoutMs,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status };
  }

  return { ok: true, data: result.data };
}

/**
 * Checks a cast against a rule and triggers cache revalidation on success.
 * This is the main entry point for verifying cast submissions.
 * Validates that the cast belongs to the currently logged-in user's Farcaster account.
 */
export async function checkCastAgainstRule(
  input: CheckCastAgainstRuleInput
): Promise<CheckCastAgainstRuleResult> {
  const normalizedRuleId = Number(input.ruleId);
  if (!Number.isFinite(normalizedRuleId) || normalizedRuleId <= 0) {
    return { ok: false, error: "Invalid rule id." };
  }

  const normalizedHash = normalizeCastHashRaw(input.castHash);
  if (!normalizedHash) {
    return { ok: false, error: "Invalid cast hash." };
  }

  // Verify the user has a linked Farcaster account
  const session = await getSession();
  if (!session.farcaster) {
    return {
      ok: false,
      error: "You must link your Farcaster account before submitting a cast.",
    };
  }
  if (!session.address) {
    return {
      ok: false,
      error: "Sign in to verify submissions.",
    };
  }

  const userFid = session.farcaster.fid;

  // Eligibility gate — ensure the caller has sufficient Neynar score.
  try {
    const score = await getOrFetchNeynarScore(userFid);
    if (score == null) {
      return {
        ok: false,
        status: 403,
        error: "Ineligible for this round. Neynar score not found.",
      };
    }
    if (score < NEYNAR_ELIGIBILITY_MIN_SCORE) {
      return {
        ok: false,
        status: 403,
        error: "Ineligible for this round. Score too low.",
      };
    }
  } catch {
    // If the score check fails unexpectedly, fail closed to prevent bypassing the gate.
    return {
      ok: false,
      status: 403,
      error: "Ineligible for this round. Neynar score not found.",
    };
  }

  const result = await runCastRulesServerCheck({
    ruleId: normalizedRuleId,
    castHash: normalizedHash,
    address: session.address,
  });

  if (!result.ok) return result;
  if (result.data.outcomeCode === "post_not_found" || result.data.outcomeCode === "cast_not_found")
    return result;

  // Verify ownership after the API check (which can fetch + persist casts).
  const castHashBuffer = castHashToBuffer(normalizedHash);
  if (!castHashBuffer) {
    return { ok: false, error: "Invalid cast hash format." };
  }

  const cast = await prisma.farcasterCast.findUnique({
    where: { hash: castHashBuffer as Uint8Array<ArrayBuffer> },
    select: { fid: true },
  });

  if (!cast || cast.fid === null) {
    return {
      ok: false,
      error: "Cast not found. Please make sure the cast exists and try again.",
    };
  }

  if (cast.fid !== BigInt(userFid)) {
    return {
      ok: false,
      error: "This cast does not belong to your linked Farcaster account.",
    };
  }

  if (result.data.rulePassed) {
    revalidateTag(`round:submissions:${normalizedRuleId}`, "seconds");
  }

  return result;
}
