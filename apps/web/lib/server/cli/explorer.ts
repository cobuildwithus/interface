import "server-only";

const EXPLORER_BY_NETWORK: Record<string, string> = {
  base: "https://basescan.org",
  "base-mainnet": "https://basescan.org",
  "base-sepolia": "https://sepolia.basescan.org",
  ethereum: "https://etherscan.io",
  "ethereum-mainnet": "https://etherscan.io",
  "ethereum-sepolia": "https://sepolia.etherscan.io",
  sepolia: "https://sepolia.etherscan.io",
  optimism: "https://optimistic.etherscan.io",
  "optimism-mainnet": "https://optimistic.etherscan.io",
  "optimism-sepolia": "https://sepolia-optimism.etherscan.io",
};

export function getCliExplorerTxUrl(
  network: string,
  transactionHash: string | null | undefined
): string | null {
  if (!transactionHash) return null;

  const normalized = network.toLowerCase();
  const base = EXPLORER_BY_NETWORK[normalized];
  if (!base) return null;

  return `${base}/tx/${transactionHash}`;
}
