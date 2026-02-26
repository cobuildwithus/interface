"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";

type MaxPostsPerUserInputProps = {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
};

const clampInt = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  const rounded = Math.trunc(value);
  return Math.max(min, Math.min(max, rounded));
};

export function MaxPostsPerUserInput({
  value,
  onChange,
  id = "per-user-limit",
  min = 1,
  max = 99,
  disabled = false,
}: MaxPostsPerUserInputProps) {
  const setClamped = (next: number) => onChange(clampInt(next, min, max));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^\d]/g, "");
    const parsed = digits ? Number(digits) : min;
    setClamped(parsed);
  };

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <p className="text-sm font-medium">Max posts per user</p>
      <ButtonGroup>
        <Button
          variant="outline"
          size="icon-sm"
          type="button"
          aria-label="Decrement"
          onClick={() => setClamped(value - 1)}
          disabled={disabled || value <= min}
        >
          <Minus className="size-4" />
        </Button>
        <Input
          id={id}
          value={value}
          onChange={handleInputChange}
          className="h-8 !w-12 text-center font-mono tabular-nums"
          maxLength={2}
          inputMode="numeric"
          disabled={disabled}
        />
        <Button
          variant="outline"
          size="icon-sm"
          type="button"
          aria-label="Increment"
          onClick={() => setClamped(value + 1)}
          disabled={disabled || value >= max}
        >
          <Plus className="size-4" />
        </Button>
      </ButtonGroup>
    </div>
  );
}
