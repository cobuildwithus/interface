"use client";

import { base } from "viem/chains";
import { erc20Abi } from "viem";
import { contracts } from "@/lib/domains/token/onchain/addresses";
import { useContractTransaction } from "@/lib/domains/token/onchain/use-contract-transaction";
import { usdc } from "@/lib/domains/token/usdc";

export function RevokeAllowanceCard({
  allowance,
  loading,
  onRevoked,
}: {
  allowance: bigint | null;
  loading: boolean;
  onRevoked: () => void;
}) {
  const revokeTx = useContractTransaction({
    chainId: base.id,
    loading: "Revoking allowance…",
    success: "Allowance revoked",
    onSuccess: onRevoked,
  });

  const isDisabled = loading || revokeTx.isLoading || !allowance || allowance === 0n;

  const handleRevoke = async () => {
    const toastId = await revokeTx.prepareWallet();
    if (!toastId) return;
    try {
      await revokeTx.writeContractAsync({
        address: contracts.USDCBase,
        abi: erc20Abi,
        functionName: "approve",
        args: [contracts.CobuildSwap, 0n],
        chainId: base.id,
      });
    } catch {}
  };

  return (
    <div className="border-border/50 bg-muted/20 flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">
        {loading ? "Loading…" : `${usdc.format(allowance!)} USDC approved`}
      </span>
      <button
        onClick={handleRevoke}
        disabled={isDisabled}
        className="text-muted-foreground text-xs font-medium transition-colors hover:text-red-500 disabled:opacity-50"
      >
        {revokeTx.isLoading ? "Revoking…" : "Revoke"}
      </button>
    </div>
  );
}
