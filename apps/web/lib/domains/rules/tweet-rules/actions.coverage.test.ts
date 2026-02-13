import { describe, expect, it, vi, beforeEach } from "vitest";

const runPlatformRulesServerCheckMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("@/lib/domains/rules/rules/core/check", () => ({
  runPlatformRulesServerCheck: (...args: Parameters<typeof runPlatformRulesServerCheckMock>) =>
    runPlatformRulesServerCheckMock(...args),
}));
vi.mock("@/lib/domains/rules/rules/platforms/registry", () => ({ xRulesAdapter: {} }));
vi.mock("@/lib/domains/auth/session", () => ({ getSession: () => getSessionMock() }));

import {
  checkTweetAgainstRule,
  runTweetRulesServerCheck,
} from "@/lib/domains/rules/tweet-rules/actions";

const ADDRESS = ("0x" + "a".repeat(40)) as `0x${string}`;

describe("checkTweetAgainstRule", () => {
  beforeEach(() => {
    runPlatformRulesServerCheckMock.mockReset();
    getSessionMock.mockReset();
  });

  it("validates inputs", async () => {
    const bad = await checkTweetAgainstRule({ ruleId: 0, tweetUrlOrId: "1" });
    expect(bad.ok).toBe(false);

    const missing = await checkTweetAgainstRule({ ruleId: 1, tweetUrlOrId: "" });
    expect(missing.ok).toBe(false);
  });

  it("requires session + twitter", async () => {
    getSessionMock.mockResolvedValue({ address: null, twitter: null });
    const result = await checkTweetAgainstRule({ ruleId: 1, tweetUrlOrId: "123" });
    expect(result.ok).toBe(false);

    getSessionMock.mockResolvedValue({ address: ADDRESS, twitter: null });
    const result2 = await checkTweetAgainstRule({ ruleId: 1, tweetUrlOrId: "123" });
    expect(result2.ok).toBe(false);

    getSessionMock.mockResolvedValue({
      address: ADDRESS,
      twitter: { username: "" },
    });
    const result3 = await checkTweetAgainstRule({ ruleId: 1, tweetUrlOrId: "123" });
    expect(result3.ok).toBe(false);

    getSessionMock.mockResolvedValue({
      address: ADDRESS,
      twitter: { username: "   " },
    });
    const result4 = await checkTweetAgainstRule({ ruleId: 1, tweetUrlOrId: "123" });
    expect(result4.ok).toBe(false);
  });

  it("returns rules result on success", async () => {
    getSessionMock.mockResolvedValue({
      address: ADDRESS,
      twitter: { username: "alice" },
    });
    runPlatformRulesServerCheckMock.mockResolvedValue({
      ok: true,
      data: {
        ruleId: 1,
        rulePassed: true,
        tweetId: "123",
        outcomeCode: "passed",
        outcomeReason: "ok",
      },
    });

    const result = await checkTweetAgainstRule({ ruleId: 1, tweetUrlOrId: "123" });
    expect(result.ok).toBe(true);
  });

  it("passes through rules API errors", async () => {
    getSessionMock.mockResolvedValue({
      address: ADDRESS,
      twitter: { username: "alice" },
    });
    runPlatformRulesServerCheckMock.mockResolvedValue({ ok: false, error: "boom" });

    const result = await checkTweetAgainstRule({ ruleId: 1, tweetUrlOrId: "123" });
    expect(result.ok).toBe(false);
  });

  it("validates internal runTweetRulesServerCheck inputs", async () => {
    const badRule = await runTweetRulesServerCheck({
      ruleId: 0,
      tweetUrlOrId: "123",
      address: ADDRESS,
      authorUsername: "alice",
    });
    expect(badRule.ok).toBe(false);

    const missingTweet = await runTweetRulesServerCheck({
      ruleId: 1,
      tweetUrlOrId: "  ",
      address: ADDRESS,
      authorUsername: "alice",
    });
    expect(missingTweet.ok).toBe(false);
  });
});
