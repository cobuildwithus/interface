"use server";

import { revalidateTag } from "next/cache";
import { getUser } from "@/lib/domains/auth/session";
import { isGlobalAdmin } from "@/lib/config/admins";
import {
  type FarcasterClauseInput,
  type PlatformScopedRuleClauses,
} from "@/lib/domains/rules/rules/clauses";
import prisma from "@/lib/server/db/cobuild-db-client";
import { getFidsByUsernames } from "@/lib/integrations/farcaster/profile";
import {
  parseCreateRoundPayload,
  type CreateRoundPayload,
} from "@/lib/domains/rounds/create-round";

type CreateRoundResult = { ok: true; roundId: string } | { ok: false; error: string };

type ResolvedClauses = {
  farcaster: Array<
    | { type: "mentionsAll"; fids: number[] }
    | { type: "embedUrlPattern"; patterns: string[] }
    | { type: "rootParentUrl"; urls: string[] }
  >;
  x: Array<
    { type: "mentionsAll"; usernames: string[] } | { type: "embedUrlPattern"; patterns: string[] }
  >;
};

async function resolveFarcasterUsernamesToFids(clauses: {
  farcaster: FarcasterClauseInput[];
  x: PlatformScopedRuleClauses["x"];
}): Promise<{ ok: true; value: ResolvedClauses } | { ok: false; error: string }> {
  const resolvedFarcaster: ResolvedClauses["farcaster"] = [];

  for (const clause of clauses.farcaster) {
    if (clause.type === "mentionsAll") {
      const { fids, notFound } = await getFidsByUsernames(clause.usernames);
      if (notFound.length > 0) {
        return {
          ok: false,
          error: `Farcaster username${notFound.length > 1 ? "s" : ""} not found: ${notFound.join(", ")}`,
        };
      }
      resolvedFarcaster.push({ type: "mentionsAll", fids });
    } else if (clause.type === "embedUrlPattern") {
      resolvedFarcaster.push({ type: "embedUrlPattern", patterns: clause.patterns });
    } else {
      resolvedFarcaster.push({ type: "rootParentUrl", urls: clause.urls });
    }
  }

  return { ok: true, value: { farcaster: resolvedFarcaster, x: clauses.x } };
}

export async function createRound(payload: CreateRoundPayload): Promise<CreateRoundResult> {
  const userAddress = await getUser();
  if (!userAddress) {
    return { ok: false, error: "Sign in to create rounds." };
  }

  if (!isGlobalAdmin(userAddress)) {
    return { ok: false, error: "You don't have permission to create rounds." };
  }

  const parsed = parseCreateRoundPayload(payload);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  // Convert Farcaster usernames to FIDs
  const resolvedClauses = await resolveFarcasterUsernamesToFids(parsed.data.clauses);
  if (!resolvedClauses.ok) {
    return { ok: false, error: resolvedClauses.error };
  }

  const round = await prisma.$transaction(async (tx) => {
    const rule = await tx.postFilterRule.create({
      data: {
        // Keep these titles identical for UI clarity (rule is round-scoped today).
        title: parsed.data.title,
        // output_tag is required but we want it to be derived from the id.
        outputTag: `pending-rule-${Date.now()}`,
        requirementsText: parsed.data.requirementsText,
        castTemplate: parsed.data.castTemplate || null,
        perUserLimit: parsed.data.perUserLimit,
        platforms: ["farcaster", "x"],
        clauses: resolvedClauses.value,
      },
      select: { id: true },
    });

    await tx.postFilterRule.update({
      where: { id: rule.id },
      data: { outputTag: `rule-${rule.id}` },
    });

    return await tx.round.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        prompt: parsed.data.prompt,
        startAt: parsed.startAt,
        endAt: parsed.endAt,
        createdByAddress: userAddress,
        status: parsed.data.status,
        variant: parsed.data.variant,
        primaryRuleId: rule.id,
        parentRoundId: null,
      },
      select: { id: true },
    });
  });

  revalidateTag("rounds:list", "seconds");

  return { ok: true, roundId: round.id.toString() };
}
