import type { Prisma } from "@/generated/prisma/client";
import type { MentionProfileInput } from "@/lib/integrations/farcaster/mentions";
import type { RoundSubmissionAiOutput, RoundSubmissionSource } from "@/types/round-submission";

export type CastRow = {
  hash: Buffer;
  text: string | null;
  castTimestamp: Date | null;
  embedsArray: Prisma.JsonValue | null;
  mentionedFids: bigint[];
  mentionsPositions: number[] | null;
  mentionProfiles: Array<MentionProfileInput | null> | null;
  fid: bigint;
  authorFname: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  authorNeynarScore: number | null;
  aiOutputId: bigint | null;
  aiOutputModel: string | null;
  aiOutputOutput: Prisma.JsonValue | null;
  aiOutputCreatedAt: Date | null;
  evalShare: Prisma.Decimal | number | string | bigint | null; // Prisma Decimal
  evalRank: bigint | null;
  evalWinRate: number | null;
};

export type SubmissionRow = {
  source: RoundSubmissionSource;
  postId: string;
  url: string | null;
  createdAt: Date | null;
  insertedAt: Date;
  aiTitle: string | null;
  aiCategory: string | null;
  authorHandle: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  rawText: string | null;
  displayText: string | null;
  metadata: Prisma.JsonValue | null;
  mediaUrls?: string[] | null;
  evalShare?: Prisma.Decimal | number | string | bigint | null; // Prisma Decimal
  evalRank?: bigint | null;
  evalWinRate?: number | null;
  aiOutput?: RoundSubmissionAiOutput | null;
};

export type SubmissionQueryRow = Omit<SubmissionRow, "source"> & { source: string };

export type RoundSubmissionsResult = {
  submissions: import("@/types/round-submission").RoundSubmission[];
  roundEntityIds: string[];
};
