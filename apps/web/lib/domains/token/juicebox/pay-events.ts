import "server-only";

import { unstable_cache } from "next/cache";
import juiceboxDb from "@/lib/server/db/cobuild-db-client";
import { COBUILD_JUICEBOX_PROJECT_ID } from "@/lib/domains/token/juicebox/constants";
import { getSuckerGroupId } from "@/lib/domains/token/juicebox/project";
import { toDecimalString, type Numberish } from "@/lib/shared/numbers";

const PROJECT_ID = COBUILD_JUICEBOX_PROJECT_ID;

export const PAY_EVENTS_PAGE_SIZE = 10;

type RawDbPayment = {
  txHash: string;
  timestamp: number;
  payer: string;
  amount: Numberish;
  effectiveTokenCount: Numberish;
  buybackTokenCount: Numberish;
  beneficiary: string;
  chainId: number;
  memo: string;
  txnValue: string;
  project: {
    erc20Symbol: string | null;
    accountingTokenSymbol: string;
    accountingDecimals: number;
  };
};

export type RawTokenPayment = Omit<
  RawDbPayment,
  "amount" | "effectiveTokenCount" | "buybackTokenCount"
> & {
  amount: string;
  effectiveTokenCount: string;
  buybackTokenCount: string;
};

export type PayEventsPage = {
  items: RawTokenPayment[];
  hasMore: boolean;
};

async function fetchPayEvents(
  limit: number = PAY_EVENTS_PAGE_SIZE,
  offset: number = 0
): Promise<PayEventsPage> {
  const suckerGroupId = await getSuckerGroupId();

  if (!suckerGroupId) {
    return { items: [], hasMore: false };
  }

  const payments = (await juiceboxDb.juiceboxPayEvent.findMany({
    select: {
      txHash: true,
      timestamp: true,
      payer: true,
      amount: true,
      effectiveTokenCount: true,
      buybackTokenCount: true,
      beneficiary: true,
      chainId: true,
      memo: true,
      txnValue: true,
      project: {
        select: { erc20Symbol: true, accountingTokenSymbol: true, accountingDecimals: true },
      },
    },
    where: { suckerGroupId, effectiveTokenCount: { gt: 0 } },
    orderBy: { timestamp: "desc" },
    take: limit + 1,
    skip: offset,
  })) as RawDbPayment[];

  const hasMore = payments.length > limit;
  const items = hasMore ? payments.slice(0, limit) : payments;

  return {
    items: items.map((payment) => ({
      ...payment,
      amount: toDecimalString(payment.amount),
      effectiveTokenCount: toDecimalString(payment.effectiveTokenCount),
      buybackTokenCount: toDecimalString(payment.buybackTokenCount),
    })),
    hasMore,
  };
}

export const getPayEvents = unstable_cache(
  (limit?: number, offset?: number) => fetchPayEvents(limit, offset),
  ["pay-events-v3", String(PROJECT_ID)],
  { revalidate: 60 }
);
