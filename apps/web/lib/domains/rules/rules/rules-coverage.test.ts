import { describe, expect, it, vi, beforeEach } from "vitest";
import { formatOutcomeReasonForUser } from "@/lib/domains/rules/rules/core/format-outcome-reason";
import {
  parseHttpErrorJsonObject,
  formatRulesCheckError,
} from "@/lib/domains/rules/rules/core/http-error-json";
import { platformScopedRuleClausesSchema } from "@/lib/domains/rules/rules/clauses";
import { serializeClausesDraft, getClauseHelpText } from "@/lib/domains/rules/rules/core/drafts";
import type { RulesPlatformAdapter } from "@/lib/domains/rules/rules/core/types";
import {
  coerceXSummaryFromSuccess,
  extractXSummaryFromError,
  formatXRulesError,
  X_CLAUSE_DEFINITIONS,
  xRulesAdapter,
} from "@/lib/domains/rules/rules/platforms/x";
import {
  coerceFarcasterSummaryFromSuccess,
  extractFarcasterSummaryFromError,
  formatFarcasterRulesError,
  FARCASTER_CLAUSE_DEFINITIONS,
  farcasterRulesAdapter,
} from "@/lib/domains/rules/rules/platforms/farcaster";

vi.mock("server-only", () => ({}));

const ADDRESS = ("0x" + "a".repeat(40)) as `0x${string}`;
const ALT_ADDRESS = ("0x" + "b".repeat(40)) as `0x${string}`;

type MockSummary = Record<string, string | number | boolean | null | object>;
type MockFallback = { ruleId: number; postRef: string };

const mockAdapter: RulesPlatformAdapter<MockSummary, MockFallback> = {
  platform: "farcaster",
  logLabel: "test",
  path: "/test",
  createFallback: ({ ruleId, postRef }: { ruleId: number; postRef: string }) => ({
    ruleId,
    postRef,
  }),
  buildRequestBody: (input) => input,
  coerceSummaryFromSuccess: (data) =>
    typeof data === "object" && data !== null ? (data as MockSummary) : null,
  extractSummaryFromError: vi.fn(),
  formatError: vi.fn(),
};

describe("formatOutcomeReasonForUser", () => {
  it("returns raw when no mention/link keywords", () => {
    expect(formatOutcomeReasonForUser("All good")).toBe("All good");
  });

  it("formats missing mentions + links", () => {
    const reason =
      "Cast is missing required elements: missing mention @Alice; missing link matching https://example.com.";
    const formatted = formatOutcomeReasonForUser(reason);
    expect(formatted).toContain("tag @alice");
    expect(formatted).toContain("include a link to example.com");
  });

  it("formats mention-only and link-only cases", () => {
    const mentionOnly = formatOutcomeReasonForUser("missing mention @Bob");
    expect(mentionOnly).toContain("tag @bob");

    const linkOnly = formatOutcomeReasonForUser("missing link matching https://foo.com/");
    expect(linkOnly).toContain("include a link to foo.com");
  });

  it("deduplicates and formats multiple items", () => {
    const reason =
      "missing mention @Alice; missing mention @alice; missing mention @Bob; missing link matching https://www.example.com/.";
    const formatted = formatOutcomeReasonForUser(reason);
    expect(formatted).toContain("tag @alice and @bob");
    expect(formatted).toContain("include a link to example.com");
  });

  it("returns empty string when reason is empty", () => {
    expect(formatOutcomeReasonForUser("   ")).toBe("");
  });

  it("returns raw when no handles or links are parsed", () => {
    expect(formatOutcomeReasonForUser("missing mention")).toBe("missing mention");
  });

  it("formats three or more handles using commas", () => {
    const reason = "missing mention @alice; missing mention @bob; missing mention @carol.";
    const formatted = formatOutcomeReasonForUser(reason);
    expect(formatted).toContain("tag @alice, @bob, and @carol");
  });
});

