import { describe, expect, it } from "vitest";
import { findDuplicateClauseTypes } from "@/lib/domains/rules/rules/unique-clause-types";

describe("findDuplicateClauseTypes", () => {
  it("returns empty array when there are no duplicates", () => {
    expect(findDuplicateClauseTypes([{ type: "a" }, { type: "b" }])).toEqual([]);
  });

  it("returns duplicates with first and current indices", () => {
    const duplicates = findDuplicateClauseTypes([
      { type: "mentionsAll" },
      { type: "embedUrlPattern" },
      { type: "mentionsAll" },
      { type: "mentionsAll" },
    ]);

    expect(duplicates).toEqual([
      { type: "mentionsAll", firstIndex: 0, index: 2 },
      { type: "mentionsAll", firstIndex: 0, index: 3 },
    ]);
  });
});
