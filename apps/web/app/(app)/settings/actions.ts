"use server";

import type { TokenCategory } from "@/generated/prisma/enums";
import type { ReactionType } from "@/lib/domains/rules/rules/reaction-types";
import { getSession } from "@/lib/domains/auth/session";
import { updateFarcasterProfile } from "@/lib/server/farcaster-profile-update";
import { updateReactionRulesForAddress } from "@/lib/server/reaction-rules";
import { updateTokenCategoryPreferencesForAddress } from "@/lib/server/token-category-preferences";

export async function updateFarcasterProfileAction(payload: {
  displayName?: string;
  pfpUrl?: string;
}) {
  return updateFarcasterProfile(payload);
}

export async function updateReactionRulesAction(reactions: {
  [key in ReactionType]?: { enabled?: boolean; amount?: string | number };
}) {
  const session = await getSession();
  const result = await updateReactionRulesForAddress(session.address ?? null, { reactions });

  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  return { ok: true as const };
}

export async function updateTokenCategoryPreferencesAction(disallowedCategories: TokenCategory[]) {
  const session = await getSession();
  const result = await updateTokenCategoryPreferencesForAddress(session.address ?? null, {
    disallowedCategories,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  return { ok: true as const, disallowedCategories: result.data.disallowedCategories };
}
