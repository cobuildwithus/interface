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

export function getClient(chainId: SupportedChainId): PublicClient {
  if (chainId === base.id) {
    if (!baseClient) baseClient = createClient(base.id);
    return baseClient;
  }
  if (chainId === optimism.id) {
    if (!optimismClient) optimismClient = createClient(optimism.id);
    return optimismClient;
  }
  if (!mainnetClient) mainnetClient = createClient(mainnet.id);
  return mainnetClient;
}
