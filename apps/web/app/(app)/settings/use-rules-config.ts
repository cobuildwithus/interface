"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits } from "viem";
import { updateReactionRulesAction } from "./actions";
import { DEFAULT_RULE_AMOUNTS_USD, type ReactionType, ALLOWED_REACTIONS } from "./rules-types";

const MIN_AMOUNT = 0.05;

type RuleState = {
  enabled: boolean;
  amount: string;
};

type RuleStateMap = Record<ReactionType, RuleState>;

type UseRulesConfigResult = {
  saving: boolean;
  error: string | null;
  success: boolean;
  reactionDraft: RuleStateMap;
  handleReactionToggle: (type: ReactionType) => (checked: boolean) => void;
  handleAmountChange: (type: ReactionType) => (amount: string) => void;
};

type UseRulesConfigParams = {
  enabled: boolean;
  initialRules: Partial<Record<ReactionType, { enabled: boolean; amount: string }>>;
  initialError?: string | null;
};

export function useRulesConfig({
  enabled,
  initialRules,
  initialError,
}: UseRulesConfigParams): UseRulesConfigResult {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [baselineRules, setBaselineRules] = useState<RuleStateMap>(() =>
    buildBaselineState(initialRules)
  );
  const [ruleDraft, setRuleDraft] = useState<RuleStateMap>(() => buildBaselineState(initialRules));

  const lastSubmittedSignatureRef = useRef<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetFromInitial = useCallback(() => {
    const nextBaseline = buildBaselineState(initialRules);
    setBaselineRules(nextBaseline);
    setRuleDraft(nextBaseline);
    lastSubmittedSignatureRef.current = null;
  }, [initialRules]);

  useEffect(() => {
    if (!enabled || saving) return;
    resetFromInitial();
  }, [enabled, resetFromInitial, saving]);

  useEffect(() => {
    setError(initialError ?? null);
  }, [initialError]);

  useEffect(
    () => () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    },
    []
  );

  const handleReactionToggle = (type: ReactionType) => (checked: boolean) => {
    setRuleDraft((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: checked },
    }));
  };

  const handleAmountChange = (type: ReactionType) => (amount: string) => {
    const safe = sanitizeDecimalInput(amount, MIN_AMOUNT);
    const numeric = Number(safe);
    setRuleDraft((prev) => ({
      ...prev,
      [type]: { amount: safe, enabled: Number.isFinite(numeric) && numeric >= MIN_AMOUNT },
    }));
  };

  const diff = useMemo(
    () => diffFromBaseline(ruleDraft, baselineRules),
    [ruleDraft, baselineRules]
  );
  const hasDiff = Object.keys(diff).length > 0;

  const updateRules = useCallback(
    async (next: Partial<Record<ReactionType, RuleState>>) => {
      if (!enabled) return;
      setSaving(true);
      setError(null);

      try {
        const result = await updateReactionRulesAction(next);
        if (!result.ok) {
          throw new Error(result.error ?? "Failed to save rules");
        }

        setBaselineRules((prev) => applyRuleDiff(prev, next));
        setSuccess(true);
        if (successTimerRef.current) {
          clearTimeout(successTimerRef.current);
        }
        successTimerRef.current = setTimeout(() => setSuccess(false), 1500);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setSaving(false);
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled || saving || !hasDiff) return;

    const signature = JSON.stringify(diff);
    if (lastSubmittedSignatureRef.current === signature) {
      return;
    }

    const timeoutId = setTimeout(() => {
      lastSubmittedSignatureRef.current = signature;
      void updateRules(diff);
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [diff, enabled, hasDiff, saving, updateRules]);

  return {
    saving,
    error,
    success,
    reactionDraft: ruleDraft,
    handleReactionToggle,
    handleAmountChange,
  };
}

function buildBaselineState(
  rules: Partial<Record<ReactionType, { enabled: boolean; amount: string }>>
): RuleStateMap {
  const baseline = {} as RuleStateMap;
  for (const reaction of ALLOWED_REACTIONS) {
    const rule = rules[reaction];
    const amount = dollarsFromMicrosString(rule?.amount) ?? DEFAULT_RULE_AMOUNTS_USD[reaction];
    baseline[reaction] = {
      enabled: rule?.enabled ?? false,
      amount: sanitizeDecimalInput(amount, MIN_AMOUNT),
    };
  }
  return baseline;
}

function diffFromBaseline(
  current: Record<ReactionType, RuleState>,
  baseline: RuleStateMap | null
): Partial<Record<ReactionType, RuleState>> {
  const diff: Partial<Record<ReactionType, RuleState>> = {};
  for (const reaction of ALLOWED_REACTIONS) {
    const baselineValue =
      baseline?.[reaction] ??
      ({
        enabled: false,
        amount: sanitizeDecimalInput(DEFAULT_RULE_AMOUNTS_USD[reaction], MIN_AMOUNT),
      } satisfies RuleState);
    const next = current[reaction];
    if (next.enabled !== baselineValue.enabled || next.amount !== baselineValue.amount) {
      diff[reaction] = next;
    }
  }
  return diff;
}

function applyRuleDiff(
  baseline: RuleStateMap,
  diff: Partial<Record<ReactionType, RuleState>>
): RuleStateMap {
  const next = { ...baseline };
  for (const [reaction, value] of Object.entries(diff)) {
    if (!value) continue;
    next[reaction as ReactionType] = { ...value };
  }
  return next;
}

function toCanonicalTwoDecimalString(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  const fixed = value.toFixed(2);
  return fixed.replace(/\.00$/, "").replace(/(\.\d*[1-9])0$/, "$1");
}

function dollarsFromMicrosString(microsString: string | undefined): string | undefined {
  if (!microsString) return undefined;
  try {
    const formatted = formatUnits(BigInt(microsString), 6);
    const numeric = Number(formatted);
    if (!Number.isFinite(numeric)) return undefined;
    return toCanonicalTwoDecimalString(numeric);
  } catch {
    return undefined;
  }
}

function sanitizeDecimalInput(input: string, minimum: number): string {
  const numeric = Number(input);
  if (!Number.isFinite(numeric)) return toCanonicalTwoDecimalString(minimum);
  const clamped = Math.max(minimum, numeric);
  return toCanonicalTwoDecimalString(clamped);
}
