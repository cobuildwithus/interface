import type { FarcasterCast } from "@/types/farcaster";

export type CastAttachment = {
  kind: "image" | "link";
  url: string;
  label: string | null;
  sourceUrl: string | null;
};

export type DiscussionCastListItem = {
  hash: string;
  title: string;
  excerpt: string;
  text: string;
  author: FarcasterCast["author"];
  createdAt: string;
  replyCount: number;
  viewCount: number;
  attachment: CastAttachment | null;
  lastReply: {
    createdAt: string;
    authorUsername: string;
  } | null;
  isRead?: boolean;
};

export type DiscussionCastsPage = {
  items: DiscussionCastListItem[];
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
};

export type ThreadCast = {
  hash: string;
  parentHash: string | null;
  text: string;
  author: FarcasterCast["author"];
  createdAt: string;
  attachment: CastAttachment | null;
  viewCount: number;
  hiddenAt?: string | null;
  hiddenReason?: string | null;
};

export type FlatCastThread = {
  root: ThreadCast;
  replies: ThreadCast[];
  replyCount: number;
  /** Record of hash -> ThreadCast for quick lookups (e.g., for quotes) */
  castMap: Record<string, ThreadCast>;
  /** Pagination info */
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type DiscussionSort = "last" | "replies" | "views";
export type DiscussionSortDirection = "asc" | "desc";