describe("http error json helpers", () => {
  it("parses json payload for 4xx errors", () => {
    const error = Object.assign(new Error('HTTP 400: {"error":"bad"}'), { status: 400 });
    expect(parseHttpErrorJsonObject(error)).toEqual({ error: "bad" });
  });

  it("returns null for non-4xx errors", () => {
    const error = Object.assign(new Error('HTTP 500: {"error":"bad"}'), { status: 500 });
    expect(parseHttpErrorJsonObject(error)).toBeNull();
  });

  it("formats rules errors with fallbacks", () => {
    expect(
      formatRulesCheckError(Object.assign(new Error("whatever"), { status: 429 }), {
        defaultMessage: "Fallback",
      })
    ).toBe("Verification is still running. Try again in a few seconds.");

    expect(
      formatRulesCheckError(Object.assign(new Error("request timed out"), { status: 400 }), {
        defaultMessage: "Fallback",
      })
    ).toBe("Verification is taking longer than expected. Try again shortly.");

    expect(
      formatRulesCheckError(
        Object.assign(new Error('HTTP 400: {"detail":"oops"}'), { status: 400 }),
        {
          defaultMessage: "Fallback",
        }
      )
    ).toBe("oops");

    expect(
      formatRulesCheckError(Object.assign(new Error("HTTP 400: not-json"), { status: 400 }), {
        defaultMessage: "Fallback",
      })
    ).toBe("Something went wrong. Please try again.");
  });

  it("extracts nested error messages", () => {
    const error = Object.assign(
      new Error('HTTP 400: {"error_description":"oops","errors":[{"message":"inner"}]}'),
      { status: 400 }
    );
    expect(formatRulesCheckError(error, { defaultMessage: "Fallback" })).toBe("oops");
  });

  it("extracts errors from arrays + data fields", () => {
    const error = Object.assign(
      new Error('HTTP 400: {"errors":[{"detail":"deep"}],"data":{"error":"bad"}}'),
      { status: 400 }
    );
    expect(formatRulesCheckError(error, { defaultMessage: "Fallback" })).toBe("deep");

    const noHttp = Object.assign(new Error("Plain error"), { status: 400 });
    expect(formatRulesCheckError(noHttp, { defaultMessage: "Fallback" })).toBe("Plain error");
  });

  it("extracts error fields and string errors", () => {
    const errorField = Object.assign(new Error('HTTP 400: {"error":"bad"}'), { status: 400 });
    expect(formatRulesCheckError(errorField, { defaultMessage: "Fallback" })).toBe("bad");

    const errorString = Object.assign(new Error('HTTP 400: {"errors":"nope"}'), { status: 400 });
    expect(formatRulesCheckError(errorString, { defaultMessage: "Fallback" })).toBe("nope");

    const dataMessage = Object.assign(new Error('HTTP 400: {"data":{"message":"inner"}}'), {
      status: 400,
    });
    expect(formatRulesCheckError(dataMessage, { defaultMessage: "Fallback" })).toBe("inner");
  });
});

describe("runPlatformRulesServerCheck", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns error when rules API fails", async () => {
    vi.doMock("@/lib/domains/rules/rules-api/check", () => ({
      checkRulesApi: vi.fn().mockResolvedValue({ ok: false, error: "boom" }),
    }));

    const { runPlatformRulesServerCheck } = await import("@/lib/domains/rules/rules/core/check");

    const result = await runPlatformRulesServerCheck(mockAdapter, {
      ruleId: 1,
      postRef: "ref",
      address: ADDRESS,
    });

    expect(result.ok).toBe(false);
  });

  it("returns error when normalization fails", async () => {
    vi.doMock("@/lib/domains/rules/rules-api/check", () => ({
      checkRulesApi: vi.fn().mockResolvedValue({ ok: true, data: { ok: true } }),
    }));

    const adapter: RulesPlatformAdapter<MockSummary, MockFallback> = {
      ...mockAdapter,
      coerceSummaryFromSuccess: () => null,
    };

    const { runPlatformRulesServerCheck } = await import("@/lib/domains/rules/rules/core/check");
    const result = await runPlatformRulesServerCheck(adapter, {
      ruleId: 1,
      postRef: "ref",
      address: ADDRESS,
    });

    expect(result.ok).toBe(false);
  });

  it("returns normalized success", async () => {
    vi.doMock("@/lib/domains/rules/rules-api/check", () => ({
      checkRulesApi: vi.fn().mockResolvedValue({ ok: true, data: { pass: true } }),
    }));

    const { runPlatformRulesServerCheck } = await import("@/lib/domains/rules/rules/core/check");
    const result = await runPlatformRulesServerCheck(mockAdapter, {
      ruleId: 1,
      postRef: "ref",
      address: ADDRESS,
    });

    expect(result).toEqual({ ok: true, data: { pass: true } });
  });
});

