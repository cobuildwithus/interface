import { describe, expect, it } from "vitest";
import { RAISE_1M_GOAL_SCOPE, buildCreatePostHref, resolveGoalScope } from "./goal-scopes";
import { formatUsd, RAISE_1M_GOAL, RAISE_1M_RAISED } from "./raise-1m";

describe("resolveGoalScope", () => {
  it("returns the known goal for the raise-1-mil url", () => {
    const goal = resolveGoalScope(RAISE_1M_GOAL_SCOPE.url);
    expect(goal).toEqual(RAISE_1M_GOAL_SCOPE);
  });

  it("normalizes trailing slashes", () => {
    const goal = resolveGoalScope(`${RAISE_1M_GOAL_SCOPE.url}/`);
    expect(goal).toEqual(RAISE_1M_GOAL_SCOPE);
  });

  it("derives a label for unknown goal urls", () => {
    const goal = resolveGoalScope("https://co.build/new-goal");
    expect(goal).toEqual({ label: "New Goal", url: "https://co.build/new-goal" });
  });

  it("returns null for invalid urls", () => {
    expect(resolveGoalScope("not-a-url")).toBeNull();
    expect(resolveGoalScope("ftp://co.build/goal")).toBeNull();
    expect(resolveGoalScope("   ")).toBeNull();
    expect(resolveGoalScope(null)).toBeNull();
  });

  it("falls back to the hostname for root paths", () => {
    expect(resolveGoalScope("https://co.build/")).toEqual({
      label: "co.build",
      url: "https://co.build",
    });
  });
});

describe("raise-1m goal helpers", () => {
  it("formats USD amounts", () => {
    expect(formatUsd(125000)).toBe("$125,000");
  });

  it("exposes goal constants", () => {
    expect(RAISE_1M_RAISED).toBe(84_250);
    expect(RAISE_1M_GOAL).toBe(1_000_000);
  });
});

describe("buildCreatePostHref", () => {
  it("returns a base path when goal scope is missing", () => {
    expect(buildCreatePostHref()).toBe("/create-post");
  });

  it("includes the embedUrl when goal scope is provided", () => {
    expect(buildCreatePostHref(RAISE_1M_GOAL_SCOPE)).toBe(
      "/create-post?embedUrl=https%3A%2F%2Fco.build%2Fraise-1-mil"
    );
  });
});
