import { describe, expect, it } from "vitest";
import { ALLOWED_REACTIONS } from "./reaction-types";

describe("reaction-types", () => {
  it("exports expected reactions", () => {
    expect(ALLOWED_REACTIONS).toEqual(["like", "recast", "comment", "quote_cast", "follow"]);
  });
});
