"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import type { Budget } from "./constants";

type BudgetOptionProps = {
  budget: Budget;
  isSelected: boolean;
  onToggle: () => void;
};

export function BudgetOption({ budget, isSelected, onToggle }: BudgetOptionProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border p-2.5 text-left transition-all",
        "hover:border-blue-500/50",
        isSelected ? "border-blue-500/40 bg-blue-500/5" : "border-border bg-background opacity-60"
      )}
    >
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">{budget.name}</span>
        <div className="text-muted-foreground mt-0.5 text-[11px]">{budget.description}</div>
      </div>
      <div
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          isSelected ? "border-blue-500 bg-blue-500" : "border-muted-foreground/30"
        )}
      >
        {isSelected && <Check className="size-2.5 text-white" strokeWidth={3} />}
      </div>
    </button>
  );
}
