export function formatDisplay(value: string, digits = 4) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return value;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(numberValue);
}

export function formatPercentValue(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

export function formatRepayWindow(years: number) {
  if (years < 1) {
    const months = Math.round(years * 12);
    return `${months} month${months === 1 ? "" : "s"}`;
  }
  return `${years} year${years === 1 ? "" : "s"}`;
}

export function normalizeAddress(value?: string) {
  return value?.toLowerCase();
}
