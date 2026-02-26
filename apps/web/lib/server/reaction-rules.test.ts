import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { listRulesForAddress, upsertRulesForAddress } = vi.hoisted(() => ({
  listRulesForAddress: vi.fn(),
  upsertRulesForAddress: vi.fn(),
}));

vi.mock("@/app/api/me/rules/queries", () => ({
  listRulesForAddress,
  upsertRulesForAddress,
}));

import { getReactionRulesForAddress, updateReactionRulesForAddress } from "./reaction-rules";

const reactionRow = (reaction: string, enabled = true, amount = "100") => ({
  reaction,
  enabled,
  amount,
});

describe("reaction-rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated reads", async () => {
    const result = await getReactionRulesForAddress(null);
    expect(result).toEqual({ ok: false, status: 401, error: "Unauthorized" });
  });

  it("filters invalid and duplicate reactions", async () => {
    listRulesForAddress.mockResolvedValueOnce([
      reactionRow("like"),
      reactionRow("like"),
      reactionRow("bad"),
    ]);

    const result = await getReactionRulesForAddress("0xabc");
    expect(result).toEqual({ ok: true, data: { rules: [reactionRow("like")] } });
  });

  it("handles list errors", async () => {
    listRulesForAddress.mockRejectedValueOnce(new Error("boom"));
    const result = await getReactionRulesForAddress("0xabc");
    expect(result).toEqual({ ok: false, status: 500, error: "Failed to fetch rules" });
  });

  it("rejects unauthenticated updates", async () => {
    const result = await updateReactionRulesForAddress(null, {});
    expect(result).toEqual({ ok: false, status: 401, error: "Unauthorized" });
  });

  it("rejects invalid body", async () => {
    const result = await updateReactionRulesForAddress("0xabc", "bad");
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid request body",
    });
  });

  it("rejects missing reactions", async () => {
    const result = await updateReactionRulesForAddress("0xabc", {});
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "reactions must be provided",
    });
  });

  it("rejects unknown reactions", async () => {
    const result = await updateReactionRulesForAddress("0xabc", {
      reactions: { nope: { enabled: true } },
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Unknown reaction: nope",
    });
  });

  it("rejects invalid reaction payloads", async () => {
    const result = await updateReactionRulesForAddress("0xabc", {
      reactions: { like: "bad" },
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid payload for reaction: like",
    });
  });

  it("rejects non-boolean enabled", async () => {
    const result = await updateReactionRulesForAddress("0xabc", {
      reactions: { like: { enabled: "yes" } },
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "enabled must be a boolean for reaction: like",
    });
  });

  it("rejects invalid amounts", async () => {
    const result = await updateReactionRulesForAddress("0xabc", {
      reactions: { like: { amount: "0.000001" } },
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "amount invalid for reaction like: amount below minimum of $0.05",
    });
  });

  it("no-ops when no updates are provided", async () => {
    const result = await updateReactionRulesForAddress("0xabc", {
      reactions: { like: {} },
    });
    expect(result).toEqual({ ok: true, data: { ok: true } });
    expect(upsertRulesForAddress).not.toHaveBeenCalled();
  });

  it("upserts valid reaction updates", async () => {
    const result = await updateReactionRulesForAddress("0xabc", {
      reactions: { like: { enabled: true, amount: "1.23" } },
    });

    expect(upsertRulesForAddress).toHaveBeenCalledWith("0xabc", [
      { reaction: "like", enabled: true, amountMicros: "1230000" },
    ]);
    expect(result).toEqual({ ok: true, data: { ok: true } });
  });
});
