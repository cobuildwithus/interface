import {
  serializeClausesDraft,
  type RuleClausesDraft,
} from "@/lib/domains/rules/rules/core/drafts";
import { platformScopedRuleClausesSchema } from "@/lib/domains/rules/rules/clauses";
import { ROUND_VARIANTS, type RoundVariant } from "./config";
import { z } from "zod";

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

export type CreateRoundValidationResult = { ok: true } | { ok: false; error: string };

export const INITIAL_CREATE_ROUND_FORM_DATA: CreateRoundFormData = {
  title: "",
  prompt: "",
  description: "",
  castTemplate: "",
  clausesDraft: { farcaster: [], x: [] },
  requirementsText: "",
  perUserLimit: 1,
  status: "open",
  variant: "default",
  startAt: undefined,
  endAt: undefined,
};

export const CREATE_ROUND_REQUIRED_FIELDS = {
  title: "Please enter a title for your round.",
  description: "Please enter a description.",
  prompt: "Please enter a prompt for duels.",
  requirementsText: "Please enter requirements text.",
} as const satisfies Record<
  keyof Pick<CreateRoundFormData, "title" | "description" | "prompt" | "requirementsText">,
  string
>;

export const parseCreateRoundDateInput = (value: string): Date | null => {
  if (!value) return null;

  const isoDate = new Date(value);
  if (!Number.isNaN(isoDate.getTime())) return isoDate;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
};

const createRoundDateStringSchema = (label: "Start" | "End") =>
  z.preprocess(
    (value) => {
      if (value == null) return "";
      if (typeof value !== "string") return value;
      return value.trim();
    },
    z
      .string()
      .min(1, `${label} date is required.`)
      .refine((value) => Boolean(parseCreateRoundDateInput(value)), `${label} date is invalid.`)
  );

export const createRoundPayloadSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    prompt: z.string().trim().min(1, "Prompt is required."),
    description: z.string().trim().min(1, "Description is required."),
    castTemplate: z.string().trim().optional().default(""),
    requirementsText: z.string().trim().min(1, "Requirements text is required."),
    perUserLimit: z.coerce
      .number()
      .int()
      .min(1, "Per-user limit must be an integer between 1 and 99.")
      .max(99, "Per-user limit must be an integer between 1 and 99.")
      .optional()
      .default(1),
    status: z.enum(["draft", "open"]).optional().default("open"),
    variant: z.enum(ROUND_VARIANTS).optional().default("default"),
    startAt: createRoundDateStringSchema("Start"),
    endAt: createRoundDateStringSchema("End"),
    clauses: platformScopedRuleClausesSchema.optional().default({ farcaster: [], x: [] }),
  })
  .superRefine((payload, ctx) => {
    const startAt = payload.startAt ? parseCreateRoundDateInput(payload.startAt) : null;
    const endAt = payload.endAt ? parseCreateRoundDateInput(payload.endAt) : null;
    if (startAt && endAt && endAt.getTime() < startAt.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after start date.",
        path: ["endAt"],
      });
    }
  });

export type CreateRoundPayload = z.input<typeof createRoundPayloadSchema>;

export function getCreateRoundDateRangeError(
  data: Pick<CreateRoundFormData, "startAt" | "endAt">
): string | null {
  const { startAt, endAt } = data;
  return startAt && endAt && endAt < startAt ? "End date must be on or after start date." : null;
}

export function validateCreateRoundStep(
  step: number,
  data: CreateRoundFormData
): CreateRoundValidationResult {
  if (step === 1) {
    for (const [field, error] of Object.entries(CREATE_ROUND_REQUIRED_FIELDS)) {
      if (!data[field as keyof typeof CREATE_ROUND_REQUIRED_FIELDS].trim()) {
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

    const dateRangeError = getCreateRoundDateRangeError(data);
    if (dateRangeError) {
      return { ok: false, error: dateRangeError };
    }
  }

  return { ok: true };
}

export function buildCreateRoundPayload(
  data: CreateRoundFormData
): { ok: true; value: CreateRoundPayload } | { ok: false; error: string } {
  const clauses = serializeClausesDraft(data.clausesDraft);
  if (!clauses.ok) {
    return { ok: false, error: clauses.error };
  }

  if (!data.startAt) {
    return { ok: false, error: "Please select a start date." };
  }
  if (!data.endAt) {
    return { ok: false, error: "Please select an end date." };
  }

  const dateRangeError = getCreateRoundDateRangeError(data);
  if (dateRangeError) {
    return { ok: false, error: dateRangeError };
  }

  return {
    ok: true,
    value: {
      title: data.title,
      prompt: data.prompt,
      description: data.description,
      castTemplate: data.castTemplate,
      clauses: clauses.value,
      requirementsText: data.requirementsText,
      perUserLimit: data.perUserLimit,
      status: data.status,
      variant: data.variant,
      startAt: data.startAt.toISOString(),
      endAt: data.endAt.toISOString(),
    },
  };
}

export function parseCreateRoundPayload(payload: CreateRoundPayload):
  | {
      ok: true;
      data: z.output<typeof createRoundPayloadSchema>;
      startAt: Date;
      endAt: Date;
    }
  | { ok: false; error: string } {
  const parsed = createRoundPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid round payload." };
  }

  const startAt = parseCreateRoundDateInput(parsed.data.startAt);
  const endAt = parseCreateRoundDateInput(parsed.data.endAt);
  if (!startAt || !endAt) {
    return { ok: false, error: "Invalid round payload." };
  }

  return { ok: true, data: parsed.data, startAt, endAt };
}
