import { isAdminFor } from "@/lib/config/admins";
import prisma from "@/lib/server/db/cobuild-db-client";
import { rewriteRequirementsText } from "./cast-rules-ai";
import { normalizePostId } from "./normalize-post-id";
import { rescoreOpenRoundsForRule } from "./rescore-api";

export type MarkIneligiblePayload = {
  ruleId: number;
  source?: "farcaster" | "x";
  castHash: string;
  moderatorNote: string;
  castText: string;
  alsoUpdateRequirements?: boolean;
};

export type MarkIneligibleResult =
  | {
      ok: true;
      removedTag: boolean;
      removedSubmission: boolean;
      requirementsUpdated: boolean;
      affectedRoundIds: string[];
    }
  | { ok: false; error: string };

const MAX_REWRITE_ATTEMPTS = 2;

async function maybeRewriteRequirements(params: {
  ruleId: number;
  ruleTitle: string | null;
  currentRequirements: string;
  moderatorNote: string;
  castText: string;
}): Promise<{ updated: boolean; newText: string | null }> {
  const { ruleId, ruleTitle, currentRequirements, moderatorNote, castText } = params;

  for (let attempt = 1; attempt <= MAX_REWRITE_ATTEMPTS; attempt++) {
    try {
      const newText = await rewriteRequirementsText({
        roundTitle: ruleTitle,
        currentRequirements,
        moderatorNote,
        castText,
      });

      if (!newText || newText.trim() === currentRequirements.trim()) {
        return { updated: false, newText: null };
      }

      await prisma.postFilterRule.update({
        where: { id: ruleId },
        data: { requirementsText: newText },
      });

      return { updated: true, newText };
    } catch (error) {
      console.error("Requirements rewrite attempt failed", {
        ruleId,
        attempt,
        error,
      });
      if (attempt === MAX_REWRITE_ATTEMPTS) {
        return { updated: false, newText: null };
      }
    }
  }

  return { updated: false, newText: null };
}

export async function markIneligible(
  params: MarkIneligiblePayload & { userAddress: `0x${string}` }
): Promise<MarkIneligibleResult> {
  const { userAddress, ruleId, castHash, moderatorNote, castText } = params;
  const source: "farcaster" | "x" = params.source ?? "farcaster";
  const alsoUpdateRequirements = Boolean(params.alsoUpdateRequirements);

  const trimmedNote = moderatorNote.trim();
  if (!trimmedNote) {
    return { ok: false, error: "Add a reason before marking ineligible." };
  }

  const normalizedPostId = normalizePostId(castHash);
  if (
    source === "farcaster" &&
    (!normalizedPostId || !/^0x[0-9a-f]{40}$/i.test(normalizedPostId))
  ) {
    return { ok: false, error: "Invalid cast hash." };
  }

  const rule = await prisma.postFilterRule.findUnique({
    where: { id: ruleId },
    select: {
      outputTag: true,
      admins: true,
      requirementsText: true,
      primaryEvalRounds: {
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!rule?.outputTag) {
    return { ok: false, error: "Round not found." };
  }

  const roundTitle = rule.primaryEvalRounds[0]?.title ?? null;
  const affectedRoundIds = rule.primaryEvalRounds.map((round) => round.id.toString());

  const isAllowed = isAdminFor(userAddress, rule.admins ?? []);

  if (!isAllowed) {
    return { ok: false, error: "You are not allowed to moderate this round." };
  }

  const postIdCandidates = normalizedPostId ? [normalizedPostId] : [];
  const removedSubmissionResult =
    affectedRoundIds.length > 0 && postIdCandidates.length > 0
      ? await prisma.roundSubmission.deleteMany({
          where: {
            roundId: { in: rule.primaryEvalRounds.map((round) => round.id) },
            source,
            postId: { in: postIdCandidates },
          },
        })
      : { count: 0 };

  const removedSubmission = removedSubmissionResult.count > 0;

  // computed_tags is no longer stored; moderation now only removes submissions.
  const removedTag = false;

  const rewriteResult = alsoUpdateRequirements
    ? await maybeRewriteRequirements({
        ruleId,
        ruleTitle: roundTitle,
        currentRequirements: rule.requirementsText ?? "",
        moderatorNote: trimmedNote,
        castText: castText.trim(),
      })
    : { updated: false, newText: null };

  // Trigger rescore for affected rounds (fire and forget, don't block)
  if (removedSubmission) {
    rescoreOpenRoundsForRule(ruleId).catch((err) => {
      console.error(`[moderation] Failed to trigger rescore for rule ${ruleId}:`, err);
    });
  }

  console.log(
    `[moderation] ${userAddress} marked ${source} post ${castHash} ineligible for rule ${ruleId}. Reason: ${trimmedNote}. Removed submission: ${removedSubmission}. Requirements updated: ${rewriteResult.updated}`
  );

  return {
    ok: true,
    removedTag,
    removedSubmission,
    requirementsUpdated: rewriteResult.updated,
    affectedRoundIds,
  };
}
