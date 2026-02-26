import type {
  DiscussionSort,
  DiscussionSortDirection,
} from "@/lib/integrations/farcaster/casts/types";

type DiscussionSearchParams = {
  page?: string;
  sort?: string;
  dir?: string;
};

const DEFAULT_DISCUSSION_SORT: DiscussionSort = "last";

export function parseDiscussionSort(value?: string): DiscussionSort {
  if (value === "replies" || value === "views" || value === "last") return value;
  return DEFAULT_DISCUSSION_SORT;
}

export function parseDiscussionSortDirection(value?: string): DiscussionSortDirection {
  return value === "asc" ? "asc" : "desc";
}

export function resolveDiscussionParams(params: DiscussionSearchParams) {
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const sort = parseDiscussionSort(params.sort);
  const sortDirection = parseDiscussionSortDirection(params.dir);

  return { page, sort, sortDirection };
}
