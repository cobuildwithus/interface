import type { TimeRangeOption } from "@/components/ui/time-range-filter";
import type { RangeOption } from "./types";

export const RANGE_OPTIONS: RangeOption[] = [
  { label: "1M", years: 1 / 12, hours: 24 * 30 },
  { label: "6M", years: 0.5, hours: 24 * 30 * 6 },
  { label: "1Y", years: 1, hours: 24 * 365 },
  { label: "5Y", years: 5, hours: 24 * 365 * 5 },
  { label: "10Y", years: 10, hours: 24 * 365 * 10 },
  { label: "All", years: null, hours: null },
];

export const RANGE_TIME_OPTIONS: TimeRangeOption[] = RANGE_OPTIONS.map((option) => ({
  label: option.label,
  hours: option.hours,
}));
