import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/domains/goals/goal-data", () => ({
  getGlobalGoalEvents: vi.fn(),
}));

describe("events page prerender safety", () => {
  it("opts out of build-time prerendering", async () => {
    const pageModule = await import("./page");

    expect(pageModule.dynamic).toBe("force-dynamic");
  });
});
