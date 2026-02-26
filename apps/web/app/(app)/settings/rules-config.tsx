"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { RulesConfigItem } from "./rules-config-item";
import { ALLOWED_REACTIONS, type ReactionType } from "./rules-types";
import { useRulesConfig } from "./use-rules-config";

type RulesConfigProps = {
  enabled: boolean;
  initialRules: Partial<Record<ReactionType, { enabled: boolean; amount: string }>>;
  initialError?: string | null;
};

export function RulesConfig({ enabled, initialRules, initialError }: RulesConfigProps) {
  const { saving, error, success, reactionDraft, handleReactionToggle, handleAmountChange } =
    useRulesConfig({ enabled, initialRules, initialError });

  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (error && toastIdRef.current) {
      toast.error(error, { id: toastIdRef.current });
      toastIdRef.current = null;
    } else if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (saving) {
      toastIdRef.current = toast.loading("Saving...", { duration: 30000 });
    } else if (toastIdRef.current) {
      if (success) {
        toast.success("Saved", { id: toastIdRef.current });
      } else {
        toast.dismiss(toastIdRef.current);
      }
      toastIdRef.current = null;
    }
  }, [saving, success]);

  return (
    <div className="space-y-3">
      {ALLOWED_REACTIONS.map((reaction: ReactionType) => (
        <RulesConfigItem
          key={reaction}
          type={reaction}
          enabled={reactionDraft[reaction].enabled}
          amount={reactionDraft[reaction].amount}
          onEnabledChange={handleReactionToggle(reaction)}
          onAmountChange={handleAmountChange(reaction)}
          disabled={!enabled}
        />
      ))}
    </div>
  );
}
