import "server-only";

import { erc20Abi } from "viem";
import { base } from "viem/chains";
import { contracts } from "@/lib/domains/token/onchain/addresses";
import { getClient } from "@/lib/domains/token/onchain/clients";
import { formatUsdc } from "@/lib/domains/token/usdc";

type UsdcBalanceResult = {
  balance: string | null;
  balanceUsd: string | null;
};

const emptyBalance = (): UsdcBalanceResult => ({ balance: null, balanceUsd: null });

export async function getUsdcBalance(address?: `0x${string}` | null): Promise<UsdcBalanceResult> {
  if (!address) return emptyBalance();

  try {
    const client = getClient(base.id);
    const balance = (await client.readContract({
      address: contracts.USDCBase,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    const balanceUsd = formatUsdc(balance);

    return { balance: balance.toString(), balanceUsd };
  } catch {
    return emptyBalance();
  }
}
