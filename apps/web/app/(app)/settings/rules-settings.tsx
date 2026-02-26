import { AuthButton } from "@/components/ui/auth-button";
import { SettingsCard, SettingsCardHeader } from "@/components/features/settings/settings-card";
import type { TokenCategory } from "@/generated/prisma/enums";
import type { ReactionType } from "@/lib/domains/rules/rules/reaction-types";
import { RulesConfig } from "./rules-config";
import { TokenCategoryFilters } from "./token-category-filters";

type RulesSettingsProps = {
  enabled: boolean;
  initialRules: Partial<Record<ReactionType, { enabled: boolean; amount: string }>>;
  initialDisallowedCategories: TokenCategory[];
  rulesError?: string | null;
  tokenCategoryError?: string | null;
};

export function RulesSettings({
  enabled,
  initialRules,
  initialDisallowedCategories,
  rulesError,
  tokenCategoryError,
}: RulesSettingsProps) {
  return (
    <section className="space-y-6">
      {!enabled && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed p-5 text-sm">
          <div className="text-muted-foreground">
            Connect a wallet to create and update your rules.
          </div>
          <AuthButton className="gap-2">Connect wallet</AuthButton>
        </div>
      )}
      <SettingsCard>
        <SettingsCardHeader
          title="Reaction rules"
          description="How much you spend when you engage on X and Farcaster."
        />
        <RulesConfig enabled={enabled} initialRules={initialRules} initialError={rulesError} />
      </SettingsCard>

      <TokenCategoryFilters
        enabled={enabled}
        initialDisallowedCategories={initialDisallowedCategories}
        initialError={tokenCategoryError}
      />
    </section>
  );
}
