import { serializeClausesDraft } from "@/lib/domains/rules/rules/core/drafts";
import type { CreateRoundFormData } from "./types";
import { REQUIRED_FIELDS } from "./constants";

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateStep(step: number, data: CreateRoundFormData): ValidationResult {
  if (step === 1) {
    for (const [field, error] of Object.entries(REQUIRED_FIELDS)) {
      if (!data[field as keyof typeof REQUIRED_FIELDS].trim()) {
        return { ok: false, error };
      }
    }
  }
  if (step === 2) {
    const clauses = serializeClausesDraft(data.clausesDraft);
    if (!clauses.ok) {
      return { ok: false, error: clauses.error };
    }
  }
  if (step === 3) {
    if (!data.startAt) {
      return { ok: false, error: "Please select a start date." };
    }
    if (!data.endAt) {
      return { ok: false, error: "Please select an end date." };
    }
    if (data.endAt < data.startAt) {
      return { ok: false, error: "End date must be on or after start date." };
    }
  }
  return { ok: true };
}
