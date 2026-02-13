const VERDICT_KEYS = ["valid", "isValid", "is_valid", "pass", "approved", "matches"] as const;

const REASON_KEYS = ["reason", "reasoning", "explanation", "summary", "rationale"] as const;

import type { JsonRecord } from "@/lib/shared/json";

export type AiVerdict = {
  isValid: boolean | null;
  reason: string | null;
};

export function getAiVerdict(output: JsonRecord): AiVerdict {
  let isValid: boolean | null = null;
  let reason: string | null = null;

  for (const key of VERDICT_KEYS) {
    if (key in output && typeof output[key] === "boolean") {
      isValid = output[key] as boolean;
      break;
    }
  }

  for (const key of REASON_KEYS) {
    if (key in output && typeof output[key] === "string") {
      reason = output[key] as string;
      break;
    }
  }

  return { isValid, reason };
}
