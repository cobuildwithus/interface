"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Currency } from "@/components/ui/currency";
import { DateTime } from "@/components/ui/date-time";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toFiniteNumber } from "@/lib/shared/numbers";
import { explorerUrl } from "@/lib/domains/token/onchain/chains";
import { JB_TOKEN_DECIMALS } from "@/lib/domains/token/onchain/revnet";
import type { RawTokenPayment } from "@/lib/domains/token/juicebox/pay-events";
import type { Profile } from "@/lib/domains/profile/types";
import { loadMorePayEvents } from "./actions";
import { Landmark, Loader2, Repeat2 } from "lucide-react";

export type PayEventWithProfile = RawTokenPayment & {
  profile: Profile;
};

function toTokenAmount(
  raw: string | number | bigint | null | undefined,
  decimals: number
): number | null {
  const baseUnits = toFiniteNumber(raw);
  if (baseUnits === null) return null;
  const tokens = baseUnits / Math.pow(10, decimals);
  return Number.isFinite(tokens) ? tokens : null;
}

function PayEventDestinationIndicator({ isBuyback }: { isBuyback: boolean }) {
  const label = isBuyback ? "AMM buyback" : "Treasury";
  const Icon = isBuyback ? Repeat2 : Landmark;

  return (
    <Tooltip>
      <TooltipTrigger
        className="text-muted-foreground hover:text-foreground flex items-center"
        aria-label={label}
      >
        <Icon className="size-3" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function PayEventRow({ event }: { event: PayEventWithProfile }) {
  const txUrl = explorerUrl(event.chainId, event.txHash, "tx");
  const accountingDecimals = event.project.accountingDecimals ?? 18;
  const paymentAmount = toTokenAmount(event.amount, accountingDecimals);
  const paymentSymbol = event.project.accountingTokenSymbol;
  const issuedAmount = toTokenAmount(event.effectiveTokenCount, JB_TOKEN_DECIMALS);
  const issuedSymbol = event.project.erc20Symbol;
  const isBuyback = event.buybackTokenCount !== "0";
  const timestamp = new Date(event.timestamp * 1000);
  const memo = event.memo?.trim();
  const { profile } = event;

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <a
          href={profile.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 transition-opacity hover:opacity-80"
        >
          <Avatar size={40} src={profile.avatar} fallback={event.payer} />
        </a>
        <div className="flex min-w-0 flex-col">
          <div className="flex min-w-0 items-baseline gap-2">
            <a
              href={profile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-medium transition-opacity hover:opacity-80"
            >
              {profile.name}
            </a>
            {txUrl ? (
              <a
                href={txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground shrink-0 text-xs tabular-nums transition-colors"
              >
                <DateTime date={timestamp} relative short />
              </a>
            ) : (
              <DateTime
                date={timestamp}
                relative
                short
                className="text-muted-foreground shrink-0 text-xs tabular-nums"
              />
            )}
          </div>
          {memo ? (
            <label className="mt-1 block cursor-pointer">
              <input type="checkbox" className="peer sr-only" />
              <span className="text-muted-foreground line-clamp-1 text-xs break-words peer-checked:line-clamp-none">
                {memo}
              </span>
            </label>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="flex items-center justify-end gap-1 font-medium">
          <PayEventDestinationIndicator isBuyback={isBuyback} />
          <span>
            <Currency value={paymentAmount ?? Number.NaN} kind="token" />
            {paymentSymbol ? ` ${paymentSymbol}` : ""}
          </span>
        </div>
        <div className="text-muted-foreground text-xs">
          <Currency value={issuedAmount ?? Number.NaN} kind="token" />
          {issuedSymbol ? ` ${issuedSymbol}` : ""}
        </div>
      </div>
    </div>
  );
}

type PayEventsListClientProps = {
  initialItems: PayEventWithProfile[];
  initialHasMore: boolean;
};

export function PayEventsListClient({ initialItems, initialHasMore }: PayEventsListClientProps) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    startTransition(async () => {
      const page = await loadMorePayEvents(items.length);
      setItems((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
    });
  }

  return (
    <div>
      <div className="divide-border divide-y">
        {items.map((event, index) => (
          <PayEventRow key={`${event.txHash}-${event.timestamp}-${index}`} event={event} />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
