import { Currency } from "@/components/ui/currency";
import { RevnetActionButtons } from "./revnet-actions-client";
import { RevnetBalanceRow } from "./revnet-balance-row";

type RevnetBalanceCardProps = {
  isConnected: boolean;
  tokenSymbol: string;
  baseTokenSymbol: string;
  tokenLogoUrl: string | null;
  balanceAmount: number | null;
  cashOutAmount: number | null;
};

export function RevnetBalanceCard({
  isConnected,
  tokenSymbol,
  baseTokenSymbol,
  tokenLogoUrl,
  balanceAmount,
  cashOutAmount,
}: RevnetBalanceCardProps) {
  const balanceValue = isConnected ? (
    <>
      <Currency value={balanceAmount ?? Number.NaN} kind="token" /> {tokenSymbol}
    </>
  ) : (
    "Connect wallet"
  );

  const cashOutValue = isConnected ? (
    <>
      <Currency value={cashOutAmount ?? Number.NaN} kind="token" /> {baseTokenSymbol}
    </>
  ) : (
    "--"
  );

  return (
    <div className="bg-background/80 border-border rounded-xl border p-5 backdrop-blur-md">
      <div className="space-y-2 text-sm">
        <RevnetBalanceRow label="Balance" value={balanceValue} />
        <RevnetBalanceRow label="Floor value" value={cashOutValue} />
      </div>

      <RevnetActionButtons tokenLogoUrl={tokenLogoUrl} />
    </div>
  );
}
