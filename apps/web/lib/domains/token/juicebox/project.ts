import "server-only";

import { unstable_cache } from "next/cache";
import { base } from "viem/chains";
import juiceboxDb from "@/lib/server/db/cobuild-db-client";
import { COBUILD_JUICEBOX_PROJECT_ID } from "@/lib/domains/token/juicebox/constants";

const PROJECT_ID = COBUILD_JUICEBOX_PROJECT_ID;

export type ProjectInfo = {
  suckerGroupId: string | null;
  accountingToken: string;
  accountingTokenSymbol: string;
  accountingDecimals: number;
  erc20Symbol: string | null;
  erc20: `0x${string}` | null;
};

async function fetchProject(): Promise<ProjectInfo> {
  const project = await juiceboxDb.juiceboxProject.findUniqueOrThrow({
    where: { chainId_projectId: { chainId: base.id, projectId: PROJECT_ID } },
    select: {
      suckerGroupId: true,
      accountingToken: true,
      accountingTokenSymbol: true,
      accountingDecimals: true,
      erc20Symbol: true,
      erc20: true,
    },
  });

  return {
    suckerGroupId: project.suckerGroupId,
    accountingToken: project.accountingToken,
    accountingTokenSymbol: project.accountingTokenSymbol,
    accountingDecimals: project.accountingDecimals ?? 18,
    erc20Symbol: project.erc20Symbol,
    erc20: project.erc20 as `0x${string}` | null,
  };
}

export const getProject = unstable_cache(
  fetchProject,
  ["project-v2", String(PROJECT_ID)],
  { revalidate: 3600 } // Cache for 1 hour
);

export async function getSuckerGroupId(): Promise<string | null> {
  const project = await getProject();
  return project.suckerGroupId;
}
