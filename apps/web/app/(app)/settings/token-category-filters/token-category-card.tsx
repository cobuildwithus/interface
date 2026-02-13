"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/shared/utils";
import type { TokenCategory } from "@/generated/prisma/enums";
import type { CategoryDefinition } from "./category-definitions";
import { TokenCategoryIcon } from "./token-category-icon";

type TokenCategoryCardProps = {
  category: CategoryDefinition;
  isAllowed: boolean;
  disableAll: boolean;
  onToggle: (category: TokenCategory, nextAllowed: boolean) => void;
};

export function TokenCategoryCard({
  category,
  isAllowed,
  disableAll,
  onToggle,
}: TokenCategoryCardProps) {
  const { key, label, description, logo, logoSize } = category;

  return (
    <div
      className={cn(
        "border-border/60 bg-background/70 group flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition",
        !isAllowed && "opacity-70",
        !disableAll && "hover:border-foreground/20"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="border-border/60 bg-muted/40 text-foreground relative flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm">
          <TokenCategoryIcon categoryKey={key} label={label} logo={logo} logoSize={logoSize} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-muted-foreground text-xs">{description}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={isAllowed}
          onCheckedChange={(next) => onToggle(key, next)}
          disabled={disableAll}
          className="data-[state=checked]:bg-foreground"
        />
      </div>
    </div>
  );
}
