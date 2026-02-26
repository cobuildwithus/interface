import { toFiniteNumber } from "@/lib/shared/numbers";
import { JB_TOKEN_DECIMALS } from "@/lib/domains/token/onchain/revnet";
import { getRevnetSummary } from "@/lib/domains/token/juicebox/revnet-summary";
import { RevnetBalanceCard } from "./revnet-balance-card";

function toTokenAmount(
  raw: string | number | bigint | null | undefined,
  decimals: number
): number | null {
  const baseUnits = toFiniteNumber(raw);
  if (baseUnits === null) return null;
  const tokens = baseUnits / Math.pow(10, decimals);
  return Number.isFinite(tokens) ? tokens : null;
}

function normalizeSymbol(symbol?: string | null) {
  if (!symbol) return "";
  return symbol.replace(/^\$/, "");
}

export async function RevnetActions() {
  const summary = await getRevnetSummary();
  const isConnected = !!summary.address;
  const tokenSymbol = normalizeSymbol(summary.tokenSymbol) || "Token";
  const baseTokenSymbol = normalizeSymbol(summary.baseTokenSymbol) || "Token";
  const tokenLogoUrl = summary.tokenLogoUrl ?? null;

  const balanceAmount = toTokenAmount(summary.balance, JB_TOKEN_DECIMALS);
  const cashOutAmount = toTokenAmount(summary.cashOutValue, summary.accountingDecimals);

  return (
    <RevnetBalanceCard
      isConnected={isConnected}
      tokenSymbol={tokenSymbol}
      baseTokenSymbol={baseTokenSymbol}
      tokenLogoUrl={tokenLogoUrl}
      balanceAmount={balanceAmount}
      cashOutAmount={cashOutAmount}
    />
  );
}
