import { describe, expect, it } from "vitest";

import { usdc } from "@/lib/domains/token/usdc";

describe("usdc", () => {
  it("formats USDC values", () => {
    expect(usdc.format(123456n)).toBe("0.12");
  });

  it("parses USDC values", () => {
    expect(usdc.parse("1.25")).toBe(1250000n);
  });
});
