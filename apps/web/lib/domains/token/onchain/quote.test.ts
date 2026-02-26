import { describe, expect, it } from "vitest";
import { getTokenQuote, getEthForTokens, formatTokenAmount } from "./quote";

describe("getTokenQuote", () => {
  const ONE_ETH = BigInt(10 ** 18);
  // Common weight: 1_000_000 tokens per ETH (scaled by 10^18)
  const STANDARD_WEIGHT = BigInt(1_000_000) * ONE_ETH;

  describe("zero inputs", () => {
    it("returns all zeros when ethAmount is 0", () => {
      const result = getTokenQuote(0n, STANDARD_WEIGHT, 1000);
      expect(result).toEqual({
        payerTokens: 0n,
        reservedTokens: 0n,
        totalTokens: 0n,
      });
    });

    it("returns all zeros when weight is 0", () => {
      const result = getTokenQuote(ONE_ETH, 0n, 1000);
      expect(result).toEqual({
        payerTokens: 0n,
        reservedTokens: 0n,
        totalTokens: 0n,
      });
    });

    it("returns all zeros when both are 0", () => {
      const result = getTokenQuote(0n, 0n, 0);
      expect(result).toEqual({
        payerTokens: 0n,
        reservedTokens: 0n,
        totalTokens: 0n,
      });
    });
  });

  describe("reserved percent edge cases", () => {
    it("0% reserved gives all tokens to payer", () => {
      const result = getTokenQuote(ONE_ETH, STANDARD_WEIGHT, 0);
      expect(result.totalTokens).toBe(BigInt(1_000_000) * ONE_ETH);
      expect(result.reservedTokens).toBe(0n);
      expect(result.payerTokens).toBe(result.totalTokens);
    });

    it("100% reserved (10000) gives no tokens to payer", () => {
      const result = getTokenQuote(ONE_ETH, STANDARD_WEIGHT, 10000);
      expect(result.totalTokens).toBe(BigInt(1_000_000) * ONE_ETH);
      expect(result.reservedTokens).toBe(result.totalTokens);
      expect(result.payerTokens).toBe(0n);
    });

    it("50% reserved (5000) splits tokens evenly", () => {
      const result = getTokenQuote(ONE_ETH, STANDARD_WEIGHT, 5000);
      const expectedTotal = BigInt(1_000_000) * ONE_ETH;
      const expectedReserved = expectedTotal / 2n;
      expect(result.totalTokens).toBe(expectedTotal);
      expect(result.reservedTokens).toBe(expectedReserved);
      expect(result.payerTokens).toBe(expectedTotal - expectedReserved);
    });

    it("10% reserved (1000) reserves 10% of tokens", () => {
      const result = getTokenQuote(ONE_ETH, STANDARD_WEIGHT, 1000);
      const expectedTotal = BigInt(1_000_000) * ONE_ETH;
      const expectedReserved = expectedTotal / 10n;
      expect(result.totalTokens).toBe(expectedTotal);
      expect(result.reservedTokens).toBe(expectedReserved);
      expect(result.payerTokens).toBe(expectedTotal - expectedReserved);
    });
  });

  describe("formula verification", () => {
    it("matches documented formula: totalTokens = (weight × ethAmount) / 10^18", () => {
      const ethAmount = BigInt(5) * ONE_ETH; // 5 ETH
      const weight = BigInt(2_000) * ONE_ETH; // 2000 tokens per ETH
      const result = getTokenQuote(ethAmount, weight, 0);

      // totalTokens should be 5 * 2000 = 10000 tokens
      expect(result.totalTokens).toBe(BigInt(10_000) * ONE_ETH);
    });

    it("calculates payer tokens as totalTokens - reservedTokens", () => {
      const result = getTokenQuote(ONE_ETH, STANDARD_WEIGHT, 2500);
      expect(result.payerTokens).toBe(result.totalTokens - result.reservedTokens);
    });
  });

  describe("fractional ETH amounts", () => {
    it("handles 0.5 ETH correctly", () => {
      const halfEth = ONE_ETH / 2n;
      const result = getTokenQuote(halfEth, STANDARD_WEIGHT, 0);
      expect(result.totalTokens).toBe(BigInt(500_000) * ONE_ETH);
    });

    it("handles 0.001 ETH correctly", () => {
      const smallAmount = BigInt(10 ** 15); // 0.001 ETH
      const result = getTokenQuote(smallAmount, STANDARD_WEIGHT, 0);
      expect(result.totalTokens).toBe(BigInt(1_000) * ONE_ETH);
    });

    it("handles 1 wei", () => {
      const result = getTokenQuote(1n, STANDARD_WEIGHT, 0);
      // 1 wei with standard weight = 1_000_000 tokens (in wei)
      expect(result.totalTokens).toBe(BigInt(1_000_000));
    });
  });

  describe("large values", () => {
    it("handles large ETH amounts without overflow", () => {
      const largeEth = BigInt(1_000_000) * ONE_ETH; // 1M ETH
      const result = getTokenQuote(largeEth, STANDARD_WEIGHT, 1000);
      expect(result.totalTokens).toBe(BigInt(10 ** 12) * ONE_ETH);
      expect(result.payerTokens + result.reservedTokens).toBe(result.totalTokens);
    });

    it("handles large weights", () => {
      const largeWeight = BigInt(10 ** 12) * ONE_ETH; // 1 trillion tokens per ETH
      const result = getTokenQuote(ONE_ETH, largeWeight, 0);
      expect(result.totalTokens).toBe(BigInt(10 ** 12) * ONE_ETH);
    });
  });
});

