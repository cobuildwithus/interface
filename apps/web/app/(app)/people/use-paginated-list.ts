"use client";

import { useState, useTransition, useCallback } from "react";
import type { PageResult } from "./types";

type UsePaginatedListOptions<T> = {
  initialItems: T[];
  initialHasMore: boolean;
  loadMore: (offset: number) => Promise<PageResult<T>>;
};

export function usePaginatedList<T>({
  initialItems,
  initialHasMore,
  loadMore,
}: UsePaginatedListOptions<T>) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = useCallback(() => {
    startTransition(async () => {
      const page = await loadMore(items.length);
      setItems((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
    });
  }, [items.length, loadMore]);

  return { items, hasMore, isPending, handleLoadMore };
}
