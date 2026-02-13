import { describe, expect, it } from "vitest";
import {
  isValidDecimalInput,
  getButtonState,
  checkInsufficientBalance,
  isSwapDisabled,
  calculateMaxAmount,
  BUTTON_TEXT,
} from "./swap-utils";

describe("isValidDecimalInput", () => {
  describe("valid inputs", () => {
    it("accepts empty string", () => {
      expect(isValidDecimalInput("")).toBe(true);
    });

    it("accepts whole numbers", () => {
      expect(isValidDecimalInput("0")).toBe(true);
      expect(isValidDecimalInput("1")).toBe(true);
      expect(isValidDecimalInput("123")).toBe(true);
      expect(isValidDecimalInput("999999")).toBe(true);
    });

    it("accepts decimal numbers", () => {
      expect(isValidDecimalInput("0.1")).toBe(true);
      expect(isValidDecimalInput("1.23")).toBe(true);
      expect(isValidDecimalInput("123.456789")).toBe(true);
    });

    it("accepts leading decimal", () => {
      expect(isValidDecimalInput(".5")).toBe(true);
      expect(isValidDecimalInput(".123")).toBe(true);
    });

    it("accepts trailing decimal", () => {
      expect(isValidDecimalInput("1.")).toBe(true);
      expect(isValidDecimalInput("123.")).toBe(true);
    });

    it("accepts just decimal point", () => {
      expect(isValidDecimalInput(".")).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects letters", () => {
      expect(isValidDecimalInput("abc")).toBe(false);
      expect(isValidDecimalInput("1a")).toBe(false);
      expect(isValidDecimalInput("a1")).toBe(false);
    });

    it("rejects multiple decimal points", () => {
      expect(isValidDecimalInput("1.2.3")).toBe(false);
      expect(isValidDecimalInput("..")).toBe(false);
    });

    it("rejects negative signs", () => {
      expect(isValidDecimalInput("-1")).toBe(false);
      expect(isValidDecimalInput("-1.5")).toBe(false);
    });

    it("rejects plus signs", () => {
      expect(isValidDecimalInput("+1")).toBe(false);
    });

    it("rejects spaces", () => {
      expect(isValidDecimalInput(" 1")).toBe(false);
      expect(isValidDecimalInput("1 ")).toBe(false);
      expect(isValidDecimalInput("1 .5")).toBe(false);
    });

    it("rejects special characters", () => {
      expect(isValidDecimalInput("1e5")).toBe(false);
      expect(isValidDecimalInput("1,000")).toBe(false);
    });
  });
});

describe("getButtonState", () => {
  it("returns loading when payment is in progress", () => {
    const result = getButtonState({
      isPayLoading: true,
      isReady: true,
      isEthSupported: true,
      isPaused: false,
      hasInsufficientBalance: false,
    });
    expect(result).toBe("loading");
  });

  it("returns not_ready when terminal is not ready", () => {
    const result = getButtonState({
      isPayLoading: false,
      isReady: false,
      isEthSupported: true,
      isPaused: false,
      hasInsufficientBalance: false,
    });
    expect(result).toBe("not_ready");
  });

  it("returns paused when payments are paused", () => {
    const result = getButtonState({
      isPayLoading: false,
      isReady: true,
      isEthSupported: false,
      isPaused: false,
      hasInsufficientBalance: false,
    });
    expect(result).toBe("unsupported_token");
  });

  it("returns paused when payments are paused", () => {
    const result = getButtonState({
      isPayLoading: false,
      isReady: true,
      isEthSupported: true,
      isPaused: true,
      hasInsufficientBalance: false,
    });
    expect(result).toBe("paused");
  });

  it("returns insufficient_balance when balance is too low", () => {
    const result = getButtonState({
      isPayLoading: false,
      isReady: true,
      isEthSupported: true,
      isPaused: false,
      hasInsufficientBalance: true,
    });
    expect(result).toBe("insufficient_balance");
  });

  it("returns ready when all conditions are met", () => {
    const result = getButtonState({
      isPayLoading: false,
      isReady: true,
      isEthSupported: true,
      isPaused: false,
      hasInsufficientBalance: false,
    });
    expect(result).toBe("ready");
  });

  describe("priority order", () => {
    it("loading takes priority over all other states", () => {
      const result = getButtonState({
        isPayLoading: true,
        isReady: false,
        isEthSupported: false,
        isPaused: true,
        hasInsufficientBalance: true,
      });
      expect(result).toBe("loading");
    });

    it("not_ready takes priority over paused", () => {
      const result = getButtonState({
        isPayLoading: false,
        isReady: false,
        isEthSupported: false,
        isPaused: true,
        hasInsufficientBalance: true,
      });
      expect(result).toBe("not_ready");
    });

    it("unsupported token takes priority over paused", () => {
      const result = getButtonState({
        isPayLoading: false,
        isReady: true,
        isEthSupported: false,
        isPaused: true,
        hasInsufficientBalance: true,
      });
      expect(result).toBe("unsupported_token");
    });

    it("paused takes priority over insufficient_balance", () => {
      const result = getButtonState({
        isPayLoading: false,
        isReady: true,
        isEthSupported: true,
        isPaused: true,
        hasInsufficientBalance: true,
      });
      expect(result).toBe("paused");
    });
  });
});

