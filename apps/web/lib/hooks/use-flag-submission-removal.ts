"use client";

import { useCallback, useMemo, useReducer } from "react";
import { toast } from "sonner";
import { markSubmissionIneligible } from "@/app/(app)/rounds/[id]/actions";

type UseFlagSubmissionRemovalParams = {
  ruleId?: number;
  source: "farcaster" | "x";
  postId?: string | null;
  castText?: string | null;
  onSuccess?: () => void;
};

type FlagRemovalState = {
  targetKey: string;
  isOpen: boolean;
  reason: string;
  alsoUpdateRequirements: boolean;
  isPending: boolean;
};

function createInitialState(targetKey: string): FlagRemovalState {
  return {
    targetKey,
    isOpen: false,
    reason: "",
    alsoUpdateRequirements: false,
    isPending: false,
  };
}

type FlagRemovalAction =
  | { type: "open"; targetKey: string }
  | { type: "reset"; targetKey: string }
  | { type: "setReason"; targetKey: string; reason: string }
  | { type: "setAlsoUpdateRequirements"; targetKey: string; value: boolean }
  | { type: "setPending"; targetKey: string; value: boolean };

function reducer(state: FlagRemovalState, action: FlagRemovalAction): FlagRemovalState {
  const base = state.targetKey === action.targetKey ? state : createInitialState(action.targetKey);

  switch (action.type) {
    case "open":
      return { ...base, isOpen: true };
    case "reset":
      return createInitialState(action.targetKey);
    case "setReason":
      return { ...base, reason: action.reason };
    case "setAlsoUpdateRequirements":
      return { ...base, alsoUpdateRequirements: action.value };
    case "setPending":
      return { ...base, isPending: action.value };
    default:
      return base;
  }
}

export function useFlagSubmissionRemoval(params: UseFlagSubmissionRemovalParams) {
  const targetKey = useMemo(() => {
    const ruleId = params.ruleId ?? "";
    const postId = params.postId ?? "";
    return `${ruleId}:${params.source}:${postId}`;
  }, [params.postId, params.ruleId, params.source]);
  const [state, dispatch] = useReducer(reducer, targetKey, createInitialState);
  const effectiveState = state.targetKey === targetKey ? state : createInitialState(targetKey);

  const canSubmit = useMemo(() => {
    return Boolean(
      !effectiveState.isPending && params.ruleId && params.postId && effectiveState.reason.trim()
    );
  }, [effectiveState.isPending, effectiveState.reason, params.postId, params.ruleId]);

  const open = useCallback(() => dispatch({ type: "open", targetKey }), [targetKey]);

  const cancel = useCallback(() => dispatch({ type: "reset", targetKey }), [targetKey]);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    if (!params.ruleId || !params.postId) return;

    dispatch({ type: "setPending", targetKey, value: true });

    let result: Awaited<ReturnType<typeof markSubmissionIneligible>>;
    try {
      result = await markSubmissionIneligible({
        ruleId: params.ruleId,
        source: params.source,
        castHash: params.postId,
        moderatorNote: effectiveState.reason.trim(),
        castText: params.castText ?? "",
        alsoUpdateRequirements: effectiveState.alsoUpdateRequirements,
      });
    } catch (error) {
      dispatch({ type: "setPending", targetKey, value: false });
      toast.error(
        error instanceof Error ? error.message : "Failed to flag submission for removal."
      );
      return;
    }

    dispatch({ type: "setPending", targetKey, value: false });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(
      result.requirementsUpdated ? "Removed and updated requirements." : "Removed from this round."
    );
    dispatch({ type: "reset", targetKey });
    params.onSuccess?.();
  }, [canSubmit, effectiveState.alsoUpdateRequirements, effectiveState.reason, params, targetKey]);

  return {
    isOpen: effectiveState.isOpen,
    open,
    cancel,
    submit,
    reason: effectiveState.reason,
    setReason: (reason: string) => dispatch({ type: "setReason", targetKey, reason }),
    alsoUpdateRequirements: effectiveState.alsoUpdateRequirements,
    setAlsoUpdateRequirements: (value: boolean) =>
      dispatch({ type: "setAlsoUpdateRequirements", targetKey, value }),
    isPending: effectiveState.isPending,
    canSubmit,
  };
}
