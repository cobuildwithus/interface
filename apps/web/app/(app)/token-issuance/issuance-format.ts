export function toIssuancePrice(weight: number | null): number | null {
  if (!Number.isFinite(weight ?? NaN)) return null;
  const value = weight ?? 0;
  if (value <= 0) return null;
  const price = 1 / value;
  return Number.isFinite(price) ? price : null;
}

export function formatPriceValue(value: number | null): string {
  if (!Number.isFinite(value ?? NaN)) return "--";
  const safeValue = value ?? 0;
  const abs = Math.abs(safeValue);
  if (abs === 0) return "0";
  if (abs < 0.000001) return safeValue.toExponential(4);
  // Use toPrecision and parseFloat to trim trailing zeros
  if (abs < 1) return parseFloat(safeValue.toPrecision(4)).toString();
  if (abs < 100) return parseFloat(safeValue.toFixed(4)).toString();
  return safeValue.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatIssuancePrice(
  price: number | null,
  baseSymbol: string,
  tokenSymbol: string
): string {
  return `${formatPriceValue(price)} ${baseSymbol} / ${tokenSymbol}`;
}
