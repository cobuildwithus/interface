"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Heart, MessageSquare, Minus, Plus, RefreshCcw, Repeat2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/shared/utils";
import { DEFAULT_RULE_AMOUNTS_USD, type ReactionType } from "./rules-types";

const MIN_AMOUNT = 0.05;
const STEP_AMOUNT = 0.1;

const REACTION_META: Record<ReactionType, { label: string; icon: ReactNode }> = {
  like: {
    label: "Like",
    icon: <Heart className="size-4" />,
  },
  recast: {
    label: "Repost",
    icon: <Repeat2 className="size-4" />,
  },
  comment: {
    label: "Comment",
    icon: <MessageSquare className="size-4" />,
  },
  quote_cast: {
    label: "Quote",
    icon: <RefreshCcw className="size-4" />,
  },
  follow: {
    label: "Follow",
    icon: <User className="size-4" />,
  },
};

type RulesConfigItemProps = {
  type: ReactionType;
  enabled: boolean;
  amount: string;
  onEnabledChange: (enabled: boolean) => void;
  onAmountChange: (amount: string) => void;
  disabled?: boolean;
};

export function RulesConfigItem({
  type,
  enabled,
  amount,
  onEnabledChange,
  onAmountChange,
  disabled = false,
}: RulesConfigItemProps) {
  const parsedInitial = normalizeAmount(amount, DEFAULT_RULE_AMOUNTS_USD[type]);
  const [inputValue, setInputValue] = useState(() => parsedInitial.toString());

  useEffect(() => {
    setInputValue(normalizeAmount(amount, DEFAULT_RULE_AMOUNTS_USD[type]).toString());
  }, [amount, type]);

  const getCurrentAmount = () => {
    const numeric = Number(inputValue);
    return Number.isFinite(numeric) ? numeric : parsedInitial;
  };

  const commitAmount = (next: number) => {
    const safeValue = Math.max(MIN_AMOUNT, next);
    const asString = safeValue.toString();
    setInputValue(asString);
    onAmountChange(asString);
  };

  const handleIncrement = () => {
    const value = Math.round((getCurrentAmount() + STEP_AMOUNT) * 10) / 10;
    commitAmount(value);
  };

  const handleDecrement = () => {
    const value = Math.round((getCurrentAmount() - STEP_AMOUNT) * 10) / 10;
    commitAmount(value);
  };

  const handleInputChange = (value: string) => {
    if (disabled) return;
    setInputValue(value);
  };

  const handleInputBlur = () => {
    if (disabled) return;
    const numeric = Number(inputValue);
    const next = Number.isFinite(numeric)
      ? Math.max(MIN_AMOUNT, Number(numeric.toFixed(2)))
      : MIN_AMOUNT;
    commitAmount(next);
  };

  const meta = REACTION_META[type];

  return (
    <div
      className={cn(
        "bg-card/80 flex flex-col gap-4 rounded-2xl border p-4",
        "md:flex-row md:items-center md:justify-between",
        disabled && "opacity-70"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="bg-muted text-foreground flex size-9 items-center justify-center rounded-full">
          {meta.icon}
        </span>
        <div className="space-y-0.5">
          <div className="text-base font-medium">{meta.label}</div>
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-between gap-3 md:justify-end">
        <div className="flex items-center gap-2">
          <div className="border-input bg-input/30 flex h-12 items-center rounded-2xl border">
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={handleDecrement}
              disabled={disabled}
              className="h-12 w-11 rounded-l-2xl"
            >
              <Minus className="size-4" />
            </Button>
            <div className="flex items-center px-2">
              <span className="text-muted-foreground text-base font-medium">$</span>
              <Input
                type="number"
                min={MIN_AMOUNT}
                step={0.01}
                inputMode="decimal"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleInputBlur}
                disabled={disabled}
                className="h-12 w-20 min-w-0 border-0 bg-transparent text-center text-xl font-semibold tabular-nums shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={handleIncrement}
              disabled={disabled}
              className="h-12 w-11 rounded-r-2xl"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
            disabled={disabled}
            className="data-[state=checked]:bg-foreground"
          />
        </div>
      </div>
    </div>
  );
}

function normalizeAmount(input: string, fallback: string): number {
  const fromProp = input ? Number(input) : NaN;
  const initial = Number.isFinite(fromProp) && fromProp >= 0 ? fromProp : Number(fallback);
  return Math.max(MIN_AMOUNT, initial);
}
