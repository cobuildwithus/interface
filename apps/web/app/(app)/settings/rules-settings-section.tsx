import type { TokenCategory } from "@/generated/prisma/enums";
import type { ReactionType } from "@/lib/domains/rules/rules/reaction-types";
import { getSession } from "@/lib/domains/auth/session";
import { getReactionRulesForAddress } from "@/lib/server/reaction-rules";
import { getTokenCategoryPreferencesForAddress } from "@/lib/server/token-category-preferences";
import { RulesSettings } from "./rules-settings";

export async function RulesSettingsSection() {
  const session = await getSession();
  const address = session.address ?? null;
  const enabled = Boolean(address);

  const [rulesResult, preferencesResult] = await Promise.all([
    address ? getReactionRulesForAddress(address) : Promise.resolve(null),
    address ? getTokenCategoryPreferencesForAddress(address) : Promise.resolve(null),
  ]);

  const rulesMap: Partial<Record<ReactionType, { enabled: boolean; amount: string }>> = {};
  if (rulesResult?.ok) {
    for (const rule of rulesResult.data.rules) {
      rulesMap[rule.reaction] = { enabled: rule.enabled, amount: rule.amount };
    }
  }

  const disallowedCategories: TokenCategory[] =
    preferencesResult && preferencesResult.ok ? preferencesResult.data.disallowedCategories : [];

  const rulesError =
    rulesResult && !rulesResult.ok && rulesResult.status !== 401 ? rulesResult.error : null;
  const tokenCategoryError =
    preferencesResult && !preferencesResult.ok && preferencesResult.status !== 401
      ? preferencesResult.error
      : null;

  return (
    <RulesSettings
      enabled={enabled}
      initialRules={rulesMap}
      initialDisallowedCategories={disallowedCategories}
      rulesError={rulesError}
      tokenCategoryError={tokenCategoryError}
    />
  );
}
