import "server-only";
import { getBaseExplorerTxUrl } from "@cobuild/wire";

export function getCliExplorerTxUrl(
  network: string,
  transactionHash: string | null | undefined
): string | null {
  return getBaseExplorerTxUrl(network, transactionHash);
}
