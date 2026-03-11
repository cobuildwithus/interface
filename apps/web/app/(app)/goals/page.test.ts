import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/domains/goals/goal-data", () => ({
  getGoalCards: vi.fn(),
}));

describe("goals page prerender safety", () => {
  it("opts out of build-time prerendering", async () => {
    const pageModule = await import("./page");

    expect(pageModule.dynamic).toBe("force-dynamic");
  });
});
