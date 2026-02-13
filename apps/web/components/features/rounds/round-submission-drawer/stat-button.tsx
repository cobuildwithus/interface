"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared/utils";

type StatButtonProps = {
  selected: boolean;
  onClick: () => void;
  value: React.ReactNode;
  label: string;
};

export function StatButton({ selected, onClick, value, label }: StatButtonProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-auto flex-1 rounded-xl px-2 py-3 transition-all",
        "flex flex-col items-center justify-center gap-0.5",
        selected
          ? "bg-card border-foreground border-2 shadow-sm"
          : "bg-accent/50 hover:bg-accent border-2 border-transparent"
      )}
    >
      <span
        className={cn(
          "text-2xl font-semibold tabular-nums md:text-3xl",
          selected ? "text-foreground" : "text-foreground/80"
        )}
      >
        {value}
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </Button>
  );
}
