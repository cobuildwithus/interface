import { unstable_cache } from "next/cache";
import { getRevnetPaymentContext } from "@cobuild/wire";
import { zeroAddress } from "viem";
import { base } from "viem/chains";
import { getClient } from "./clients";
import { COBUILD_PROJECT_ID } from "./revnet";

export interface RevnetData {
  weight: string;
  reservedPercent: number;
  isPaused: boolean;
  terminalAddress: `0x${string}`;
  supportsEthPayments: boolean;
}

async function fetchRevnetData(projectId: bigint): Promise<RevnetData> {
  const client = getClient(base.id);
  const context = await getRevnetPaymentContext(client, { projectId });

  return {
    weight: context.ruleset.ruleset.weight.toString(),
    reservedPercent: context.ruleset.metadata.reservedPercent,
    isPaused: context.ruleset.metadata.pausePay,
    terminalAddress: context.terminalAddress ?? zeroAddress,
    supportsEthPayments: context.supportsPayments,
  };
}

/** Server-side cached fetch of COBUILD revnet data (revalidates every 5 minutes) */
const getRevnetDataCached = unstable_cache(
  async (projectId: string) => fetchRevnetData(BigInt(projectId)),
  ["cobuild-revnet-data"],
  {
    revalidate: 300,
  }
);

export function getRevnetData(projectId: bigint = COBUILD_PROJECT_ID) {
  return getRevnetDataCached(projectId.toString());
}
