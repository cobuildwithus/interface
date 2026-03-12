"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

type SettingsSaveContext<TState, TPayload> = {
  baseline: TState;
  draft: TState;
  payload: TPayload;
  previousError: string | null;
};

type SettingsMutationResult<TState> = {
  baseline?: TState;
  draft?: TState;
  error?: string | null;
  success?: boolean;
};

type SettingsPersistenceOptions<TState, TPayload, TResponse> = {
  enabled: boolean;
  initialState: TState;
  initialError?: string | null;
  getPayload: (params: { baseline: TState; draft: TState }) => TPayload | null;
  save: (payload: TPayload, context: SettingsSaveContext<TState, TPayload>) => Promise<TResponse>;
  applySuccess?: (
    response: TResponse,
    context: SettingsSaveContext<TState, TPayload>
  ) => SettingsMutationResult<TState>;
  applyError?: (
    error: unknown,
    context: SettingsSaveContext<TState, TPayload>
  ) => SettingsMutationResult<TState>;
  clearErrorOnSaveStart?: boolean;
  resetWhileDisabled?: boolean;
  successDurationMs?: number;
  debounceMs?: number;
  getDebounceSignature?: (payload: TPayload) => string;
};

type SettingsPersistenceResult<TState> = {
  baseline: TState;
  draft: TState;
  setDraft: Dispatch<SetStateAction<TState>>;
  saving: boolean;
  success: boolean;
  error: string | null;
  commit: (nextDraft?: TState) => Promise<boolean>;
};

const DEFAULT_SUCCESS_DURATION_MS = 0;

