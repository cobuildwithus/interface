import { describe, it, expect } from "vitest";
import { buildGoalAiContextPrompt } from "@/lib/domains/goals/ai-context/prompt";

describe("goal-ai-context-prompt", () => {
  it("includes the endpoint and guidance text", () => {
    const prompt = buildGoalAiContextPrompt({ endpoint: "/api/cobuild/ai-context" });

    expect(prompt).toContain("Cobuild live stats");
    expect(prompt).toContain("/api/cobuild/ai-context");
    expect(prompt).toContain("data.baseAsset");
    expect(prompt).toContain("last24h");
    expect(prompt).toContain("last6h");
    expect(prompt).toContain("Treasury values are inflows only");
    expect(prompt).toContain("Risk note");
  });
});
