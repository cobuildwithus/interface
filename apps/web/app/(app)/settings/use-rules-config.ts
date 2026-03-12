"use client";

import { useCallback, useMemo } from "react";
import { formatUnits } from "viem";
import { useSettingsPersistence } from "@/lib/domains/settings/use-settings-persistence";
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
  const initialState = useMemo(() => buildBaselineState(initialRules), [initialRules]);

  const getPayload = useCallback(
    ({ baseline, draft }: { baseline: RuleStateMap; draft: RuleStateMap }) => {
      const diff = diffFromBaseline(draft, baseline);
      return Object.keys(diff).length > 0 ? diff : null;
    },
    []
  );

  const {
    draft: ruleDraft,
    setDraft: setRuleDraft,
    saving,
    success,
    error,
  } = useSettingsPersistence<
    RuleStateMap,
    Partial<Record<ReactionType, RuleState>>,
    { ok: true } | { ok: false; error?: string }
  >({
    enabled,
    initialState,
    initialError,
    getPayload,
    debounceMs: 600,
    successDurationMs: 1500,
    resetWhileDisabled: false,
    save: async (nextRules) => {
      const result = await updateReactionRulesAction(nextRules);
      if (!result.ok) {
        throw new Error(result.error ?? "Failed to save rules");
      }

      return result;
    },
    applySuccess: (_response, context) => ({
      baseline: applyRuleDiff(context.baseline, context.payload),
      draft: context.draft,
      success: true,
    }),
  });

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
