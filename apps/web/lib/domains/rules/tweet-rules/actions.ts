"use server";

import { runPlatformRulesServerCheck } from "@/lib/domains/rules/rules/core/check";
import { xRulesAdapter } from "@/lib/domains/rules/rules/platforms/registry";
import { getSession } from "@/lib/domains/auth/session";
import type {
  CheckTweetAgainstRuleInput,
  CheckTweetAgainstRuleResult,
  TweetRulesServerCheckInput,
} from "@/lib/domains/rules/tweet-rules/types";

export async function runTweetRulesServerCheck(
  input: TweetRulesServerCheckInput
): Promise<CheckTweetAgainstRuleResult> {
  const normalizedRuleId = Number(input.ruleId);
  if (!Number.isFinite(normalizedRuleId) || normalizedRuleId <= 0) {
    return { ok: false, error: "Invalid rule id." };
  }

  const tweetUrlOrId = `${input.tweetUrlOrId ?? ""}`.trim();
  if (!tweetUrlOrId) {
    return { ok: false, error: "Missing tweet URL or id." };
  }

  const result = await runPlatformRulesServerCheck(xRulesAdapter, {
    ruleId: normalizedRuleId,
    postRef: tweetUrlOrId,
    address: input.address,
    authorUsername: input.authorUsername,
    timeoutMs: input.timeoutMs,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status };
  }

  return { ok: true, data: result.data };
}

/**
 * Checks a tweet against a rule.
 * Note: Ownership validation is performed by the rules API after fetching the post.
 */
export async function checkTweetAgainstRule(
  input: CheckTweetAgainstRuleInput
): Promise<CheckTweetAgainstRuleResult> {
  const normalizedRuleId = Number(input.ruleId);
  if (!Number.isFinite(normalizedRuleId) || normalizedRuleId <= 0) {
    return { ok: false, error: "Invalid rule id." };
  }

  const tweetUrlOrId = `${input.tweetUrlOrId ?? ""}`.trim();
  if (!tweetUrlOrId) {
    return { ok: false, error: "Missing tweet URL or id." };
  }

  const session = await getSession();
  if (!session.address) {
    return { ok: false, error: "Sign in to verify submissions." };
  }
  if (!session.twitter) {
    return { ok: false, error: "You must link your X account before submitting." };
  }
  const authorUsername = session.twitter.username?.trim();
  if (!authorUsername) {
    return { ok: false, error: "Your linked X account is missing a username. Please re-link." };
  }

  return await runTweetRulesServerCheck({
    ruleId: normalizedRuleId,
    tweetUrlOrId,
    address: session.address,
    authorUsername,
  });
}
