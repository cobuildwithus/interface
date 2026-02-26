"use server";

import { checkCastAgainstRule } from "@/lib/domains/rules/cast-rules/actions";
import { checkTweetAgainstRule } from "@/lib/domains/rules/tweet-rules/actions";
import { resolveCastHashFromUrl } from "@/lib/integrations/farcaster/resolve-cast";
import { PLATFORMS, type PostPlatform } from "@/lib/domains/social/platforms";
import prisma from "@/lib/server/db/cobuild-db-client";
import { getRoundTimingError } from "@/lib/domains/rounds/timing";
import { normalizePostId } from "@/lib/domains/rounds/normalize-post-id";
import type { JsonValue } from "@/lib/shared/json";

type CheckPostSchemaVersion = 1;

const CHECK_POST_RESULT_SCHEMA_VERSION: CheckPostSchemaVersion = 1;

type CheckPostAgainstRuleInput = {
  roundId: string;
  platform: PostPlatform;
  ruleId: number;
  postInput: string;
};

type CheckPostAgainstRuleData = {
  schemaVersion: CheckPostSchemaVersion;
  platform: PostPlatform;
  postId: string;
  ruleId: number;
  rulePassed: boolean;
  outcomeCode: string;
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

type CheckPostAgainstRuleResult =
  | { ok: true; data: CheckPostAgainstRuleData }
  | { ok: false; error: string; status?: number };

function normalizeLlm(
  llm:
    | {
        gradeEvaluated?: boolean | null;
        pass?: boolean | null;
        reason?: string | null;
      }
    | null
    | undefined
): CheckPostAgainstRuleData["llm"] {
  if (!llm) return undefined;
  return {
    gradeEvaluated: Boolean(llm.gradeEvaluated),
    pass: llm.pass ?? null,
    reason: llm.reason ?? null,
  };
}

type ResolvedPostRef =
  | { ok: true; postRef: string }
  | { ok: false; error: string; status?: number };

async function resolvePostRef(platform: PostPlatform, postInput: string): Promise<ResolvedPostRef> {
  const candidate = PLATFORMS[platform].input.toPostRefCandidate(postInput);
  if (candidate.kind === "error" || candidate.kind === "incomplete") {
    return { ok: false, error: candidate.error };
  }
  if (candidate.kind === "ready") {
    return { ok: true, postRef: candidate.postRef };
  }

  if (platform !== "farcaster") {
    return { ok: false, error: "Unsupported post reference." };
  }

  const resolved = await resolveCastHashFromUrl(candidate.url);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  return { ok: true, postRef: resolved.hash };
}

export async function checkPostAgainstRule(
  input: CheckPostAgainstRuleInput
): Promise<CheckPostAgainstRuleResult> {
  const roundIdStr = `${input.roundId ?? ""}`.trim();
  const platform = input.platform;
  const ruleId = Number(input.ruleId);
  const postInput = `${input.postInput ?? ""}`.trim();
  if (!Number.isFinite(ruleId) || ruleId <= 0) return { ok: false, error: "Invalid rule id." };
  if (!/^\d+$/.test(roundIdStr)) return { ok: false, error: "Invalid round id." };
  if (!postInput) return { ok: false, error: "Missing post reference." };

  const roundId = BigInt(roundIdStr);

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { startAt: true, endAt: true, primaryRuleId: true },
  });

  if (!round) {
    return { ok: false, status: 404, error: "Round not found." };
  }

  if (round.primaryRuleId !== ruleId) {
    return { ok: false, status: 400, error: "Round rule mismatch." };
  }

  const timingError = getRoundTimingError({
    startAt: round.startAt,
    endAt: round.endAt,
  });

  if (timingError) {
    return { ok: false, status: 403, error: timingError.message };
  }

  const resolvedRef = await resolvePostRef(platform, postInput);
  if (!resolvedRef.ok) return resolvedRef;

  const handlers: Record<
    PostPlatform,
    (args: { ruleId: number; postRef: string }) => Promise<CheckPostAgainstRuleResult>
  > = {
    farcaster: async ({ ruleId, postRef }) => {
      const result = await checkCastAgainstRule({ ruleId, castHash: postRef });
      if (!result.ok) return result;
      const normalizedPostId = normalizePostId(result.data.castHash) ?? result.data.castHash;
      return {
        ok: true,
        data: {
          schemaVersion: CHECK_POST_RESULT_SCHEMA_VERSION,
          platform: "farcaster",
          postId: normalizedPostId,
          ruleId: result.data.ruleId,
          rulePassed: result.data.rulePassed,
          outcomeCode: result.data.outcomeCode,
          outcomeReason: result.data.outcomeReason,
          tags: result.data.tags,
          metadata: result.data.metadata as JsonValue | undefined,
          semantic: result.data.semantic as JsonValue | undefined,
          llm: normalizeLlm(result.data.llm),
        },
      };
    },
    x: async ({ ruleId, postRef }) => {
      const result = await checkTweetAgainstRule({ ruleId, tweetUrlOrId: postRef });
      if (!result.ok) return result;
      const normalizedPostId = normalizePostId(result.data.tweetId) ?? result.data.tweetId;
      return {
        ok: true,
        data: {
          schemaVersion: CHECK_POST_RESULT_SCHEMA_VERSION,
          platform: "x",
          postId: normalizedPostId,
          ruleId: result.data.ruleId,
          rulePassed: result.data.rulePassed,
          outcomeCode: result.data.outcomeCode,
          outcomeReason: result.data.outcomeReason,
          tags: [],
          metadata: result.data.metadata as JsonValue | undefined,
          llm: normalizeLlm(result.data.llm),
        },
      };
    },
  };

  const handler = handlers[platform];
  if (!handler) return { ok: false, error: "Unsupported platform." };

  return handler({ ruleId, postRef: resolvedRef.postRef });
}
