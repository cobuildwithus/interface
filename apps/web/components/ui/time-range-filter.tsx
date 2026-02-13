"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TimeRangeOption = {
  label: string;
  hours: number | null; // null means "All", stored in hours for precision
};

type TimeRangeFilterProps = {
  options: TimeRangeOption[];
  value: TimeRangeOption;
  onChange: (option: TimeRangeOption) => void;
  /** Earliest timestamp in the data, used to filter out irrelevant short options */
  dataStartTime?: number;
  /** Latest timestamp in the data, used to compute data age deterministically */
  dataEndTime?: number;
  className?: string;
};

export function TimeRangeFilter({
  options,
  value,
  onChange,
  dataStartTime,
  dataEndTime,
  className,
}: TimeRangeFilterProps) {
  const availableOptions = useMemo(() => {
    if (!dataStartTime || !dataEndTime) return options;

    const dataAgeHours = (dataEndTime - dataStartTime) / (1000 * 60 * 60);

    // Only hide very short options (1H, 6H) for older revnets
    // Show 1H/6H only if data is less than 1 week old
    // Always show 1D and longer options
    return options.filter((opt) => {
      if (opt.hours === null) return true; // Always show "All"
      if (opt.hours >= 24) return true; // Always show 1D and longer
      // Show 1H/6H only for newer revnets (< 1 week old)
      return dataAgeHours < 24 * 7;
    });
  }, [options, dataStartTime, dataEndTime]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium transition",
            className
          )}
        >
          {value.label}
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-0 p-1">
        {availableOptions.map((option) => {
          const isActive = value.label === option.label;
          return (
            <DropdownMenuItem
              key={option.label}
              onSelect={() => onChange(option)}
              className={cn(
                "cursor-pointer rounded-md px-3 py-1.5 text-left text-xs font-medium transition",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Preset options for different use cases
export const TREASURY_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: "1H", hours: 1 },
  { label: "6H", hours: 6 },
  { label: "1D", hours: 24 },
  { label: "1W", hours: 24 * 7 },
  { label: "1M", hours: 24 * 30 },
  { label: "All", hours: null },
];

// Helper to filter data based on time range
export function filterDataByTimeRange<T extends { timestamp: number }>(
  data: T[],
  range: TimeRangeOption
): T[] {
  if (range.hours === null || data.length === 0) {
    return data;
  }

  const now = data[data.length - 1]!.timestamp;
  const cutoff = now - range.hours * 60 * 60 * 1000;

  // Find data points within range
  const filtered = data.filter((point) => point.timestamp >= cutoff);

  // If we have data before the cutoff, include the last point before it for continuity
  if (filtered.length > 0 && filtered.length < data.length) {
    const firstFilteredIndex = data.indexOf(filtered[0]!);
    if (firstFilteredIndex > 0) {
      return [data[firstFilteredIndex - 1]!, ...filtered];
    }
  }

  return filtered.length > 0 ? filtered : data;
}
