import { describe, expect, it, vi, beforeEach } from "vitest";

describe("rewriteRequirementsText", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it("throws when no API key configured", async () => {
    delete process.env.OPENAI_API_KEY;

    const { rewriteRequirementsText } = await import("@/lib/domains/rounds/cast-rules-ai");
    await expect(
      rewriteRequirementsText({
        roundTitle: "Round",
        currentRequirements: "req",
        moderatorNote: "note",
        castText: "text",
      })
    ).rejects.toThrow("OpenAI API key is not configured.");
  });

  it("returns rewritten text", async () => {
    process.env.OPENAI_API_KEY = "key";

    vi.doMock("@ai-sdk/openai", () => ({
      createOpenAI: () => () => "model",
    }));
    vi.doMock("ai", () => ({
      generateText: vi.fn().mockResolvedValue({ text: "- Cast must be relevant" }),
    }));

    const { rewriteRequirementsText } = await import("@/lib/domains/rounds/cast-rules-ai");
    const result = await rewriteRequirementsText({
      roundTitle: "Round",
      currentRequirements: "req",
      moderatorNote: "note",
      castText: "text",
    });

    expect(result).toBe("- Cast must be relevant");
  });

  it("throws when AI returns empty text", async () => {
    process.env.OPENAI_API_KEY = "key";

    vi.doMock("@ai-sdk/openai", () => ({
      createOpenAI: () => () => "model",
    }));
    vi.doMock("ai", () => ({
      generateText: vi.fn().mockResolvedValue({ text: "   " }),
    }));

    const { rewriteRequirementsText } = await import("@/lib/domains/rounds/cast-rules-ai");
    await expect(
      rewriteRequirementsText({
        roundTitle: null,
        currentRequirements: "req",
        moderatorNote: "note",
        castText: null,
      })
    ).rejects.toThrow("AI returned an empty requirements update.");
  });
});
