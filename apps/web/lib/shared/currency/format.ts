const DEFAULT_LOCALE = "en-US";

type FormatOptions = {
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  compact?: boolean;
};

/**
 * Determines appropriate fraction digits based on amount.
 */
function getFractionDigits(amount: number): number {
  if (amount === 0) return 2;
  const abs = Math.abs(amount);
  if (abs < 0.01) return 4;
  if (abs < 0.1) return 3;
  if (abs < 5) return 2;
  if (abs < 10) return 1;
  return 0;
}

/**
 * Formats a USD value with appropriate precision.
 */
export function formatUsd(value: number, options: FormatOptions = {}): string {
  const { compact = false, maximumFractionDigits, minimumFractionDigits = 0 } = options;

  if (!Number.isFinite(value)) return "—";

  const fractionDigits = maximumFractionDigits ?? getFractionDigits(value);

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    compactDisplay: compact ? "short" : undefined,
    maximumFractionDigits: compact ? (Math.abs(value) >= 100 ? 1 : 2) : fractionDigits,
    minimumFractionDigits,
  }).format(value);
}

/**
 * Formats a token amount with K/M/B suffixes.
 */
export function formatTokenAmount(value: number): string {
  if (!Number.isFinite(value)) return "—";

  if (value >= 1_000_000_000) {
    const b = value / 1_000_000_000;
    return `${b.toFixed(b % 1 === 0 || b >= 10 ? 0 : 1)}B`;
  }
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m.toFixed(m % 1 === 0 || m >= 10 ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `${k.toFixed(k % 1 === 0 || k >= 10 ? 0 : 1)}K`;
  }
  return value.toFixed(getFractionDigits(value));
}

/**
 * Formats a token amount without compact suffixes.
 */
export function formatTokenAmountFull(value: number): string {
  if (!Number.isFinite(value)) return "—";

  const fractionDigits = getFractionDigits(value);

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    notation: "standard",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a percentage value.
 */
export function formatPercent(
  value: number,
  options: { maximumFractionDigits?: number; showSign?: boolean } = {}
): string {
  const { maximumFractionDigits = 2, showSign = false } = options;

  if (!Number.isFinite(value)) return "—";

  const formatted = new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "percent",
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value / 100);

  if (showSign && value > 0) return `+${formatted}`;
  return formatted;
}
