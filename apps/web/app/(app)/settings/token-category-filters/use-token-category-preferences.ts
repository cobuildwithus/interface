"use client";

import { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import type { TokenCategory } from "@/generated/prisma/enums";
import { useSettingsPersistence } from "@/lib/domains/settings/use-settings-persistence";
import { updateTokenCategoryPreferencesAction } from "../actions";
import { CATEGORY_DEFINITIONS } from "./category-definitions";

type UseTokenCategoryPreferencesParams = {
  enabled: boolean;
  initialDisallowedCategories: TokenCategory[];
  initialError?: string | null;
};

type UseTokenCategoryPreferences = {
  disallowedSet: Set<TokenCategory>;
  allowedCount: number;
  disableAll: boolean;
  statusText: string | null;
  fetchError: string | null;
  handleToggle: (category: TokenCategory, nextAllowed: boolean) => Promise<void>;
};

export function useTokenCategoryPreferences({
  enabled,
  initialDisallowedCategories,
  initialError,
}: UseTokenCategoryPreferencesParams): UseTokenCategoryPreferences {
  const initialState = useMemo(
    () => [...initialDisallowedCategories],
    [initialDisallowedCategories]
  );
  const toastIdRef = useRef<string | number | null>(null);

  const {
    draft: disallowedCategories,
    saving: isSaving,
    error: fetchError,
    commit,
  } = useSettingsPersistence<
    TokenCategory[],
    TokenCategory[],
    { ok: true; disallowedCategories: TokenCategory[] }
  >({
    enabled,
    initialState,
    initialError,
    clearErrorOnSaveStart: false,
    getPayload: ({ baseline, draft }) =>
      areTokenCategoryListsEqual(baseline, draft) ? null : draft,
    save: async (nextDisallowedCategories) => {
      const result = await updateTokenCategoryPreferencesAction(nextDisallowedCategories);
      if (!result.ok) {
        throw new Error(result.error ?? "Unable to save coin filters.");
      }
      return result;
    },
    applySuccess: (response) => ({
      baseline: response.disallowedCategories,
      draft: response.disallowedCategories,
      success: false,
    }),
    applyError: (saveError, context) => {
      const message =
        saveError instanceof Error ? saveError.message : "Unable to save coin filters.";
      toast.error(message, { id: toastIdRef.current ?? undefined });
      return {
        baseline: context.baseline,
        draft: context.baseline,
        error: context.previousError,
        success: false,
      };
    },
  });

  const disallowedSet = useMemo(
    () => new Set<TokenCategory>(disallowedCategories),
    [disallowedCategories]
  );
  const totalCategories = CATEGORY_DEFINITIONS.length;
  const allowedCount = totalCategories - disallowedSet.size;
  const disableAll = !enabled || isSaving;
  const statusText = getStatusText({ enabled, isSaving });

  const handleToggle = useCallback(
    async (category: TokenCategory, nextAllowed: boolean) => {
      if (!enabled) return;

      if (!nextAllowed && allowedCount <= 1) {
        toast.error("You must allow at least one category.");
        return;
      }

      const nextSet = new Set(disallowedSet);
      if (nextAllowed) {
        nextSet.delete(category);
      } else {
        nextSet.add(category);
      }
      const nextArray = Array.from(nextSet);

      const toastId = toast.loading("Saving...", {
        id: toastIdRef.current ?? undefined,
      });
      toastIdRef.current = toastId;

      try {
        const didSave = await commit(nextArray);
        if (!didSave) {
          return;
        }
        toast.success("Saved", { id: toastIdRef.current ?? undefined });
      } finally {
        toastIdRef.current = null;
      }
    },
    [allowedCount, commit, disallowedSet, enabled]
  );

  return {
    disallowedSet,
    allowedCount,
    disableAll,
    statusText,
    fetchError,
    handleToggle,
  };
}

type StatusParams = {
  enabled: boolean;
  isSaving: boolean;
};

function getStatusText({ enabled, isSaving }: StatusParams): string | null {
  if (!enabled) return "Connect a wallet to update your filters.";
  if (isSaving) return "Saving...";
  return null;
}

function areTokenCategoryListsEqual(left: TokenCategory[], right: TokenCategory[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((category) => rightSet.has(category));
}
