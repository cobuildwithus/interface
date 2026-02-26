import { describe, expect, it } from "vitest";
import { platformScopedRuleClausesSchema } from "@/lib/domains/rules/rules/clauses";

describe("platformScopedRuleClausesSchema", () => {
  it("defaults to empty arrays when omitted", () => {
    const parsed = platformScopedRuleClausesSchema.parse({});
    expect(parsed).toEqual({ farcaster: [], x: [] });
  });

  it("rejects duplicate clause types for farcaster", () => {
    const result = platformScopedRuleClausesSchema.safeParse({
      farcaster: [
        { type: "mentionsAll", usernames: ["alice"] },
        { type: "mentionsAll", usernames: ["bob"] },
      ],
      x: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join(".") === "farcaster.1.type");
      expect(issue?.message).toContain("Duplicate clause type");
    }
  });

  it("rejects duplicate clause types for x", () => {
    const result = platformScopedRuleClausesSchema.safeParse({
      farcaster: [],
      x: [
        { type: "mentionsAll", usernames: ["alice"] },
        { type: "mentionsAll", usernames: ["bob"] },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join(".") === "x.1.type");
      expect(issue?.message).toContain("Duplicate clause type");
    }
  });
});