export function useSettingsPersistence<TState, TPayload, TResponse>({
  enabled,
  initialState,
  initialError,
  getPayload,
  save,
  applySuccess,
  applyError,
  clearErrorOnSaveStart = true,
  resetWhileDisabled = true,
  successDurationMs = DEFAULT_SUCCESS_DURATION_MS,
  debounceMs,
  getDebounceSignature = defaultDebounceSignature,
}: SettingsPersistenceOptions<TState, TPayload, TResponse>): SettingsPersistenceResult<TState> {
  const [baseline, setBaseline] = useState(initialState);
  const [draft, setDraftState] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const baselineRef = useRef(baseline);
  const draftRef = useRef(draft);
  const errorRef = useRef(error);
  const draftVersionRef = useRef(0);
  const appliedInitialStateRef = useRef(initialState);
  const lastSubmittedSignatureRef = useRef<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  baselineRef.current = baseline;
  draftRef.current = draft;
  errorRef.current = error;

  const clearSuccessTimer = useCallback(() => {
    if (!successTimerRef.current) {
      return;
    }
    clearTimeout(successTimerRef.current);
    successTimerRef.current = null;
  }, []);

  const resetToInitialState = useCallback(() => {
    clearSuccessTimer();
    setSuccess(false);
    baselineRef.current = initialState;
    draftRef.current = initialState;
    setBaseline(initialState);
    draftVersionRef.current = 0;
    setDraftState(initialState);
    lastSubmittedSignatureRef.current = null;
  }, [clearSuccessTimer, initialState]);

  const replaceDraft = useCallback((nextDraft: TState) => {
    draftRef.current = nextDraft;
    setDraftState(nextDraft);
  }, []);

  const setDraft = useCallback((nextDraft: SetStateAction<TState>) => {
    const resolvedDraft = resolveStateUpdate(draftRef.current, nextDraft);
    if (Object.is(draftRef.current, resolvedDraft)) {
      return;
    }

    draftVersionRef.current += 1;
    draftRef.current = resolvedDraft;
    setDraftState(resolvedDraft);
  }, []);

  useEffect(() => {
    if (Object.is(appliedInitialStateRef.current, initialState)) {
      return;
    }
    if (saving) return;
    if (!enabled && !resetWhileDisabled) return;
    appliedInitialStateRef.current = initialState;
    resetToInitialState();
  }, [enabled, initialState, resetToInitialState, resetWhileDisabled, saving]);

  useEffect(() => {
    setError(initialError ?? null);
  }, [initialError]);

  useEffect(
    () => () => {
      clearSuccessTimer();
    },
    [clearSuccessTimer]
  );

  const payload = useMemo(() => getPayload({ baseline, draft }), [baseline, draft, getPayload]);
  const commit = useCallback(
    async (nextDraft?: TState) => {
      if (!enabled) {
        return false;
      }

      const baselineValue = baselineRef.current;
      let draftValue = draftRef.current;

      if (nextDraft !== undefined) {
        const resolvedDraft = nextDraft;
        if (!Object.is(draftRef.current, resolvedDraft)) {
          draftVersionRef.current += 1;
          draftRef.current = resolvedDraft;
          setDraftState(resolvedDraft);
        }
        draftValue = resolvedDraft;
      }

      const submittedDraftVersion = draftVersionRef.current;
      const nextPayload = getPayload({ baseline: baselineValue, draft: draftValue });

      if (nextPayload === null) {
        return false;
      }

      clearSuccessTimer();
      setSuccess(false);
      if (clearErrorOnSaveStart) {
        setError(null);
      }
      setSaving(true);

      const context: SettingsSaveContext<TState, TPayload> = {
        baseline: baselineValue,
        draft: draftValue,
        payload: nextPayload,
        previousError: errorRef.current,
      };

      try {
        const response = await save(nextPayload, context);
        const outcome = applySuccess?.(response, context);
        const nextBaseline = outcome?.baseline ?? draftValue;
        const nextDraftState = outcome?.draft ?? nextBaseline;
        const draftChangedDuringSave = draftVersionRef.current !== submittedDraftVersion;

        setBaseline(nextBaseline);
        if (!draftChangedDuringSave) {
          replaceDraft(nextDraftState);
        }
        setError(outcome?.error ?? null);

        const shouldShowSuccess = outcome?.success ?? successDurationMs > 0;
        if (shouldShowSuccess && successDurationMs > 0) {
          setSuccess(true);
          successTimerRef.current = setTimeout(() => {
            successTimerRef.current = null;
            setSuccess(false);
          }, successDurationMs);
        }

        return true;
      } catch (saveError) {
        const outcome = applyError?.(saveError, context);
        const draftChangedDuringSave = draftVersionRef.current !== submittedDraftVersion;

        if (outcome?.baseline !== undefined) {
          setBaseline(outcome.baseline);
        }
        if (outcome?.draft !== undefined && !draftChangedDuringSave) {
          replaceDraft(outcome.draft);
        }

        setError(outcome?.error ?? getErrorMessage(saveError));
        setSuccess(false);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      applyError,
      applySuccess,
      clearErrorOnSaveStart,
      clearSuccessTimer,
      enabled,
      getPayload,
      replaceDraft,
      save,
      successDurationMs,
    ]
  );

  useEffect(() => {
    if (!enabled || saving || payload === null || debounceMs === undefined) {
      return;
    }

    const signature = getDebounceSignature(payload);
    if (lastSubmittedSignatureRef.current === signature) {
      return;
    }

    const timeoutId = setTimeout(() => {
      lastSubmittedSignatureRef.current = signature;
      void commit();
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [commit, debounceMs, enabled, getDebounceSignature, payload, saving]);

  return {
    baseline,
    draft,
    setDraft,
    saving,
    success,
    error,
    commit,
  };
}

function defaultDebounceSignature<TPayload>(payload: TPayload): string {
  return JSON.stringify(payload);
}

function resolveStateUpdate<TState>(current: TState, nextDraft: SetStateAction<TState>): TState {
  return typeof nextDraft === "function"
    ? (nextDraft as (previousState: TState) => TState)(current)
    : nextDraft;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
