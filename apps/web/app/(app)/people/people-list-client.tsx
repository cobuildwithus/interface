"use client";

import { useCallback } from "react";
import { Currency } from "@/components/ui/currency";
import { toFiniteNumber } from "@/lib/shared/numbers";
import { JB_TOKEN_DECIMALS } from "@/lib/domains/token/onchain/revnet";
import type { ParticipantSort } from "@/lib/domains/token/juicebox/participants";
import { loadMoreParticipants } from "./actions";
import { PersonCard } from "./person-card";
import { LoadMoreButton } from "./load-more-button";
import { usePaginatedList } from "./use-paginated-list";
import type { ParticipantWithProfile } from "./types";

function toTokenAmount(
  raw: string | number | bigint | null | undefined,
  decimals: number
): number | null {
  const baseUnits = toFiniteNumber(raw);
  if (baseUnits === null) return null;
  const tokens = baseUnits / Math.pow(10, decimals);
  return Number.isFinite(tokens) ? tokens : null;
}

type Props = {
  initialItems: ParticipantWithProfile[];
  initialHasMore: boolean;
  tokenSymbol: string | null;
  sort: ParticipantSort;
};

export function PeopleListClient({ initialItems, initialHasMore, tokenSymbol, sort }: Props) {
  const loadMore = useCallback((offset: number) => loadMoreParticipants(offset, sort), [sort]);

  const { items, hasMore, isPending, handleLoadMore } = usePaginatedList({
    initialItems,
    initialHasMore,
    loadMore,
  });

  const symbol = tokenSymbol?.replace(/^\$/, "") ?? "";

  return (
    <>
      {items.map((p) => (
        <PersonCard
          key={p.address}
          address={p.address}
          profile={p.profile}
          subtitle={
            <>
              <Currency value={toTokenAmount(p.balance, JB_TOKEN_DECIMALS) ?? 0} kind="token" />
              {symbol && ` ${symbol}`}
            </>
          }
        />
      ))}
      {hasMore && (
        <div className="col-span-full">
          <LoadMoreButton onClick={handleLoadMore} isPending={isPending} />
        </div>
      )}
    </>
  );
}
