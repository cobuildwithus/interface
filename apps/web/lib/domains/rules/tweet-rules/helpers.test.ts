import { describe, expect, it } from "vitest";

import { coerceTweetSummaryFromSuccess, formatTweetRulesError } from "./helpers";

describe("coerceTweetSummaryFromSuccess", () => {
  it("supports post-check summary shape (code/reason/postId)", () => {
    const fallback = { tweetId: "fallback", ruleId: 99 };
    const parsed = {
      platform: "x",
      postId: "1999394881027080400",
      ruleId: 2,
      passed: true,
      code: "passed",
      reason: "Rule passed.",
    };

    const summary = coerceTweetSummaryFromSuccess(parsed, fallback);
    expect(summary).not.toBeNull();
    expect(summary?.tweetId).toBe("1999394881027080400");
    expect(summary?.ruleId).toBe(2);
    expect(summary?.rulePassed).toBe(true);
    expect(summary?.outcomeCode).toBe("passed");
    expect(summary?.outcomeReason).toBe("Rule passed.");
  });
});

describe("formatTweetRulesError", () => {
  it("rewrites deterministic missing requirements messages for end users", () => {
    const json = JSON.stringify({
      outcomeReason: "Deterministic checks failed: missing link matching https://example.com.",
    });
    const error = Object.assign(new Error(`HTTP 400: ${json}`), { status: 400 });
    expect(formatTweetRulesError(error)).toBe(
      "Post not eligible. Please include a link to example.com in your post, then submit again."
    );
  });
});
