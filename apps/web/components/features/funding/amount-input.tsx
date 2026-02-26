"use client";

import { Input } from "@/components/ui/input";
import { AuthButton } from "@/components/ui/auth-button";
import { cn } from "@/lib/shared/utils";

type QuickAmount = number | "max";

type AmountInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  quickAmounts?: readonly number[];
  maxAmount?: string;
  submitLabel: string;
  submitting?: boolean;
  disabled?: boolean;
  error?: string | null;
  className?: string;
  currencyLabel?: string;
  buttonPosition?: "inline" | "below";
};

export function AmountInput({
  value,
  onChange,
  onSubmit,
  quickAmounts = [5, 25, 50],
  maxAmount,
  submitLabel,
  submitting = false,
  disabled = false,
  error,
  className,
  currencyLabel,
  buttonPosition = "inline",
}: AmountInputProps) {
  const handleChange = (inputValue: string) => {
    const cleaned = inputValue.trim();
    if (cleaned === "") {
      onChange("");
      return;
    }
    if (!/^\d*\.?\d*$/.test(cleaned)) return;
    const [whole, fraction = ""] = cleaned.split(".");
    if (fraction.length > 2) return;
    onChange(cleaned === "." ? "0." : `${whole}${fraction ? "." + fraction : ""}`);
  };

  const selectAmount = (amount: QuickAmount) => {
    if (amount === "max" && maxAmount) {
      onChange(maxAmount);
    } else if (typeof amount === "number") {
      onChange(String(amount));
    }
  };

  const isSelected = (amount: QuickAmount) => {
    if (amount === "max") {
      return maxAmount && value === maxAmount;
    }
    return value === String(amount);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="border-border/60 bg-muted/30 flex flex-1 flex-col rounded-lg border p-4">
        <div className="text-muted-foreground/70 flex items-center justify-between text-[11px] tracking-widest uppercase">
          <span>Amount</span>
          {currencyLabel && <span>{currencyLabel}</span>}
        </div>
        <div className={cn("mt-3", buttonPosition === "inline" && "flex items-center gap-3")}>
          <div className={cn("relative", buttonPosition === "inline" && "flex-1")}>
            <span className="text-muted-foreground absolute top-1/2 left-0 -translate-y-1/2 text-2xl font-semibold">
              $
            </span>
            <Input
              type="text"
              inputMode="decimal"
              variant="amount"
              placeholder="0"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              className="pl-7 text-3xl"
            />
          </div>
          {buttonPosition === "inline" && (
            <AuthButton
              className="h-12 shrink-0 rounded-lg px-6 text-sm font-medium"
              onClick={onSubmit}
              disabled={disabled || submitting}
              connectLabel="Connect"
            >
              {submitting ? "..." : submitLabel}
            </AuthButton>
          )}
        </div>
        {/* Quick amounts */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => selectAmount(amount)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                isSelected(amount)
                  ? "border-foreground/20 bg-foreground/5 text-foreground"
                  : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              ${amount}
            </button>
          ))}
          {maxAmount && (
            <button
              type="button"
              onClick={() => selectAmount("max")}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                isSelected("max")
                  ? "border-foreground/20 bg-foreground/5 text-foreground"
                  : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              Max
            </button>
          )}
        </div>
        {buttonPosition === "below" && (
          <AuthButton
            variant="outline"
            className="mt-4 h-11 w-full rounded-lg text-sm font-medium"
            onClick={onSubmit}
            disabled={disabled || submitting}
            connectLabel="Connect"
          >
            {submitting ? "..." : submitLabel}
          </AuthButton>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
