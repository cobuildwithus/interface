import { createPublicClient, http, type PublicClient } from "viem";
import { base, mainnet, optimism } from "viem/chains";
import { getAlchemyKey, getRpcUrl } from "./chains";

type SupportedChainId = typeof base.id | typeof mainnet.id | typeof optimism.id;

function createClient(chainId: SupportedChainId): PublicClient {
  const chain = chainId === base.id ? base : chainId === optimism.id ? optimism : mainnet;
  const key = getAlchemyKey();
  const transport = key ? http(getRpcUrl(chain, "http")) : http();

  return createPublicClient({
    chain,
    transport,
    batch: { multicall: true },
  }) as PublicClient;
}

let baseClient: PublicClient | null = null;
let mainnetClient: PublicClient | null = null;
let optimismClient: PublicClient | null = null;

export function getClient(chainId: number): PublicClient {
  switch (chainId) {
    case base.id:
      if (!baseClient) baseClient = createClient(base.id);
      return baseClient;
    case optimism.id:
      if (!optimismClient) optimismClient = createClient(optimism.id);
      return optimismClient;
    case mainnet.id:
      if (!mainnetClient) mainnetClient = createClient(mainnet.id);
      return mainnetClient;
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
}
