// Import + re-export clause types from the shared rules core.
// Note: `export type { ... }` does not put those types in local scope, so we
// also `import type` to use them in this module's own types.
import type {
  RuleClausesDraft,
  ClauseDraft,
  FarcasterClauseDraftType,
  XClauseDraftType,
} from "@/lib/domains/rules/rules/core/drafts";
import type { RoundVariant } from "@/lib/domains/rounds/config";

export type { ClauseDraft, FarcasterClauseDraftType, XClauseDraftType };

export type CreateRoundFormData = {
  title: string;
  prompt: string;
  description: string;
  castTemplate: string;
  clausesDraft: RuleClausesDraft;
  requirementsText: string;
  perUserLimit: number;
  status: "open" | "draft";
  variant: RoundVariant;
  startAt: Date | undefined;
  endAt: Date | undefined;
};

export type StepProps = {
  formData: CreateRoundFormData;
  updateFormData: <K extends keyof CreateRoundFormData>(
    key: K,
    value: CreateRoundFormData[K]
  ) => void;
};
