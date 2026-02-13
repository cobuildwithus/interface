import { describe, expect, it, vi } from "vitest";
import {
  buildRoundSubmission,
  firstNonEmptyString,
  getSubmissionUiFields,
  normalizeSubmissionId,
  parseRoundId,
  toAiOutput,
  toIsoString,
  toRecord,
} from "./utils";
import type { SubmissionRow } from "./types";

vi.mock("@/lib/domains/rounds/submission-metadata", () => ({
  getBeneficiaryAddressFromMetadata: () => "0x" + "b".repeat(40),
}));

describe("submission service utils", () => {
  it("parses round ids", () => {
    expect(parseRoundId("123")).toBe(123n);
    expect(parseRoundId("bad")).toBeNull();
    expect(parseRoundId("")).toBeNull();
  });

  it("normalizes basic values", () => {
    expect(toRecord(null)).toEqual({});
    expect(toRecord([])).toEqual({});
    expect(toRecord({ ok: true })).toEqual({ ok: true });
    expect(toIsoString(undefined)).toBeNull();
    expect(toIsoString(new Date("2024-01-01T00:00:00Z"))).toBe("2024-01-01T00:00:00.000Z");
  });

  it("builds ai output when available", () => {
    expect(toAiOutput(null)).toBeNull();
    expect(
      toAiOutput({
        id: 1n,
        model: "model",
        output: { pass: true },
        createdAt: null,
      })
    ).toBeNull();
    expect(
      toAiOutput({
        id: 2n,
        model: "model",
        output: { pass: true },
        createdAt: new Date("2024-01-01T00:00:00Z"),
      })
    ).toEqual({
      id: "2",
      model: "model",
      output: { pass: true },
      createdAt: "2024-01-01T00:00:00.000Z",
    });
  });

  it("selects non-empty strings and ui fields", () => {
    expect(firstNonEmptyString(undefined, "  ", "ok")).toBe("ok");

    const farcasterUi = getSubmissionUiFields({
      source: "farcaster",
      authorHandle: null,
      authorDisplayName: null,
      authorAvatarUrl: null,
      aiTitle: null,
      displayText: null,
      rawText: "hello",
    });
    expect(farcasterUi.handle).toBe("fc");
    expect(farcasterUi.displayName).toBe("Farcaster");

    const xUi = getSubmissionUiFields({
      source: "x",
      authorHandle: "@alice",
      authorDisplayName: "Alice",
      authorAvatarUrl: null,
      aiTitle: null,
      displayText: null,
      rawText: "hello",
    });
    expect(xUi.handle).toBe("alice");
    expect(xUi.displayName).toBe("Alice");
  });

  it("normalizes submission ids", () => {
    expect(normalizeSubmissionId(123)).toBeNull();
    expect(normalizeSubmissionId("  1234567890 ")).toBe("1234567890");
  });

  it("builds round submissions with eval score and fallbacks", () => {
    const baseRow: SubmissionRow = {
      source: "farcaster",
      postId: " 0x" + "a".repeat(40),
      url: null,
      createdAt: null,
      insertedAt: new Date("2024-01-01T00:00:00Z"),
      aiTitle: "AI title",
      aiCategory: null,
      authorHandle: "",
      authorDisplayName: null,
      authorAvatarUrl: null,
      rawText: "hello",
      displayText: null,
      metadata: {},
      mediaUrls: null,
      evalShare: 0.5,
      evalRank: 2n,
      evalWinRate: 0.75,
    };

    const submission = buildRoundSubmission(baseRow);
    expect(submission.evalScore?.share).toBe(0.5);
    expect(submission.summaryText).toBe("AI title");

    const noEval = buildRoundSubmission({ ...baseRow, evalShare: null, aiTitle: null });
    expect(noEval.evalScore).toBeNull();
    expect(noEval.summaryText).toBe("hello");
  });
});
