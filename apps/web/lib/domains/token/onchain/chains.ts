import { base, baseSepolia, mainnet, optimism, sepolia, type Chain } from "viem/chains";

/** Returns the proper Alchemy key for the current runtime. */
export function getAlchemyKey(): string | null {
  const serverKey = (typeof window === "undefined" && process.env.ALCHEMY_ID_SERVERSIDE) || null;
  const publicKey = process.env.NEXT_PUBLIC_ALCHEMY_ID ?? null;
  return serverKey ?? publicKey ?? null;
}

/** Map numeric chainId to viem Chain object. */
export function getChain(chainId: number): Chain {
  switch (chainId) {
    case base.id:
      return base;
    case baseSepolia.id:
      return baseSepolia;
    case mainnet.id:
      return mainnet;
    case optimism.id:
      return optimism;
    case sepolia.id:
      return sepolia;
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
}

/** Build an Alchemy RPC URL for a given chain & transport type. */
export function getRpcUrl(chain: Chain, type: "http" | "ws"): string {
  const key = getAlchemyKey();
  if (!key)
    throw new Error("Missing Alchemy env var (ALCHEMY_ID_SERVERSIDE or NEXT_PUBLIC_ALCHEMY_ID)");

  const protocol = type === "http" ? "https" : "wss";

  switch (chain.id) {
    case base.id:
      return `${protocol}://base-mainnet.g.alchemy.com/v2/${key}`;
    case baseSepolia.id:
      return `${protocol}://base-sepolia.g.alchemy.com/v2/${key}`;
    case mainnet.id:
      return `${protocol}://eth-mainnet.g.alchemy.com/v2/${key}`;
    case optimism.id:
      return `${protocol}://opt-mainnet.g.alchemy.com/v2/${key}`;
    case sepolia.id:
      return `${protocol}://eth-sepolia.g.alchemy.com/v2/${key}`;
    default:
      throw new Error(`Unsupported chain: ${chain.id}`);
  }
}

/** Get block explorer URL for an address/tx on a chain. */
export function explorerUrl(chainId: number, value: string, type: "address" | "tx"): string {
  switch (chainId) {
    case mainnet.id:
      return `https://etherscan.io/${type}/${value}`;
    case base.id:
      return `https://basescan.org/${type}/${value}`;
    case sepolia.id:
      return `https://sepolia.etherscan.io/${type}/${value}`;
    case baseSepolia.id:
      return `https://sepolia.basescan.org/${type}/${value}`;
    default:
      return "";
  }
}
