import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { parseEntityId } = vi.hoisted(() => ({
  parseEntityId: vi.fn(),
}));

const { postRulesApiJson, RulesApiNotConfiguredError } = vi.hoisted(() => {
  class RulesApiNotConfiguredError extends Error {}
  return {
    postRulesApiJson: vi.fn(),
    RulesApiNotConfiguredError,
  };
});

const { formatRulesCheckError } = vi.hoisted(() => ({
  formatRulesCheckError: vi.fn(() => "formatted"),
}));

vi.mock("@/lib/shared/entity-id", () => ({ parseEntityId }));
vi.mock("@/lib/domains/rules/rules-api/post-json", () => ({
  postRulesApiJson,
  RulesApiNotConfiguredError,
}));
vi.mock("@/lib/domains/rules/rules-api/http-error-json", () => ({
  formatRulesCheckError,
}));
vi.mock("@/lib/domains/token/onchain/addresses", () => ({
  BASE_CHAIN_ID: 8453,
  contracts: { CobuildToken: "0x" + "a".repeat(40) },
}));

import { registerDirectIntent } from "./swaps-direct-intent";

const validTxHash = `0x${"b".repeat(64)}`;
const validAddress = `0x${"c".repeat(40)}`;

function mockEntity(platform: "farcaster" | "x" = "farcaster") {
  parseEntityId.mockReturnValueOnce({
    platform,
    entityId: "0x" + "d".repeat(40),
    queryAliases: [],
  });
}

describe("registerDirectIntent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    formatRulesCheckError.mockReturnValue("formatted");
  });

  it("rejects invalid JSON bodies", async () => {
    const result = await registerDirectIntent("nope");
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid JSON body." });
  });

  it("rejects invalid transaction hash", async () => {
    const result = await registerDirectIntent({ txHash: "0x123" });
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid transaction hash." });
  });

  it("rejects invalid token address", async () => {
    mockEntity();
    const result = await registerDirectIntent({
      txHash: validTxHash,
      tokenAddress: "0x123",
      entityId: "0x" + "d".repeat(40),
    });
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid token address." });
  });

  it("rejects invalid entityId", async () => {
    parseEntityId.mockReturnValueOnce(null);
    const result = await registerDirectIntent({
      txHash: validTxHash,
      tokenAddress: validAddress,
      entityId: "bad",
    });
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid entityId." });
  });

  it("rejects invalid chainId", async () => {
    mockEntity();
    const result = await registerDirectIntent({
      txHash: validTxHash,
      tokenAddress: validAddress,
      entityId: "0x" + "d".repeat(40),
      chainId: -1,
    });
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid chainId." });
  });

  it("rejects invalid recipient address", async () => {
    mockEntity();
    const result = await registerDirectIntent({
      txHash: validTxHash,
      tokenAddress: validAddress,
      entityId: "0x" + "d".repeat(40),
      recipient: "0x" + "1".repeat(8),
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid recipient address.",
    });
  });

  it("adds platform for x entities", async () => {
    mockEntity("x");
    postRulesApiJson.mockResolvedValueOnce({ ok: true });

    const result = await registerDirectIntent({
      txHash: validTxHash,
      tokenAddress: validAddress,
      entityId: "123456789",
    });

    expect(result.ok).toBe(true);
    expect(postRulesApiJson).toHaveBeenCalledWith(
      "/v1/swaps/direct-intent",
      expect.objectContaining({ platform: "x" })
    );
  });

  it("returns success with rules API response", async () => {
    mockEntity();
    postRulesApiJson.mockResolvedValueOnce({ ok: true, value: 123 });

    const result = await registerDirectIntent({
      txHash: validTxHash,
      tokenAddress: validAddress,
      entityId: "0x" + "d".repeat(40),
      recipient: validAddress,
    });

    expect(result).toEqual({ ok: true, data: { ok: true, value: 123 } });
  });

  it("handles RulesApiNotConfiguredError", async () => {
    mockEntity();
    postRulesApiJson.mockRejectedValueOnce(new RulesApiNotConfiguredError("no rules"));

    const result = await registerDirectIntent({
      txHash: validTxHash,
      tokenAddress: validAddress,
      entityId: "0x" + "d".repeat(40),
    });

    expect(result).toEqual({ ok: false, status: 500, error: "no rules" });
  });

  it("formats errors for other failures", async () => {
    mockEntity();
    const error = new Error("boom") as Error & { status?: number };
    error.status = 418;
    postRulesApiJson.mockRejectedValueOnce(error);

    const result = await registerDirectIntent({
      txHash: validTxHash,
      tokenAddress: validAddress,
      entityId: "0x" + "d".repeat(40),
    });

    expect(formatRulesCheckError).toHaveBeenCalled();
    expect(result).toEqual({ ok: false, status: 418, error: "formatted" });
  });
});
