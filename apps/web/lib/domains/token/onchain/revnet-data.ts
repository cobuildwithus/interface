import { unstable_cache } from "next/cache";
import { zeroAddress } from "viem";
import { base } from "viem/chains";
import { getClient } from "./clients";
import { jbControllerAbi, jbDirectoryAbi, jbMultiTerminalAbi } from "./abis";
import { jbContracts, COBUILD_PROJECT_ID, COBUILD_SWAP_PROJECT_ID, NATIVE_TOKEN } from "./revnet";

export interface RevnetData {
  weight: string;
  reservedPercent: number;
  isPaused: boolean;
  terminalAddress: `0x${string}`;
  supportsEthPayments: boolean;
}

async function fetchRevnetData(projectId: bigint): Promise<RevnetData> {
  const client = getClient(base.id);

  const [rulesetResult, primaryTerminal, terminals] = await Promise.all([
    client.readContract({
      address: jbContracts.controller,
      abi: jbControllerAbi,
      functionName: "currentRulesetOf",
      args: [projectId],
    }),
    client.readContract({
      address: jbContracts.directory,
      abi: jbDirectoryAbi,
      functionName: "primaryTerminalOf",
      args: [projectId, NATIVE_TOKEN],
    }),
    client.readContract({
      address: jbContracts.directory,
      abi: jbDirectoryAbi,
      functionName: "terminalsOf",
      args: [projectId],
    }),
  ]);

  const [ruleset, metadata] = rulesetResult;
  const normalizedTerminals = terminals ?? [];
  const multiTerminal = normalizedTerminals.find(
    (terminal) => terminal.toLowerCase() === jbContracts.multiTerminal.toLowerCase()
  );
  const fallbackTerminal = multiTerminal ?? normalizedTerminals[0] ?? zeroAddress;
  const terminalAddress =
    primaryTerminal && primaryTerminal !== zeroAddress ? primaryTerminal : fallbackTerminal;
  let supportsEthPayments = terminalAddress !== zeroAddress;

  if (
    supportsEthPayments &&
    terminalAddress.toLowerCase() === jbContracts.multiTerminal.toLowerCase()
  ) {
    try {
      const contexts = await client.readContract({
        address: jbContracts.multiTerminal,
        abi: jbMultiTerminalAbi,
        functionName: "accountingContextsOf",
        args: [projectId],
      });
      supportsEthPayments = contexts.some(
        (context) => context.token.toLowerCase() === NATIVE_TOKEN.toLowerCase()
      );
    } catch {
      supportsEthPayments = false;
    }
  }

  return {
    weight: ruleset.weight.toString(),
    reservedPercent: metadata.reservedPercent,
    isPaused: metadata.pausePay,
    terminalAddress,
    supportsEthPayments,
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

export function getSwapRevnetData() {
  return getRevnetData(COBUILD_SWAP_PROJECT_ID);
}
