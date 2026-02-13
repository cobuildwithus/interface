"use client";

import type { TokenCategory } from "@/generated/prisma/enums";
import { SettingsCard, SettingsCardHeader } from "@/components/features/settings/settings-card";
import { CATEGORY_DEFINITIONS } from "./category-definitions";
import { TokenCategoryCard } from "./token-category-card";
import { useTokenCategoryPreferences } from "./use-token-category-preferences";

type TokenCategoryFiltersProps = {
  enabled: boolean;
  initialDisallowedCategories: TokenCategory[];
  initialError?: string | null;
};

export function TokenCategoryFilters({
  enabled,
  initialDisallowedCategories,
  initialError,
}: TokenCategoryFiltersProps) {
  const { disallowedSet, allowedCount, disableAll, statusText, fetchError, handleToggle } =
    useTokenCategoryPreferences({
      enabled,
      initialDisallowedCategories,
      initialError,
    });

  return (
    <SettingsCard variant="accent">
      <SettingsCardHeader
        title="Coin filters"
        description="Choose which coin categories Cobuild can buy when you engage."
        action={
          <div className="border-border/60 bg-background/80 text-foreground flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {allowedCount}/{CATEGORY_DEFINITIONS.length} allowed
          </div>
        }
      />

      <div className="grid gap-3">
        {CATEGORY_DEFINITIONS.map((category) => (
          <TokenCategoryCard
            key={category.key}
            category={category}
            isAllowed={!disallowedSet.has(category.key)}
            disableAll={disableAll}
            onToggle={handleToggle}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{statusText}</span>
        {fetchError ? <span className="text-red-500">{fetchError}</span> : null}
      </div>
    </SettingsCard>
  );
}
