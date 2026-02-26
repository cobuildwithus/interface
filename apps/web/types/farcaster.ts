type FarcasterUser = {
  fid: number;
  username?: string | null;
  display_name?: string | null;
  pfp_url?: string | null;
  power_badge?: boolean | null;
  neynar_score?: number | null;
  activity?: number | null;
  activity_posts?: number | null;
};

type FarcasterReactions = {
  likes_count?: number | null;
  recasts_count?: number | null;
};

type FarcasterEmbedMetadata = {
  content_type?: string | null;
  html?: { ogImage?: { url?: string | null }[] | null } | null;
};

type FarcasterEmbed = {
  url?: string | null;
  metadata?: FarcasterEmbedMetadata | null;
};

import type { JsonRecord } from "@/lib/shared/json";

type AiOutput = {
  id: string;
  model: string;
  output: JsonRecord;
  createdAt: string;
};

export type CastEvalScore = {
  share: number;
  rank: number | null;
  winRate: number | null;
};

export type FarcasterCast = {
  hash: string;
  author: FarcasterUser;
  text: string;
  timestamp: string;
  embeds?: FarcasterEmbed[];
  reactions?: FarcasterReactions | null;
  replies?: { count?: number | null } | null;
  mentioned_profiles?: FarcasterUser[] | null;
  mentions_positions?: number[];
  aiOutput?: AiOutput | null;
  evalScore?: CastEvalScore | null;
};
