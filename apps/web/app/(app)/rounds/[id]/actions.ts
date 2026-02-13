"use server";

import { revalidateTag } from "next/cache";
import { getUser } from "@/lib/domains/auth/session";
import { isAdminFor } from "@/lib/config/admins";
import prisma from "@/lib/server/db/cobuild-db-client";
import type { RoundVariant } from "@/lib/domains/rounds/config";
import {
  markIneligible,
  type MarkIneligiblePayload,
  type MarkIneligibleResult,
} from "@/lib/domains/rounds/moderation-service";

export async function markSubmissionIneligible(
  params: MarkIneligiblePayload
): Promise<MarkIneligibleResult> {
  const userAddress = await getUser();
  if (!userAddress) {
    return { ok: false, error: "Sign in to moderate submissions." };
  }

  const result = await markIneligible({ ...params, userAddress });

  if (result.ok) {
    // Best-effort: invalidate round views that depend on submissions.
    revalidateTag("rounds:list", "seconds");
    revalidateTag(`round:submissions:${params.ruleId}`, "seconds");
    for (const roundId of result.affectedRoundIds) {
      revalidateTag(`round:${roundId}`, "seconds");
      revalidateTag(`round:${roundId}:entity-ids`, "seconds");
    }
  }

  return result;
}

type UpdateRoundPayload = {
  roundId: string;
  ruleId: number;
  title: string;
  description: string;
  startAt?: string | null;
  endAt?: string | null;
  variant?: RoundVariant;
  requirementsText: string;
  ctaText: string;
  castTemplate: string;
  perUserLimit: number;
};

type UpdateRoundResult = { ok: true } | { ok: false; error: string };

export async function updateRound(payload: UpdateRoundPayload): Promise<UpdateRoundResult> {
  const userAddress = await getUser();
  if (!userAddress) {
    return { ok: false, error: "Sign in to manage this round." };
  }

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

  const startAt = (payload.startAt ?? "").trim();
  const endAt = (payload.endAt ?? "").trim();
  const startAtDate = parseIsoDateTimeOrDateOnly(startAt);
  const endAtDate = parseIsoDateTimeOrDateOnly(endAt);
  if (startAt && !startAtDate) {
    return { ok: false, error: "Start date is invalid." };
  }
  if (endAt && !endAtDate) {
    return { ok: false, error: "End date is invalid." };
  }
  if (startAtDate && endAtDate && endAtDate.getTime() < startAtDate.getTime()) {
    return { ok: false, error: "End date must be on or after start date." };
  }

  const rule = await prisma.postFilterRule.findUnique({
    where: { id: payload.ruleId },
    select: { admins: true },
  });

  if (!rule) {
    return { ok: false, error: "Round not found." };
  }

  if (!isAdminFor(userAddress, rule.admins)) {
    return {
      ok: false,
      error: "You don't have permission to manage this round.",
    };
  }

  await Promise.all([
    prisma.round.update({
      where: { id: BigInt(payload.roundId) },
      data: {
        title: payload.title || undefined,
        description: payload.description || undefined,
        startAt: startAtDate ?? undefined,
        endAt: endAtDate ?? undefined,
        variant: payload.variant || undefined,
      },
    }),
    prisma.postFilterRule.update({
      where: { id: payload.ruleId },
      data: {
        requirementsText: payload.requirementsText || undefined,
        ctaText: payload.ctaText || undefined,
        castTemplate: payload.castTemplate || undefined,
        perUserLimit: payload.perUserLimit > 0 ? payload.perUserLimit : undefined,
      },
    }),
  ]);

  revalidateTag(`round:${payload.roundId}`, "seconds");
  revalidateTag("rounds:list", "seconds");

  return { ok: true };
}
