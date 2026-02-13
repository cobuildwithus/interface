"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { TokenCategory } from "@/generated/prisma/enums";
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
  const [disallowedCategories, setDisallowedCategories] = useState<TokenCategory[]>(
    initialDisallowedCategories
  );
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(initialError ?? null);
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    setDisallowedCategories(initialDisallowedCategories);
  }, [initialDisallowedCategories]);

  useEffect(() => {
    setFetchError(initialError ?? null);
  }, [initialError]);

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

      const previous = disallowedCategories;

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

      setIsSaving(true);
      setDisallowedCategories(nextArray);

      const toastId = toast.loading("Saving...", {
        id: toastIdRef.current ?? undefined,
      });
      toastIdRef.current = toastId;

      try {
        const result = await updateTokenCategoryPreferencesAction(nextArray);
        if (!result.ok) {
          throw new Error(result.error ?? "Unable to save coin filters.");
        }
        setDisallowedCategories(result.disallowedCategories);
        if (fetchError) {
          setFetchError(null);
        }
        toast.success("Saved", { id: toastIdRef.current ?? undefined });
      } catch (err) {
        setDisallowedCategories(previous);
        const message = err instanceof Error ? err.message : "Unable to save coin filters.";
        toast.error(message, { id: toastIdRef.current ?? undefined });
      } finally {
        setIsSaving(false);
        toastIdRef.current = null;
      }
    },
    [allowedCount, disallowedCategories, disallowedSet, enabled, fetchError]
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
