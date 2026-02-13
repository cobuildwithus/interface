import { describe, expect, it } from "vitest";
import {
  coerceCastSummaryFromSuccess,
  extractSummaryFromError,
  formatCastRulesError,
} from "./helpers";

describe("extractSummaryFromError", () => {
  const fallback = { castHash: "0xfallback", ruleId: 99 };

  it("extracts valid summary from 4xx error with JSON", () => {
    const json = JSON.stringify({
      rulePassed: false,
      outcomeCode: "deterministic_failed",
      outcomeReason: "Missing required mention",
      tags: ["test-tag"],
      castHash: "0xabc123",
      ruleId: 42,
    });
    const error = Object.assign(new Error(`HTTP 400: ${json}`), { status: 400 });

    const result = extractSummaryFromError(error, fallback);

    expect(result).not.toBeNull();
    expect(result?.rulePassed).toBe(false);
    expect(result?.outcomeCode).toBe("deterministic_failed");
    expect(result?.outcomeReason).toBe("Missing required mention");
    expect(result?.tags).toEqual(["test-tag"]);
    expect(result?.castHash).toBe("0xabc123");
    expect(result?.ruleId).toBe(42);
  });

  it("supports post-check summary shape (code/reason/postId)", () => {
    const parsed = {
      platform: "farcaster",
      postId: "b".repeat(40),
      ruleId: 2,
      passed: false,
      code: "post_not_found",
      reason: "Cast not found",
    };

    const summary = coerceCastSummaryFromSuccess(parsed, fallback);
    expect(summary).not.toBeNull();
    expect(summary?.rulePassed).toBe(false);
    expect(summary?.outcomeCode).toBe("post_not_found");
    expect(summary?.outcomeReason).toBe("Cast not found");
    expect(summary?.castHash).toBe(`0x${"b".repeat(40)}`);
    expect(summary?.ruleId).toBe(2);
  });

  it("supports wrapped { data: ... } success payloads", () => {
    const castHash = `0x${"c".repeat(40)}`;
    const wrapped = {
      data: {
        rulePassed: true,
        outcomeCode: "passed",
        outcomeReason: "OK",
        tags: ["tag"],
        castHash,
        ruleId: 7,
      },
    };

    const summary = coerceCastSummaryFromSuccess(wrapped, fallback);
    expect(summary).not.toBeNull();
    expect(summary?.castHash).toBe(castHash);
    expect(summary?.ruleId).toBe(7);
    expect(summary?.tags).toEqual(["tag"]);
  });

  it("coerces numeric ruleId strings", () => {
    const castHash = `0x${"d".repeat(40)}`;
    const parsed = {
      rulePassed: true,
      outcomeCode: "passed",
      outcomeReason: "OK",
      castHash,
      ruleId: "42",
    };

    const summary = coerceCastSummaryFromSuccess(parsed, fallback);
    expect(summary).not.toBeNull();
    expect(summary?.ruleId).toBe(42);
  });

  it("uses fallback values when castHash/ruleId missing", () => {
    const json = JSON.stringify({
      rulePassed: true,
      outcomeCode: "passed",
      outcomeReason: "All checks passed",
    });
    const error = Object.assign(new Error(`HTTP 400: ${json}`), { status: 400 });

    const result = extractSummaryFromError(error, fallback);

    expect(result?.castHash).toBe("0xfallback");
    expect(result?.ruleId).toBe(99);
  });

  it("returns null for 5xx errors", () => {
    const json = JSON.stringify({
      rulePassed: false,
      outcomeCode: "internal_error",
      outcomeReason: "Server error",
    });
    const error = Object.assign(new Error(`HTTP 500: ${json}`), { status: 500 });

    expect(extractSummaryFromError(error, fallback)).toBeNull();
  });

  it("returns null for errors without status", () => {
    const error = new Error("Some error");
    expect(extractSummaryFromError(error, fallback)).toBeNull();
  });

  it("returns null for error with empty message", () => {
    const error = Object.assign(new Error(""), { status: 400 });
    (error as Error).message = "";
    expect(extractSummaryFromError(error, fallback)).toBeNull();
  });

  it("returns null when JSON parses to non-object (string)", () => {
    const error = Object.assign(new Error('HTTP 400: "just a string"'), { status: 400 });
    expect(extractSummaryFromError(error, fallback)).toBeNull();
  });

  it("returns null when JSON parses to null", () => {
    const error = Object.assign(new Error("HTTP 400: null"), { status: 400 });
    expect(extractSummaryFromError(error, fallback)).toBeNull();
  });

  it("returns null for errors with status < 400", () => {
    const error = Object.assign(new Error("Redirect"), { status: 301 });
    expect(extractSummaryFromError(error, fallback)).toBeNull();
  });

  it("returns null for non-matching message format", () => {
    const error = Object.assign(new Error("Not the expected format"), { status: 400 });
    expect(extractSummaryFromError(error, fallback)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    const error = Object.assign(new Error("HTTP 400: not valid json"), { status: 400 });
    expect(extractSummaryFromError(error, fallback)).toBeNull();
  });

  it("returns null for missing required fields", () => {
    const json = JSON.stringify({
      rulePassed: true,
      // missing outcomeCode and outcomeReason
    });
    const error = Object.assign(new Error(`HTTP 400: ${json}`), { status: 400 });

    expect(extractSummaryFromError(error, fallback)).toBeNull();
  });

  it("returns null if rulePassed is not boolean", () => {
    const json = JSON.stringify({
      rulePassed: "yes",
      outcomeCode: "passed",
      outcomeReason: "Done",
    });
    const error = Object.assign(new Error(`HTTP 400: ${json}`), { status: 400 });

    expect(extractSummaryFromError(error, fallback)).toBeNull();
  });

  it("preserves optional fields when present", () => {
    const json = JSON.stringify({
      rulePassed: true,
      outcomeCode: "passed",
      outcomeReason: "OK",
      metadata: { deleted: false, hasParent: true },
      semantic: { accepted: true, passes: 5, failures: 0 },
      llm: { gradeEvaluated: true, pass: true, reason: "Good" },
      matchWhy: ["reason1", "reason2"],
      castFound: true,
      ruleFound: true,
      deterministicMatch: true,
      persisted: true,
    });
    const error = Object.assign(new Error(`HTTP 400: ${json}`), { status: 400 });

    const result = extractSummaryFromError(error, fallback);

    expect(result?.metadata).toEqual({ deleted: false, hasParent: true });
    expect(result?.semantic).toEqual({ accepted: true, passes: 5, failures: 0 });
    expect(result?.llm).toEqual({ gradeEvaluated: true, pass: true, reason: "Good" });
    expect(result?.matchWhy).toEqual(["reason1", "reason2"]);
    expect(result?.castFound).toBe(true);
    expect(result?.ruleFound).toBe(true);
    expect(result?.deterministicMatch).toBe(true);
    expect(result?.persisted).toBe(true);
  });

  it("handles empty tags array", () => {
    const json = JSON.stringify({
      rulePassed: true,
      outcomeCode: "passed",
      outcomeReason: "OK",
      tags: [],
    });
    const error = Object.assign(new Error(`HTTP 400: ${json}`), { status: 400 });

    const result = extractSummaryFromError(error, fallback);
    expect(result?.tags).toEqual([]);
  });

  it("defaults to empty array when tags is not array", () => {
    const json = JSON.stringify({
      rulePassed: true,
      outcomeCode: "passed",
      outcomeReason: "OK",
      tags: "not-an-array",
    });
    const error = Object.assign(new Error(`HTTP 400: ${json}`), { status: 400 });

    const result = extractSummaryFromError(error, fallback);
    expect(result?.tags).toEqual([]);
  });
});

describe("formatCastRulesError", () => {
  it("returns rate limit message for 429", () => {
    const error = Object.assign(new Error("Too Many Requests"), { status: 429 });
    expect(formatCastRulesError(error)).toBe(
      "Verification is still running. Try again in a few seconds."
    );
  });

  it("returns timeout message for timeout errors", () => {
    const error = Object.assign(new Error("Request timed out"), { status: 408 });
    expect(formatCastRulesError(error)).toBe(
      "Verification is taking longer than expected. Try again shortly."
    );
  });

  it("returns timeout message case-insensitive", () => {
    const error = Object.assign(new Error("REQUEST TIMED OUT"), { status: 408 });
    expect(formatCastRulesError(error)).toBe(
      "Verification is taking longer than expected. Try again shortly."
    );
  });

  it("returns original message for other errors", () => {
    const error = Object.assign(new Error("Something went wrong"), { status: 500 });
    expect(formatCastRulesError(error)).toBe("Something went wrong");
  });

  it("returns fallback for empty message", () => {
    const error = Object.assign(new Error(""), { status: 500 });
    expect(formatCastRulesError(error)).toBe("Failed to check cast.");
  });

  it("handles error without status", () => {
    const error = new Error("Network error");
    expect(formatCastRulesError(error)).toBe("Network error");
  });

  it("rewrites deterministic missing requirements messages for end users", () => {
    const json = JSON.stringify({
      outcomeReason: "Cast is missing required elements: missing mention @cobuild.",
    });
    const error = Object.assign(new Error(`HTTP 400: ${json}`), { status: 400 });
    expect(formatCastRulesError(error)).toBe(
      "Post not eligible. Please tag @cobuild in your post, then submit again."
    );
  });
});
