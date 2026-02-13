import Link from "next/link";
import {
  getCobuildDiscussionCastsPage,
  DISCUSSION_PAGE_SIZE,
} from "@/lib/integrations/farcaster/casts";
import type {
  DiscussionSort,
  DiscussionSortDirection,
} from "@/lib/integrations/farcaster/casts/types";
import { getUser } from "@/lib/domains/auth/session";
import { getReadStatusMap } from "@/lib/domains/social/cast-read/kv";
import { Button } from "@/components/ui/button";
import { DiscussionListClient } from "./discussion-list-client";

type DiscussionListProps = {
  page: number;
  sort: DiscussionSort;
  sortDirection: DiscussionSortDirection;
  embedUrl?: string | null;
  createPostHref?: string;
};

export async function DiscussionList({
  page,
  sort,
  sortDirection,
  embedUrl,
  createPostHref,
}: DiscussionListProps) {
  const postHref = createPostHref ?? "/create-post";
  const pageSize = DISCUSSION_PAGE_SIZE;
  const fetchPage = (pageNumber: number) =>
    getCobuildDiscussionCastsPage(
      pageSize,
      (pageNumber - 1) * pageSize,
      sort,
      sortDirection,
      embedUrl
    );
  let pageData = await fetchPage(page);

  const totalPages = pageData.totalPages;
  const resolvedPage = totalPages > 0 ? Math.min(page, totalPages) : 1;

  if (resolvedPage !== page) {
    pageData = await fetchPage(resolvedPage);
  }

  if (pageData.items.length === 0) {
    return (
      <div className="border-border bg-card rounded-2xl border p-6 text-center">
        <p className="text-muted-foreground text-sm">
          No discussions yet. Be the first to start one.
        </p>
        <Button asChild size="sm" className="mt-4">
          <Link href={postHref}>Start a discussion</Link>
        </Button>
      </div>
    );
  }

  const userAddress = await getUser();
  if (!userAddress) {
    return (
      <DiscussionListClient
        items={pageData.items}
        page={resolvedPage}
        totalPages={pageData.totalPages}
        sort={sort}
        sortDirection={sortDirection}
        createPostHref={postHref}
      />
    );
  }

  const readStatusMap = await getReadStatusMap(
    userAddress,
    pageData.items.map((item) => item.hash)
  );

  const itemsWithReadStatus = pageData.items.map((item) => ({
    ...item,
    isRead: Boolean(readStatusMap[item.hash]),
  }));

  return (
    <DiscussionListClient
      items={itemsWithReadStatus}
      page={resolvedPage}
      totalPages={pageData.totalPages}
      sort={sort}
      sortDirection={sortDirection}
      createPostHref={postHref}
    />
  );
}
