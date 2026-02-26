import "server-only";

import { unstable_cache } from "next/cache";
import juiceboxDb from "@/lib/server/db/cobuild-db-client";
import { COBUILD_JUICEBOX_PROJECT_ID } from "@/lib/domains/token/juicebox/constants";
import { getProject } from "@/lib/domains/token/juicebox/project";
import { toDecimalString } from "@/lib/shared/numbers";

const PROJECT_ID = COBUILD_JUICEBOX_PROJECT_ID;

export const PARTICIPANTS_PAGE_SIZE = 24;

export type ParticipantSort = "top" | "new";

export type RawParticipant = {
  address: string;
  balance: string;
  createdAt: number;
  firstOwned: number | null;
};

export type ParticipantsPage = {
  items: RawParticipant[];
  hasMore: boolean;
  tokenSymbol: string | null;
};

async function fetchParticipants(
  limit: number = PARTICIPANTS_PAGE_SIZE,
  offset: number = 0,
  sort: ParticipantSort = "new"
): Promise<ParticipantsPage> {
  const project = await getProject();

  if (!project.suckerGroupId) {
    return { items: [], hasMore: false, tokenSymbol: project.erc20Symbol };
  }

  const orderBy = sort === "top" ? { balance: "desc" as const } : { firstOwned: "desc" as const };

  const participants = await juiceboxDb.juiceboxParticipant.findMany({
    where: {
      suckerGroupId: project.suckerGroupId,
      balance: { gt: 0 },
    },
    select: {
      address: true,
      balance: true,
      createdAt: true,
      firstOwned: true,
    },
    orderBy,
    take: limit + 1,
    skip: offset,
  });

  const hasMore = participants.length > limit;
  const items = hasMore ? participants.slice(0, limit) : participants;

  return {
    items: items.map((p) => ({
      address: p.address,
      balance: toDecimalString(p.balance),
      createdAt: p.createdAt,
      firstOwned: p.firstOwned,
    })),
    hasMore,
    tokenSymbol: project.erc20Symbol,
  };
}

export const getParticipants = unstable_cache(
  (limit: number = PARTICIPANTS_PAGE_SIZE, offset: number = 0, sort: ParticipantSort = "new") =>
    fetchParticipants(limit, offset, sort),
  ["participants-v3", String(PROJECT_ID)],
  {
    revalidate: 60,
    tags: ["participants"],
  }
);
