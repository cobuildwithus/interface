import "server-only";

import { getTreasuryHistory } from "@/lib/domains/token/juicebox/treasury-history";

export type FundingData = {
  treasury: number | null;
};

export async function getFundingData(): Promise<FundingData> {
  const treasuryHistory = await getTreasuryHistory();
  return {
    treasury: treasuryHistory.data.at(-1)?.balance ?? null,
  };
}