describe("getEthForTokens", () => {
  const ONE_ETH = BigInt(10 ** 18);
  const STANDARD_WEIGHT = BigInt(1_000_000) * ONE_ETH;

  describe("zero inputs", () => {
    it("returns 0 when payerTokens is 0", () => {
      expect(getEthForTokens(0n, STANDARD_WEIGHT, 1000)).toBe(0n);
    });

    it("returns 0 when weight is 0", () => {
      expect(getEthForTokens(ONE_ETH, 0n, 1000)).toBe(0n);
    });

    it("returns 0 when 100% reserved", () => {
      expect(getEthForTokens(ONE_ETH, STANDARD_WEIGHT, 10000)).toBe(0n);
    });
  });

  describe("reverse of getTokenQuote", () => {
    it("reverses correctly with 0% reserved", () => {
      const ethAmount = ONE_ETH;
      const quote = getTokenQuote(ethAmount, STANDARD_WEIGHT, 0);
      const reversed = getEthForTokens(quote.payerTokens, STANDARD_WEIGHT, 0);
      expect(reversed).toBe(ethAmount);
    });

    it("reverses correctly with 10% reserved", () => {
      const ethAmount = ONE_ETH;
      const quote = getTokenQuote(ethAmount, STANDARD_WEIGHT, 1000);
      const reversed = getEthForTokens(quote.payerTokens, STANDARD_WEIGHT, 1000);
      expect(reversed).toBe(ethAmount);
    });

    it("reverses correctly with 50% reserved", () => {
      const ethAmount = ONE_ETH;
      const quote = getTokenQuote(ethAmount, STANDARD_WEIGHT, 5000);
      const reversed = getEthForTokens(quote.payerTokens, STANDARD_WEIGHT, 5000);
      expect(reversed).toBe(ethAmount);
    });

    it("reverses correctly with fractional ETH", () => {
      const ethAmount = BigInt(10 ** 17); // 0.1 ETH
      const quote = getTokenQuote(ethAmount, STANDARD_WEIGHT, 1000);
      const reversed = getEthForTokens(quote.payerTokens, STANDARD_WEIGHT, 1000);
      expect(reversed).toBe(ethAmount);
    });
  });
});

describe("formatTokenAmount", () => {
  const ONE_TOKEN = BigInt(10 ** 18);

  describe("zero handling", () => {
    it('returns "0" for zero amount', () => {
      expect(formatTokenAmount(0n)).toBe("0");
    });
  });

  describe("whole numbers", () => {
    it("formats whole numbers without decimals", () => {
      expect(formatTokenAmount(ONE_TOKEN)).toBe("1");
      expect(formatTokenAmount(BigInt(100) * ONE_TOKEN)).toBe("100");
    });

    it("formats large numbers with thousand separators", () => {
      expect(formatTokenAmount(BigInt(1_000_000) * ONE_TOKEN)).toBe("1,000,000");
      expect(formatTokenAmount(BigInt(1_234_567) * ONE_TOKEN)).toBe("1,234,567");
    });
  });

  describe("decimal handling", () => {
    it("includes decimals up to maxDecimals (default 2)", () => {
      const amount = ONE_TOKEN + BigInt(10 ** 16); // 1.01 tokens
      expect(formatTokenAmount(amount)).toBe("1.01");
    });

    it("removes trailing zeros from decimals", () => {
      const amount = ONE_TOKEN + BigInt(10 ** 17); // 1.10 tokens
      expect(formatTokenAmount(amount)).toBe("1.1");
    });

    it("removes all zeros when only zeros in decimal portion", () => {
      const amount = ONE_TOKEN; // exactly 1 token
      expect(formatTokenAmount(amount)).toBe("1");
    });

    it("respects custom maxDecimals", () => {
      const amount = ONE_TOKEN + BigInt(123456) * BigInt(10 ** 12); // 1.123456
      expect(formatTokenAmount(amount, 18, 4)).toBe("1.1234");
      expect(formatTokenAmount(amount, 18, 6)).toBe("1.123456");
      expect(formatTokenAmount(amount, 18, 1)).toBe("1.1");
    });
  });

  describe("custom decimals", () => {
    it("handles tokens with 6 decimals (like USDC)", () => {
      const oneUsdc = BigInt(10 ** 6);
      expect(formatTokenAmount(oneUsdc, 6)).toBe("1");
      expect(formatTokenAmount(oneUsdc + BigInt(500000), 6)).toBe("1.5");
    });

    it("handles tokens with 8 decimals", () => {
      const amount = BigInt(10 ** 8) + BigInt(12345678);
      expect(formatTokenAmount(amount, 8, 4)).toBe("1.1234");
    });
  });

  describe("small amounts", () => {
    it("shows small decimals correctly", () => {
      const amount = BigInt(10 ** 16); // 0.01 tokens
      expect(formatTokenAmount(amount)).toBe("0.01");
    });

    it("truncates very small amounts to maxDecimals", () => {
      const amount = BigInt(10 ** 10); // 0.00000001 tokens
      expect(formatTokenAmount(amount)).toBe("0");
      expect(formatTokenAmount(amount, 18, 10)).toBe("0.00000001");
    });
  });

  describe("edge cases", () => {
    it("handles amount just under 1 token", () => {
      const amount = ONE_TOKEN - 1n;
      // This should be 0.999... but truncated to 2 decimals = 0.99
      expect(formatTokenAmount(amount)).toBe("0.99");
    });

    it("handles very large amounts with decimals", () => {
      const amount = BigInt(1_000_000_000) * ONE_TOKEN + BigInt(10 ** 17);
      expect(formatTokenAmount(amount)).toBe("1,000,000,000.1");
    });

    it("handles 0 decimals parameter", () => {
      const amount = ONE_TOKEN + BigInt(5 * 10 ** 17);
      expect(formatTokenAmount(amount, 18, 0)).toBe("1");
    });
  });
});
