import "server-only";

import prisma from "@/lib/server/db/cobuild-db-client";
import type { RoundModel, PostFilterRuleModel } from "@/generated/prisma/models";
import type { PostEvalRoundStatus } from "@/generated/prisma/enums";

type PostFilterRule = Pick<
  PostFilterRuleModel,
  | "id"
  | "title"
  | "outputTag"
  | "requirementsText"
  | "ctaText"
  | "castTemplate"
  | "perUserLimit"
  | "admins"
>;

import { normalizeRoundVariant, type RoundVariant } from "./config";

type PostEvalRound = Omit<
  RoundModel,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "createdByAddress"
  | "primaryRuleId"
  | "parentRoundId"
  | "startAt"
  | "endAt"
  | "variant"
> & {
  id: string;
  createdAt: string;
  description: string | null;
  // Timing + rewards are currently not stored in the capital_allocation rounds table.
  // Keep rewardAmount for UI compatibility.
  startAt: string | null;
  endAt: string | null;
  rewardAmount: number | null;
  variant: RoundVariant;
  primaryRule: PostFilterRule;
};

type RoundWithPrimaryRule = RoundModel & { primaryRule: PostFilterRuleModel };

const toPrimaryRule = (rule: PostFilterRuleModel): PostFilterRule => ({
  id: rule.id,
  title: rule.title,
  outputTag: rule.outputTag,
  requirementsText: rule.requirementsText,
  ctaText: rule.ctaText,
  castTemplate: rule.castTemplate,
  perUserLimit: rule.perUserLimit,
  admins: rule.admins,
});

const toPostEvalRound = (round: RoundWithPrimaryRule): PostEvalRound => ({
  id: round.id.toString(),
  title: round.title,
  description: round.description,
  prompt: round.prompt,
  status: round.status,
  variant: normalizeRoundVariant(round.variant),
  startAt: round.startAt ? round.startAt.toISOString() : null,
  endAt: round.endAt ? round.endAt.toISOString() : null,
  rewardAmount: null,
  primaryRule: toPrimaryRule(round.primaryRule),
  createdAt: round.createdAt.toISOString(),
});

export async function getRoundById(id: string): Promise<PostEvalRound | null> {
  const roundIdStr = `${id ?? ""}`.trim();
  if (!/^\d+$/.test(roundIdStr)) return null;

  const roundId = BigInt(roundIdStr);

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { primaryRule: true },
  });

  if (!round) return null;

  return toPostEvalRound(round);
}

export async function getAllRounds(): Promise<PostEvalRound[]> {
  const rounds = await prisma.round.findMany({
    where: {
      status: { not: "draft" },
    },
    include: { primaryRule: true },
    orderBy: { createdAt: "desc" },
  });

  return rounds.map(toPostEvalRound);
}

type RoundListItem = {
  id: string;
  title: string | null;
  description: string | null;
  status: PostEvalRoundStatus;
};

export async function getRoundsList(): Promise<RoundListItem[]> {
  const rounds = await prisma.round.findMany({
    where: {
      status: { not: "draft" },
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return rounds.map((round) => ({
    id: round.id.toString(),
    title: round.title,
    description: round.description,
    status: round.status,
  }));
}
