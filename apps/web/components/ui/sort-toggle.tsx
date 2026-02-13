"use client";

import { cn } from "@/lib/shared/utils";

export type SortOption<T extends string> = {
  value: T;
  label: string;
};

type SortToggleProps<T extends string> = {
  options: SortOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function SortToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: SortToggleProps<T>) {
  return (
    <div className={cn("flex gap-0.5", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors",
            value === option.value
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
