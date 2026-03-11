import "server-only";

import { persistFarcasterWalletLink } from "@/lib/integrations/farcaster/persist-wallet-link";

export async function saveVerifiedAddressForFid(fid: number, rawAddress: `0x${string}`) {
  await persistFarcasterWalletLink(fid, rawAddress);
}
