// Import + re-export clause types from the shared rules core.
// Note: `export type { ... }` does not put those types in local scope, so we
// also `import type` to use them in this module's own types.
import type {
  ClauseDraft,
  FarcasterClauseDraftType,
  XClauseDraftType,
} from "@/lib/domains/rules/rules/core/drafts";
import type { CreateRoundFormData } from "@/lib/domains/rounds/create-round";

export type { ClauseDraft, FarcasterClauseDraftType, XClauseDraftType };

export type StepProps = {
  formData: CreateRoundFormData;
  updateFormData: <K extends keyof CreateRoundFormData>(
    key: K,
    value: CreateRoundFormData[K]
  ) => void;
};
