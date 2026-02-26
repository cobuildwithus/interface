import type { JsonValue } from "@/lib/shared/json";

export type OutcomeCode =
  | "passed"
  | "deterministic_failed"
  | "llm_failed"
  | "llm_pending"
  | "cast_not_found"
  | "error";

type VerificationResult = {
  platform: "farcaster" | "x";
  postId: string;
  ruleId: number;
  rulePassed: boolean;
  outcomeCode: OutcomeCode;
  outcomeReason: string;
  tags: string[];
  metadata?: JsonValue;
  semantic?: JsonValue;
  llm?: {
    gradeEvaluated: boolean;
    pass: boolean | null;
    reason: string | null;
  };
};

export type VerificationStatus = "idle" | "checking" | "success" | "error";

export type VerificationState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "success"; result: VerificationResult }
  | { status: "error"; message: string };

export type RoundHardRequirement = {
  type: "mentionsAll" | "embedUrlPattern" | "channelId" | "text";
  label: string;
  value: string | string[];
};

export type IneligibilityReason = "missing" | "low" | null;

export type PostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundId: string;
  ruleId: number;
  startAt?: string | null;
  endAt?: string | null;
  title?: string;
  description?: string | null;
  castTemplate?: string | null;
  ctaText?: string | null;
  requirements?: RoundHardRequirement[];
  linkedFarcasterUsername?: string;
  linkedTwitterUsername?: string;
  ineligible?: boolean;
  ineligibilityReason?: IneligibilityReason;
  isAtPostLimit?: boolean;
};

/** UI display variant for round pages */
export type { RoundVariant } from "@/lib/domains/rounds/config";
