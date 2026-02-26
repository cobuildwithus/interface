"use client";

import { useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { FundWithCoinbase } from "@/components/features/funding/fund-with-coinbase";

type AddMoreFundsProps = {
  className?: string;
};

export function AddMoreFunds({ className }: AddMoreFundsProps) {
  const [showAddFunds, setShowAddFunds] = useState(false);

  return (
    <div className={cn("border-border/40 bg-card/50 rounded-xl border", className)}>
      <button
        onClick={() => setShowAddFunds(!showAddFunds)}
        className="flex w-full items-center justify-between p-4 text-sm"
      >
        <span className="text-muted-foreground flex items-center gap-2 font-medium">
          <Plus className="h-4 w-4" />
          Add more funds
        </span>
        <ChevronDown
          className={cn(
            "text-muted-foreground h-4 w-4 transition-transform duration-200",
            showAddFunds && "rotate-180"
          )}
        />
      </button>
      {showAddFunds && (
        <div className="border-border/40 border-t p-4">
          <FundWithCoinbase />
        </div>
      )}
    </div>
  );
}
