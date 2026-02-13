/**
 * Pure utility functions for swap component logic
 * Extracted for testability
 */

type SwapButtonState =
  | "loading"
  | "not_ready"
  | "paused"
  | "insufficient_balance"
  | "unsupported_token"
  | "ready";

export const BUTTON_TEXT: Record<SwapButtonState, string> = {
  loading: "Processing…",
  not_ready: "Loading…",
  unsupported_token: "ETH Unavailable",
  paused: "Payments Paused",
  insufficient_balance: "Insufficient Balance",
  ready: "Buy $COBUILD",
};

/**
 * Validates that a string is a valid decimal number input
 * Accepts: empty string, digits, optional single decimal point
 * Examples: "", "0", "0.1", ".5", "123.456"
 */
export function isValidDecimalInput(value: string): boolean {
  if (value === "") return true;
  return /^\d*\.?\d*$/.test(value);
}

/**
 * Determines the button state based on various conditions
 */
export function getButtonState(params: {
  isPayLoading: boolean;
  isReady: boolean;
  isPaused: boolean;
  hasInsufficientBalance: boolean;
  isEthSupported?: boolean;
}): SwapButtonState {
  const { isPayLoading, isReady, isPaused, hasInsufficientBalance, isEthSupported = true } = params;

  if (isPayLoading) return "loading";
  if (!isReady) return "not_ready";
  if (!isEthSupported) return "unsupported_token";
  if (isPaused) return "paused";
  if (hasInsufficientBalance) return "insufficient_balance";
  return "ready";
}

/**
 * Checks if the user has insufficient balance for the payment
 */
export function checkInsufficientBalance(
  payAmount: string,
  balanceWei: bigint | undefined
): boolean {
  if (!payAmount || balanceWei === undefined) return false;
  try {
    // Parse the pay amount to wei (18 decimals)
    const [whole, fraction = ""] = payAmount.split(".");
    const paddedFraction = fraction.padEnd(18, "0").slice(0, 18);
    const payWei = BigInt(whole || "0") * 10n ** 18n + BigInt(paddedFraction);
    return payWei > balanceWei;
  } catch {
    return false;
  }
}

/**
 * Determines if the swap button should be disabled
 */
export function isSwapDisabled(buttonState: SwapButtonState, payAmount: string): boolean {
  if (buttonState !== "ready") return true;
  if (!payAmount) return true;
  const parsed = parseFloat(payAmount);
  return isNaN(parsed) || parsed <= 0;
}

/**
 * Calculates the maximum amount the user can swap, leaving a gas buffer
 */
export function calculateMaxAmount(balanceWei: bigint, gasBufferWei: bigint): string | null {
  const maxAmount = balanceWei - gasBufferWei;
  if (maxAmount <= 0n) return null;

  // Convert wei to ETH string
  const whole = maxAmount / 10n ** 18n;
  const remainder = maxAmount % 10n ** 18n;

  if (remainder === 0n) {
    return whole.toString();
  }

  // Format with up to 18 decimal places, trimming trailing zeros
  const remainderStr = remainder.toString().padStart(18, "0");
  const trimmed = remainderStr.replace(/0+$/, "");

  return `${whole}.${trimmed}`;
}
