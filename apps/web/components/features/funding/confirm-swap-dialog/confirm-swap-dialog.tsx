"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CobuildBadge } from "@/components/features/token/token-badge";
import { checkInsufficientBalance } from "@/lib/domains/token/onchain/swap-utils";
import { BUDGETS } from "./constants";
import { BudgetOption } from "./budget-option";
import type { ConfirmSwapDialogProps } from "./types";

export { BUDGETS } from "./constants";

export function ConfirmSwapDialog({
  open,
  onOpenChange,
  payAmount,
  userTokens,
  builderTokens,
  ethBalanceWei,
  isLoading,
  isSwapDisabled,
  onConfirm,
  onUserTokensChange,
}: ConfirmSwapDialogProps) {
  const openCount = useOpenCount(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm purchase</DialogTitle>
        </DialogHeader>
        <ConfirmSwapContent
          key={openCount}
          payAmount={payAmount}
          userTokens={userTokens}
          builderTokens={builderTokens}
          ethBalanceWei={ethBalanceWei}
          isLoading={isLoading}
          isSwapDisabled={isSwapDisabled}
          onConfirm={onConfirm}
          onUserTokensChange={onUserTokensChange}
        />
      </DialogContent>
    </Dialog>
  );
}

export type ConfirmSwapContentProps = Omit<ConfirmSwapDialogProps, "open" | "onOpenChange"> & {
  onBack?: () => void;
};

export function ConfirmSwapContent({
  payAmount,
  userTokens,
  ethBalanceWei,
  isLoading,
  isSwapDisabled,
  onConfirm,
  onUserTokensChange,
  onBack,
}: ConfirmSwapContentProps) {
  const [selectedBudgets, setSelectedBudgets] = useState<Set<string>>(
    () => new Set(BUDGETS.map((b) => b.id))
  );
  const [budgetsTouched, setBudgetsTouched] = useState(false);
  const [budgetsExpanded, setBudgetsExpanded] = useState(true);
  const [memo, setMemo] = useState("");

  const hasInsufficientBalance = useMemo(
    () => checkInsufficientBalance(payAmount, ethBalanceWei),
    [payAmount, ethBalanceWei]
  );

  const toggleBudget = (id: string) => {
    setBudgetsTouched(true);
    setSelectedBudgets((prev) => toggleBudgetSelection(prev, id));
  };

  const handleConfirm = () => {
    onConfirm(buildMemo(memo, budgetsTouched, selectedBudgets));
  };

  const isButtonDisabled = isLoading || hasInsufficientBalance || isSwapDisabled;

  return (
    <div className="space-y-3 pt-1">
      {onBack && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Confirm purchase</h3>
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Back
          </button>
        </div>
      )}

      <div className="bg-secondary/80 dark:bg-secondary/50 rounded-xl p-4">
        <div className="text-muted-foreground mb-3 font-mono text-xs tracking-wider uppercase">
          You receive
        </div>
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={userTokens}
            onChange={(e) => onUserTokensChange?.(e.target.value)}
            className="w-full min-w-0 border-none bg-transparent font-mono text-3xl font-bold tracking-tight outline-none focus:ring-0"
          />
          <CobuildBadge />
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setBudgetsExpanded((v) => !v)}
          className="group flex w-full cursor-pointer items-center justify-between px-1"
        >
          <div className="flex items-center gap-1.5">
            <Zap className="size-3 animate-pulse text-emerald-500" />
            <span className="text-muted-foreground text-xs font-medium">Builder splits</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/60 text-[11px]">
              {selectedBudgets.size === BUDGETS.length
                ? "All budgets"
                : `${selectedBudgets.size} of ${BUDGETS.length} budgets`}
            </span>
            <ChevronDown
              className={`text-muted-foreground/60 size-3.5 transition-transform ${budgetsExpanded ? "rotate-180" : ""}`}
            />
          </div>
        </button>
        {budgetsExpanded && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground/70 px-1 text-[11px]">
              Every purchase automatically mints new tokens for builders.
            </p>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {BUDGETS.map((budget) => (
                <BudgetOption
                  key={budget.id}
                  budget={budget}
                  isSelected={selectedBudgets.has(budget.id)}
                  onToggle={() => toggleBudget(budget.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Input
        type="text"
        className="h-11 text-sm"
        placeholder="Add a comment…"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        maxLength={256}
      />

      <Button
        className="bg-foreground text-background h-12 w-full text-base font-semibold transition-all hover:opacity-90"
        onClick={handleConfirm}
        disabled={isButtonDisabled}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Confirming…
          </>
        ) : hasInsufficientBalance ? (
          "Insufficient Balance"
        ) : (
          "Confirm purchase"
        )}
      </Button>
    </div>
  );
}

export function buildMemo(
  memo: string,
  budgetsTouched: boolean,
  selectedBudgets: Set<string>
): string {
  let finalMemo = "Joining the co.build";
  if (memo) {
    finalMemo += `. ${memo}`;
  }
  if (budgetsTouched && selectedBudgets.size > 0) {
    const names = BUDGETS.filter((b) => selectedBudgets.has(b.id)).map((b) => b.name.toLowerCase());
    const formatted =
      names.length === 1
        ? names[0]
        : names.length === 2
          ? `${names[0]} and ${names[1]}`
          : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
    const deptWord = names.length === 1 ? "department" : "departments";
    finalMemo += ` Funding cobuilders in the ${formatted} ${deptWord}.`;
  }
  return finalMemo;
}

export function toggleBudgetSelection(current: Set<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) {
    if (next.size > 1) next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

/**
 * Track how many times the dialog has opened, used as a key to reset state.
 * The setState in effect is intentional - we need to detect the false→true
 * transition and update the key to force a remount of inner content.
 */
function useOpenCount(open: boolean) {
  const [openCount, setOpenCount] = useState(0);
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenCount((count) => count + 1);
    }
    prevOpenRef.current = open;
  }, [open]);

  return openCount;
}
