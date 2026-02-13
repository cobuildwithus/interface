/**
 * Token Issuance Quote Calculation
 *
 * Calculates how many project tokens a user receives for a given ETH payment.
 * Based on the JB ruleset weight and reserved percent.
 *
 * Formula:
 *   totalTokens = (weight × ethAmount) / 10^18
 *   reservedTokens = totalTokens × reservedPercent / 10000
 *   payerTokens = totalTokens - reservedTokens
 */

import { MAX_RESERVED_PERCENT, NATIVE_TOKEN_DECIMALS, JB_TOKEN_DECIMALS } from "./revnet";

interface TokenQuote {
  /** Tokens the payer receives */
  payerTokens: bigint;
  /** Tokens reserved for the project */
  reservedTokens: bigint;
  /** Total tokens minted */
  totalTokens: bigint;
}

/**
 * Calculate token issuance quote for ETH payment
 *
 * @param ethAmount - Amount of ETH in wei
 * @param weight - Ruleset weight (tokens per ETH unit, 18 decimals)
 * @param reservedPercent - Percent reserved (0-10000, where 10000 = 100%)
 * @returns Quote with payer tokens, reserved tokens, and total
 */
export function getTokenQuote(
  ethAmount: bigint,
  weight: bigint,
  reservedPercent: number
): TokenQuote {
  if (ethAmount === 0n || weight === 0n) {
    return { payerTokens: 0n, reservedTokens: 0n, totalTokens: 0n };
  }

  const weightRatio = 10n ** BigInt(NATIVE_TOKEN_DECIMALS);

  // totalTokens = (weight × ethAmount) / 10^18
  const totalTokens = (weight * ethAmount) / weightRatio;

  // reservedTokens = (weight × reservedPercent × ethAmount) / MAX_RESERVED_PERCENT / 10^18
  const reservedTokens =
    (weight * BigInt(reservedPercent) * ethAmount) / MAX_RESERVED_PERCENT / weightRatio;

  // payerTokens = totalTokens - reservedTokens
  const payerTokens = totalTokens - reservedTokens;

  return {
    payerTokens,
    reservedTokens,
    totalTokens,
  };
}

/**
 * Calculate ETH needed to receive a given amount of payer tokens (reverse quote)
 *
 * @param payerTokens - Desired tokens for the payer (18 decimals)
 * @param weight - Ruleset weight (tokens per ETH unit, 18 decimals)
 * @param reservedPercent - Percent reserved (0-10000, where 10000 = 100%)
 * @returns ETH amount in wei
 */
export function getEthForTokens(
  payerTokens: bigint,
  weight: bigint,
  reservedPercent: number
): bigint {
  if (payerTokens === 0n || weight === 0n) return 0n;

  const weightRatio = 10n ** BigInt(NATIVE_TOKEN_DECIMALS);
  // payerTokens = totalTokens × (1 - reservedPercent/10000)
  // totalTokens = payerTokens × 10000 / (10000 - reservedPercent)
  // ethAmount = totalTokens × 10^18 / weight
  const effectivePercent = MAX_RESERVED_PERCENT - BigInt(reservedPercent);
  if (effectivePercent === 0n) return 0n;

  const totalTokens = (payerTokens * MAX_RESERVED_PERCENT) / effectivePercent;
  return (totalTokens * weightRatio) / weight;
}

/**
 * Format token amount for display (18 decimals to human-readable)
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number = JB_TOKEN_DECIMALS,
  maxDecimals: number = 2
): string {
  if (amount === 0n) return "0";

  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;

  if (remainder === 0n) {
    return whole.toLocaleString();
  }

  // Convert remainder to decimal string with proper padding
  const remainderStr = remainder.toString().padStart(decimals, "0");
  const significantDecimals = remainderStr.slice(0, maxDecimals);

  // Remove trailing zeros
  const trimmed = significantDecimals.replace(/0+$/, "");

  if (!trimmed) {
    return whole.toLocaleString();
  }

  return `${whole.toLocaleString()}.${trimmed}`;
}
