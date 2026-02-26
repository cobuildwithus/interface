type Decimalish = {
  toNumber?: () => number;
  valueOf?: () => number | string | bigint | object;
  toFixed?: (digits?: number) => string;
  toString?: () => string;
};

export type Numberish = string | number | bigint | Decimalish | null | undefined;

/**
 * Safely converts various numeric types (bigint, Prisma Decimal, string) to a finite number.
 * Returns null if the value cannot be converted to a finite number.
 */
export function toFiniteNumber(value: Numberish): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  if (value && typeof value === "object") {
    const decimalish = value as Decimalish;
    if (typeof decimalish.toNumber === "function") {
      const num = decimalish.toNumber();
      return Number.isFinite(num) ? num : null;
    }
    if (typeof decimalish.valueOf === "function") {
      const raw = decimalish.valueOf();
      if (typeof raw === "number" || typeof raw === "string" || typeof raw === "bigint") {
        const num = Number(raw);
        return Number.isFinite(num) ? num : null;
      }
      return null;
    }
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Rounds a number to 2 decimal places (cents). Returns 0 for non-finite values.
 */
export function roundToCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/**
 * Converts a Prisma Decimal or other numeric value to a string.
 * Useful for serializing values that need to maintain precision.
 */
export function toDecimalString(value: Numberish): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return value.toString();
  if (value && typeof value === "object" && typeof value.toString === "function") {
    return String(value);
  }
  return "0";
}

/**
 * Converts a Prisma Decimal-ish or numeric value into a bigint safely.
 * Handles scientific notation and Decimal-like objects with toFixed(0).
 */
export function toBigIntSafe(value: Numberish): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (value && typeof value === "object" && typeof value.toFixed === "function") {
    const fixed = value.toFixed(0);
    if (/^-?\d+$/.test(fixed)) return BigInt(fixed);
  }

  const raw = toDecimalString(value);
  if (!raw) return 0n;
  if (/^-?\d+$/.test(raw)) return BigInt(raw);
  if (/e/i.test(raw)) {
    const match = raw.match(/^([+-]?)(\d+(?:\.\d+)?)[eE]([+-]?\d+)$/);
    if (match) {
      const sign = match[1] ?? "";
      const coefficient = match[2] ?? "";
      const exponent = Number(match[3]);
      if (Number.isFinite(exponent) && exponent >= 0) {
        const [whole, fraction = ""] = coefficient.split(".");
        const digits = `${whole}${fraction}`;
        const shift = exponent - fraction.length;
        if (shift >= 0) {
          const expanded = `${sign}${digits}${"0".repeat(shift)}`;
          if (/^-?\d+$/.test(expanded)) return BigInt(expanded);
        }
      }
    }
  }
  const trimmed = raw.match(/^(-?\d+)\.0+$/);
  return trimmed ? BigInt(trimmed[1]) : 0n;
}

/**
 * Converts a value from base units to a human-readable number with the given decimals.
 * E.g., wei (18 decimals) to ETH, or token base units to tokens.
 */
export function fromBaseUnits(value: Numberish, decimals: number): number {
  const num = toFiniteNumber(value);
  if (num === null) return 0;
  return num / Math.pow(10, decimals);
}
