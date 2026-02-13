"use client";

import { cn } from "@/lib/shared/utils";

type ToggleOption<T extends string> = {
  value: T;
  label: string;
  activeClassName: string;
};

type ToggleButtonGroupProps<T extends string> = {
  label: string;
  description: string;
  value: T;
  onChange: (value: T) => void;
  options: ToggleOption<T>[];
};

export function ToggleButtonGroup<T extends string>({
  label,
  description,
  value,
  onChange,
  options,
}: ToggleButtonGroupProps<T>) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              value === option.value
                ? option.activeClassName
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Pre-configured variants for common use cases
export const STATUS_OPTIONS = [
  {
    value: "open" as const,
    label: "Open",
    activeClassName: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  {
    value: "draft" as const,
    label: "Draft",
    activeClassName: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
];
