import { describe, expect, it } from "vitest";

import { pluralize } from "@/lib/shared/text/pluralize";

describe("pluralize", () => {
  it("returns singular for count of 1 or -1", () => {
    expect(pluralize(1, "time")).toBe("time");
    expect(pluralize(-1, "time")).toBe("time");
  });

  it("returns plural for other counts", () => {
    expect(pluralize(0, "time")).toBe("times");
    expect(pluralize(2, "time")).toBe("times");
  });

  it("supports custom plural", () => {
    expect(pluralize(2, "person", "people")).toBe("people");
  });
});