describe("clauses + drafts", () => {
  it("flags duplicate clause types", () => {
    const parsed = platformScopedRuleClausesSchema.safeParse({
      farcaster: [
        { type: "mentionsAll", usernames: ["a"] },
        { type: "mentionsAll", usernames: ["b"] },
      ],
      x: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("flags duplicate x clause types", () => {
    const parsed = platformScopedRuleClausesSchema.safeParse({
      farcaster: [],
      x: [
        { type: "mentionsAll", usernames: ["a"] },
        { type: "mentionsAll", usernames: ["b"] },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("serializes drafts and returns help text", () => {
    const result = serializeClausesDraft({
      farcaster: [{ id: "f1", type: "mentionsAll", raw: "@alice" }],
      x: [{ id: "x1", type: "embedUrlPattern", raw: "example.com" }],
    });
    expect(result.ok).toBe(true);
    expect(getClauseHelpText("mentionsAll")).toContain("one per line");
  });

  it("returns errors for empty clause lists", () => {
    const result = serializeClausesDraft({
      farcaster: [{ id: "f1", type: "mentionsAll", raw: "   " }],
      x: [],
    });
    expect(result.ok).toBe(false);
  });
});

describe("platform summaries", () => {
  it("coerces X summary", () => {
    const summary = coerceXSummaryFromSuccess(
      { outcomeCode: "passed", outcomeReason: "ok", ruleId: 1, tweetId: "123", rulePassed: true },
      { tweetId: "fallback", ruleId: 1 }
    );
    expect(summary?.tweetId).toBe("123");
  });

  it("handles detailed X summary payloads", () => {
    const summary = coerceXSummaryFromSuccess(
      {
        outcomeCode: "passed",
        outcomeReason: "ok",
        ruleId: 1,
        tweetId: "123",
        rulePassed: false,
        tweetFound: false,
        ruleFound: false,
        persisted: true,
        llm: { gradeEvaluated: true, pass: true, reason: "good" },
        metadata: { authorId: "1", createdAt: null, isRepost: false },
      },
      { tweetId: "fallback", ruleId: 1 }
    );
    expect(summary?.tweetFound).toBe(false);
    expect(summary?.llm.gradeEvaluated).toBe(true);
  });

  it("returns null for invalid X summary", () => {
    expect(coerceXSummaryFromSuccess({}, { tweetId: "fallback", ruleId: 1 })).toBeNull();
  });

  it("returns null when X rulePassed is invalid", () => {
    expect(
      coerceXSummaryFromSuccess(
        {
          outcomeCode: "passed",
          outcomeReason: "ok",
          ruleId: 1,
          tweetId: "123",
          rulePassed: "yes",
        },
        { tweetId: "fallback", ruleId: 1 }
      )
    ).toBeNull();
  });

  it("defaults X rulePassed to false when missing", () => {
    const summary = coerceXSummaryFromSuccess(
      { outcomeCode: "passed", outcomeReason: "ok", ruleId: 1, tweetId: "123" },
      { tweetId: "fallback", ruleId: 1 }
    );
    expect(summary?.rulePassed).toBe(false);
  });

  it("extracts X summary from http error", () => {
    const error = Object.assign(
      new Error(
        'HTTP 400: {"outcomeCode":"passed","outcomeReason":"ok","tweetId":"123","ruleId":1,"rulePassed":true}'
      ),
      { status: 400 }
    );
    const summary = extractXSummaryFromError(error, { tweetId: "fallback", ruleId: 1 });
    expect(summary?.tweetId).toBe("123");
  });

  it("formats X rules error", () => {
    const message = formatXRulesError(
      Object.assign(new Error("missing mention @bob"), { status: 400 })
    );
    expect(message).toContain("Post not eligible");
  });

  it("executes clause definitions + adapters", () => {
    const farcasterClause = FARCASTER_CLAUSE_DEFINITIONS[0].build(["alice"]);
    expect(farcasterClause.type).toBe("mentionsAll");
    const farcasterEmbed = FARCASTER_CLAUSE_DEFINITIONS[1].build(["example.com"]);
    expect(farcasterEmbed.type).toBe("embedUrlPattern");
    const farcasterRoot = FARCASTER_CLAUSE_DEFINITIONS[2].build(["https://farcaster.xyz/channel"]);
    expect(farcasterRoot.type).toBe("rootParentUrl");

    const xMentions = X_CLAUSE_DEFINITIONS[0].build(["justcobuild"]);
    expect(xMentions.type).toBe("mentionsAll");
    const xClause = X_CLAUSE_DEFINITIONS[1].build(["example.com"]);
    expect(xClause.type).toBe("embedUrlPattern");

    expect(
      farcasterRulesAdapter.buildRequestBody({
        ruleId: 1,
        postRef: "0x" + "a".repeat(40),
        address: ALT_ADDRESS,
      })
    ).toMatchObject({ platform: "farcaster" });

    expect(
      farcasterRulesAdapter.createFallback({ ruleId: 9, postRef: "0x" + "b".repeat(40) })
    ).toEqual({ castHash: "0x" + "b".repeat(40), ruleId: 9 });

    expect(
      xRulesAdapter.buildRequestBody({
        ruleId: 1,
        postRef: "123",
        address: ALT_ADDRESS,
        authorUsername: "alice",
      })
    ).toMatchObject({ platform: "x" });

    expect(xRulesAdapter.createFallback({ ruleId: 2, postRef: "123" })).toEqual({
      tweetId: "123",
      ruleId: 2,
    });
  });

  it("coerces Farcaster summary", () => {
    const summary = coerceFarcasterSummaryFromSuccess(
      {
        outcomeCode: "passed",
        outcomeReason: "ok",
        ruleId: 1,
        castHash: "0x" + "a".repeat(40),
        rulePassed: true,
      },
      { castHash: "fallback", ruleId: 1 }
    );
    expect(summary?.rulePassed).toBe(true);
  });

  it("handles detailed Farcaster summary payloads", () => {
    const summary = coerceFarcasterSummaryFromSuccess(
      {
        outcomeCode: "passed",
        outcomeReason: "ok",
        ruleId: 1,
        castHash: "0x" + "a".repeat(40),
        rulePassed: false,
        tags: ["a", "b"],
        matchWhy: ["why"],
        metadata: { deleted: false, hasParent: true },
        semantic: { accepted: true, passes: 1, failures: 0 },
        llm: { gradeEvaluated: true, pass: true, reason: "good" },
        castFound: true,
        ruleFound: false,
        deterministicMatch: true,
        persisted: true,
        error: "oops",
      },
      { castHash: "fallback", ruleId: 1 }
    );
    expect(summary?.tags.length).toBe(2);
    expect(summary?.llm?.pass).toBe(true);
  });

  it("returns null for invalid Farcaster summary", () => {
    expect(coerceFarcasterSummaryFromSuccess({}, { castHash: "fallback", ruleId: 1 })).toBeNull();
  });

  it("returns null when Farcaster rulePassed is invalid", () => {
    expect(
      coerceFarcasterSummaryFromSuccess(
        {
          outcomeCode: "passed",
          outcomeReason: "ok",
          ruleId: 1,
          castHash: "0x1",
          rulePassed: "no",
        },
        { castHash: "fallback", ruleId: 1 }
      )
    ).toBeNull();
  });

  it("handles Farcaster summary with invalid metadata types", () => {
    const summary = coerceFarcasterSummaryFromSuccess(
      {
        outcomeCode: "passed",
        outcomeReason: "ok",
        ruleId: 1,
        castHash: "0x" + "a".repeat(40),
        rulePassed: true,
        metadata: "bad",
        semantic: 1,
        llm: "bad",
      },
      { castHash: "fallback", ruleId: 1 }
    );
    expect(summary?.metadata).toBeNull();
    expect(summary?.semantic).toBeNull();
    expect(summary?.llm).toBeNull();
  });

  it("extracts Farcaster summary from http error", () => {
    const error = Object.assign(
      new Error(
        'HTTP 400: {"outcomeCode":"passed","outcomeReason":"ok","castHash":"0x' +
          "a".repeat(40) +
          '","ruleId":1,"rulePassed":true}'
      ),
      { status: 400 }
    );
    const summary = extractFarcasterSummaryFromError(error, { castHash: "fallback", ruleId: 1 });
    expect(summary?.castHash.startsWith("0x")).toBe(true);
  });

  it("formats Farcaster rules error", () => {
    const message = formatFarcasterRulesError(
      Object.assign(new Error("missing link matching example.com"), { status: 400 })
    );
    expect(message).toContain("include a link to example.com");
  });
});
