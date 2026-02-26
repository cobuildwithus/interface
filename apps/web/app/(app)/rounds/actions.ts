"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";

import { getUser } from "@/lib/domains/auth/session";
import { isGlobalAdmin } from "@/lib/config/admins";
import prisma from "@/lib/server/db/cobuild-db-client";
import {
  platformScopedRuleClausesSchema,
  type FarcasterClauseInput,
} from "@/lib/domains/rules/rules/clauses";
import { getFidsByUsernames } from "@/lib/integrations/farcaster/profile";
import { ROUND_VARIANTS } from "@/lib/domains/rounds/config";

const parseIsoDateTimeOrDateOnly = (value: string): Date | null => {
  if (!value) return null;
  // Try ISO datetime first (e.g., "2025-12-17T14:30:00.000Z")
  const isoDate = new Date(value);
  if (!Number.isNaN(isoDate.getTime())) return isoDate;
  // Fallback to date-only format (e.g., "2025-12-17")
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateStringSchema = (label: "Start" | "End") =>
  z.preprocess(
    (value) => {
      if (value == null) return "";
      if (typeof value !== "string") return value;
      return value.trim();
    },
    z
      .string()
      .min(1, `${label} date is required.`)
      .refine((value) => Boolean(parseIsoDateTimeOrDateOnly(value)), `${label} date is invalid.`)
  );

const createRoundPayloadSchema = z
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
    startAt: dateStringSchema("Start"),
    endAt: dateStringSchema("End"),
    clauses: platformScopedRuleClausesSchema.optional().default({ farcaster: [], x: [] }),
  })
  .superRefine((payload, ctx) => {
    const startAt = payload.startAt ? parseIsoDateTimeOrDateOnly(payload.startAt) : null;
    const endAt = payload.endAt ? parseIsoDateTimeOrDateOnly(payload.endAt) : null;
    if (startAt && endAt && endAt.getTime() < startAt.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after start date.",
        path: ["endAt"],
      });
    }
  });

type CreateRoundPayload = z.input<typeof createRoundPayloadSchema>;

type CreateRoundResult = { ok: true; roundId: string } | { ok: false; error: string };

type ResolvedClauses = {
  farcaster: Array<
    | { type: "mentionsAll"; fids: number[] }
    | { type: "embedUrlPattern"; patterns: string[] }
    | { type: "rootParentUrl"; urls: string[] }
  >;
  x: Array<
    { type: "mentionsAll"; usernames: string[] } | { type: "embedUrlPattern"; patterns: string[] }
  >;
};

async function resolveFarcasterUsernamesToFids(clauses: {
  farcaster: FarcasterClauseInput[];
  x: z.infer<typeof platformScopedRuleClausesSchema>["x"];
}): Promise<{ ok: true; value: ResolvedClauses } | { ok: false; error: string }> {
  const resolvedFarcaster: ResolvedClauses["farcaster"] = [];

  for (const clause of clauses.farcaster) {
    if (clause.type === "mentionsAll") {
      const { fids, notFound } = await getFidsByUsernames(clause.usernames);
      if (notFound.length > 0) {
        return {
          ok: false,
          error: `Farcaster username${notFound.length > 1 ? "s" : ""} not found: ${notFound.join(", ")}`,
        };
      }
      resolvedFarcaster.push({ type: "mentionsAll", fids });
    } else if (clause.type === "embedUrlPattern") {
      resolvedFarcaster.push({ type: "embedUrlPattern", patterns: clause.patterns });
    } else {
      resolvedFarcaster.push({ type: "rootParentUrl", urls: clause.urls });
    }
  }

  return { ok: true, value: { farcaster: resolvedFarcaster, x: clauses.x } };
}

export async function createRound(payload: CreateRoundPayload): Promise<CreateRoundResult> {
  const userAddress = await getUser();
  if (!userAddress) {
    return { ok: false, error: "Sign in to create rounds." };
  }

  if (!isGlobalAdmin(userAddress)) {
    return { ok: false, error: "You don't have permission to create rounds." };
  }

  const parsed = createRoundPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid round payload." };
  }

  const startAtDate = parseIsoDateTimeOrDateOnly(parsed.data.startAt)!;
  const endAtDate = parseIsoDateTimeOrDateOnly(parsed.data.endAt)!;

  // Convert Farcaster usernames to FIDs
  const resolvedClauses = await resolveFarcasterUsernamesToFids(parsed.data.clauses);
  if (!resolvedClauses.ok) {
    return { ok: false, error: resolvedClauses.error };
  }

  const round = await prisma.$transaction(async (tx) => {
    const rule = await tx.postFilterRule.create({
      data: {
        // Keep these titles identical for UI clarity (rule is round-scoped today).
        title: parsed.data.title,
        // output_tag is required but we want it to be derived from the id.
        outputTag: `pending-rule-${Date.now()}`,
        requirementsText: parsed.data.requirementsText,
        castTemplate: parsed.data.castTemplate || null,
        perUserLimit: parsed.data.perUserLimit,
        platforms: ["farcaster", "x"],
        clauses: resolvedClauses.value,
      },
      select: { id: true },
    });

    await tx.postFilterRule.update({
      where: { id: rule.id },
      data: { outputTag: `rule-${rule.id}` },
    });

    return await tx.round.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        prompt: parsed.data.prompt,
        startAt: startAtDate,
        endAt: endAtDate,
        createdByAddress: userAddress,
        status: parsed.data.status,
        variant: parsed.data.variant,
        primaryRuleId: rule.id,
        parentRoundId: null,
      },
      select: { id: true },
    });
  });

  revalidateTag("rounds:list", "seconds");

  return { ok: true, roundId: round.id.toString() };
}
