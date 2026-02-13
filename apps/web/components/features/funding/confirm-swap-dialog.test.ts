import { describe, it, expect } from "vitest";
import {
  BUDGETS,
  buildMemo,
  toggleBudgetSelection,
} from "@/components/features/funding/confirm-swap-dialog/confirm-swap-dialog";

/**
 * Pure-logic tests for ConfirmSwapDialog helpers.
 * These ensure budget toggling and memo formatting stay in sync with the UI.
 */

describe("budget selection logic", () => {
  it("removes a selected budget when more than one remains", () => {
    const current = new Set(["protocol", "opensource"]);
    const next = toggleBudgetSelection(current, "protocol");
    expect(next.has("protocol")).toBe(false);
    expect(next.has("opensource")).toBe(true);
    expect(next.size).toBe(1);
  });

  it("adds a budget when not selected", () => {
    const current = new Set(["protocol"]);
    const next = toggleBudgetSelection(current, "opensource");
    expect(next.has("protocol")).toBe(true);
    expect(next.has("opensource")).toBe(true);
    expect(next.size).toBe(2);
  });

  it("does not allow deselecting the last remaining budget", () => {
    const current = new Set(["protocol"]);
    const next = toggleBudgetSelection(current, "protocol");
    expect(next.has("protocol")).toBe(true);
    expect(next.size).toBe(1);
  });
});

describe("memo building logic", () => {
  const allBudgetIds = new Set(BUDGETS.map((b) => b.id));

  it("adds user memo when budgets untouched", () => {
    const result = buildMemo("Hello world", false, allBudgetIds);
    expect(result).toBe("Joining the co.build. Hello world");
  });

  it("uses default memo when none provided", () => {
    const result = buildMemo("", false, allBudgetIds);
    expect(result).toBe("Joining the co.build");
  });

  it("appends funding clause with multiple budgets", () => {
    const result = buildMemo("My message", true, new Set(["protocol", "opensource"]));
    expect(result).toBe(
      "Joining the co.build. My message Funding cobuilders in the protocol and open source departments."
    );
  });

  it("appends funding clause with single budget", () => {
    const result = buildMemo("", true, new Set(["marketing"]));
    expect(result).toBe("Joining the co.build Funding cobuilders in the marketing department.");
  });

  it("handles empty selection when touched (no funding clause)", () => {
    const result = buildMemo("Comment", true, new Set());
    expect(result).toBe("Joining the co.build. Comment");
  });
});

describe("insufficient balance helper smoke test", () => {
  it("delegates to swap-utils implementation", async () => {
    const { checkInsufficientBalance } = await import("@/lib/domains/token/onchain/swap-utils");
    const ONE_ETH = BigInt(10 ** 18);
    expect(checkInsufficientBalance("1", ONE_ETH)).toBe(false);
    expect(checkInsufficientBalance("2", ONE_ETH)).toBe(true);
  });
});

describe("confirm button disabled state", () => {
  /**
   * Regression test for silent swap failure.
   * When user clears tokens in dialog, payAmount becomes empty,
   * isSwapDisabled becomes true, and confirm button must be disabled.
   */
  it("isSwapDisabled is true when payAmount is empty", async () => {
    const { isSwapDisabled } = await import("@/lib/domains/token/onchain/swap-utils");
    expect(isSwapDisabled("ready", "")).toBe(true);
    expect(isSwapDisabled("ready", "0")).toBe(true);
    expect(isSwapDisabled("ready", "0.0")).toBe(true);
  });

  it("isSwapDisabled is true for invalid amounts", async () => {
    const { isSwapDisabled } = await import("@/lib/domains/token/onchain/swap-utils");
    expect(isSwapDisabled("ready", "-1")).toBe(true);
    expect(isSwapDisabled("ready", "abc")).toBe(true);
  });

  it("isSwapDisabled is false only for valid positive amounts", async () => {
    const { isSwapDisabled } = await import("@/lib/domains/token/onchain/swap-utils");
    expect(isSwapDisabled("ready", "0.1")).toBe(false);
    expect(isSwapDisabled("ready", "1")).toBe(false);
  });
});
