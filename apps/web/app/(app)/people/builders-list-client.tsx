"use client";

import { loadMoreBuilders } from "./actions";
import { PersonCard } from "./person-card";
import { LoadMoreButton } from "./load-more-button";
import { usePaginatedList } from "./use-paginated-list";
import type { BuilderWithProfile } from "./types";

type Props = {
  initialItems: BuilderWithProfile[];
  initialHasMore: boolean;
};

export function BuildersListClient({ initialItems, initialHasMore }: Props) {
  const { items, hasMore, isPending, handleLoadMore } = usePaginatedList({
    initialItems,
    initialHasMore,
    loadMore: loadMoreBuilders,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((b) => (
          <PersonCard
            key={b.address}
            address={b.address}
            profile={b.profile}
            subtitle={b.isFounder ? "Founder" : "Builder"}
          />
        ))}
      </div>
      {hasMore && <LoadMoreButton onClick={handleLoadMore} isPending={isPending} />}
    </div>
  );
}
