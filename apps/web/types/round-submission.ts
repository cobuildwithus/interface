import type { CastEvalScore } from "@/types/farcaster";
import type { JsonRecord } from "@/lib/shared/json";

export type RoundSubmissionSource = "farcaster" | "x";

export type RoundSubmissionAiOutput = {
  id: string;
  model: string;
  output: JsonRecord;
  createdAt: string;
};

export type RoundSubmission = {
  source: RoundSubmissionSource;
  /** Provider-native post ID (Farcaster: 0x… hash; X: numeric post id). */
  postId: string;
  /**
   * Canonical identifier used for intents/rewards.
   * (Farcaster: normalized cast hash; X: post id).
   */
  entityId: string;

  url: string | null;
  createdAt: string | null;

  aiTitle: string | null;
  aiCategory: string | null;

  authorHandle: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;

  rawText: string | null;
  displayText: string | null;
  mediaUrls?: string[];

  /** Pre-normalized for UI. */
  handle: string;
  /** Pre-normalized for UI. */
  displayName: string;
  /** Pre-normalized for UI. */
  avatarUrl: string | null;
  /**
   * Pre-normalized for UI list rows (IdeaRow).
   * Prefers `aiTitle`, then falls back to `displayText`/`rawText`, and finally "Untitled".
   */
  summaryText: string;

  /**
   * Wallet that should receive boosts for this submission.
   * Stored on the submission row so boosts can work cross-platform.
   */
  beneficiaryAddress: `0x${string}` | null;

  /** Eval score from duel rankings (if available). */
  evalScore: CastEvalScore | null;

  /** Latest AI output for this submission (if available). */
  aiOutput?: RoundSubmissionAiOutput | null;
};
