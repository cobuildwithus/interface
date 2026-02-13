import { describe, expect, it } from "vitest";
import { applyJbDaoCashoutFee, applyRevnetCashoutFee } from "./fees";

describe("juicebox fees", () => {
  it("applies cashout fees", () => {
    expect(applyRevnetCashoutFee(1000n)).toBe(975n);
    expect(applyJbDaoCashoutFee(2000n)).toBe(1950n);
  });
});
