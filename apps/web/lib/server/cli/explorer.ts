import "server-only";

const EXPLORER_BY_NETWORK: Record<string, string> = {
  base: "https://basescan.org",
  "base-mainnet": "https://basescan.org",
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