describe("checkInsufficientBalance", () => {
  const ONE_ETH = BigInt(10 ** 18);

  describe("returns false for edge cases", () => {
    it("returns false when payAmount is empty", () => {
      expect(checkInsufficientBalance("", ONE_ETH)).toBe(false);
    });

    it("returns false when balance is undefined", () => {
      expect(checkInsufficientBalance("1", undefined)).toBe(false);
    });

    it("returns false for invalid pay amount", () => {
      expect(checkInsufficientBalance("abc", ONE_ETH)).toBe(false);
    });
  });

  describe("balance comparison", () => {
    it("returns false when balance equals pay amount", () => {
      expect(checkInsufficientBalance("1", ONE_ETH)).toBe(false);
    });

    it("returns false when balance exceeds pay amount", () => {
      expect(checkInsufficientBalance("0.5", ONE_ETH)).toBe(false);
    });

    it("returns true when pay amount exceeds balance", () => {
      expect(checkInsufficientBalance("2", ONE_ETH)).toBe(true);
    });

    it("handles small decimal differences", () => {
      const balance = ONE_ETH + BigInt(10 ** 16); // 1.01 ETH
      expect(checkInsufficientBalance("1.02", balance)).toBe(true);
      expect(checkInsufficientBalance("1.01", balance)).toBe(false);
    });

    it("handles very small amounts", () => {
      const smallBalance = BigInt(10 ** 15); // 0.001 ETH
      expect(checkInsufficientBalance("0.001", smallBalance)).toBe(false);
      expect(checkInsufficientBalance("0.002", smallBalance)).toBe(true);
    });

    it("handles leading zero amounts", () => {
      expect(checkInsufficientBalance("0.5", ONE_ETH)).toBe(false);
      expect(checkInsufficientBalance(".5", ONE_ETH)).toBe(false);
    });
  });

  describe("precision handling", () => {
    it("handles amounts with many decimal places", () => {
      const balance = BigInt("1234567890123456789"); // ~1.23 ETH
      expect(checkInsufficientBalance("1.234567890123456789", balance)).toBe(false);
      expect(checkInsufficientBalance("1.234567890123456790", balance)).toBe(true);
    });
  });
});

describe("isSwapDisabled", () => {
  it("returns true when button state is not ready", () => {
    expect(isSwapDisabled("loading", "1")).toBe(true);
    expect(isSwapDisabled("not_ready", "1")).toBe(true);
    expect(isSwapDisabled("paused", "1")).toBe(true);
    expect(isSwapDisabled("insufficient_balance", "1")).toBe(true);
  });

  it("returns true when payAmount is empty", () => {
    expect(isSwapDisabled("ready", "")).toBe(true);
  });

  it("returns true when payAmount is zero", () => {
    expect(isSwapDisabled("ready", "0")).toBe(true);
    expect(isSwapDisabled("ready", "0.0")).toBe(true);
    expect(isSwapDisabled("ready", "0.00")).toBe(true);
  });

  it("returns true when payAmount is not a valid number", () => {
    expect(isSwapDisabled("ready", "abc")).toBe(true);
    expect(isSwapDisabled("ready", ".")).toBe(true);
  });

  it("returns false when ready with valid positive amount", () => {
    expect(isSwapDisabled("ready", "1")).toBe(false);
    expect(isSwapDisabled("ready", "0.01")).toBe(false);
    expect(isSwapDisabled("ready", ".5")).toBe(false);
    expect(isSwapDisabled("ready", "100.123")).toBe(false);
  });
});

describe("calculateMaxAmount", () => {
  const ONE_ETH = BigInt(10 ** 18);
  const GAS_BUFFER = BigInt(10 ** 15); // 0.001 ETH

  it("returns null when balance is less than gas buffer", () => {
    expect(calculateMaxAmount(GAS_BUFFER - 1n, GAS_BUFFER)).toBe(null);
    expect(calculateMaxAmount(0n, GAS_BUFFER)).toBe(null);
  });

  it("returns null when balance equals gas buffer", () => {
    expect(calculateMaxAmount(GAS_BUFFER, GAS_BUFFER)).toBe(null);
  });

  it("returns whole number without decimals", () => {
    const balance = ONE_ETH + GAS_BUFFER;
    expect(calculateMaxAmount(balance, GAS_BUFFER)).toBe("1");
  });

  it("returns decimal amount with trailing zeros trimmed", () => {
    const balance = ONE_ETH + BigInt(10 ** 17) + GAS_BUFFER; // 1.1 ETH + buffer
    expect(calculateMaxAmount(balance, GAS_BUFFER)).toBe("1.1");
  });

  it("handles small amounts correctly", () => {
    const balance = BigInt(10 ** 16) + GAS_BUFFER; // 0.01 ETH + buffer
    expect(calculateMaxAmount(balance, GAS_BUFFER)).toBe("0.01");
  });

  it("preserves full precision without trailing zeros", () => {
    const balance = BigInt("1234567890123456789") + GAS_BUFFER;
    const result = calculateMaxAmount(balance, GAS_BUFFER);
    expect(result).toBe("1.234567890123456789");
  });
});

describe("BUTTON_TEXT", () => {
  it("has text for all states", () => {
    expect(BUTTON_TEXT.loading).toBe("Processing…");
    expect(BUTTON_TEXT.not_ready).toBe("Loading…");
    expect(BUTTON_TEXT.paused).toBe("Payments Paused");
    expect(BUTTON_TEXT.insufficient_balance).toBe("Insufficient Balance");
    expect(BUTTON_TEXT.ready).toBe("Buy $COBUILD");
  });
});
