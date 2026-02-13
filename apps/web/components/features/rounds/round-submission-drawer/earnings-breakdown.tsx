"use client";

import { useState } from "react";
import { QuadraticIcon } from "@/components/common/icons/quadratic-icon";
import { AIDuelsIcon } from "@/components/common/icons/ai-duels-icon";
import { Currency } from "@/components/ui/currency";
import {
  AiDuelsExpandedContent,
  BreakdownItem,
  QuadraticExpandedContent,
  formatBackers,
} from "./earnings-breakdown/parts";

type EarningsBreakdownProps = {
  aiReward: { amount: number; pending: boolean };
  quadraticReward: number;
  backersCount: number;
  winRate: number | null;
  sharePercent: number | null;
  volume: number;
  isMobile: boolean;
};

export function EarningsBreakdown({
  aiReward,
  quadraticReward,
  backersCount,
  winRate,
  sharePercent,
  volume,
  isMobile,
}: EarningsBreakdownProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(isMobile ? [] : ["quadratic", "ai"])
  );

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <BreakdownItem
        icon={<QuadraticIcon size={22} />}
        iconBg="rgba(16, 185, 129, 0.12)"
        title="Quadratic"
        subtitle={formatBackers(backersCount)}
        amount={<Currency value={quadraticReward} />}
        expanded={expanded.has("quadratic")}
        onToggle={() => toggle("quadratic")}
        expandedContent={
          <QuadraticExpandedContent
            raisedUsd={volume}
            matchUsd={quadraticReward}
            backers={backersCount}
          />
        }
      />
      <BreakdownItem
        icon={<AIDuelsIcon size={28} />}
        iconBg="rgba(139, 92, 246, 0.12)"
        title="AI duels"
        subtitle={winRate !== null ? `${Math.round(winRate * 100)}% win rate` : "pending…"}
        amount={<Currency value={aiReward.amount} />}
        expanded={expanded.has("ai")}
        onToggle={() => toggle("ai")}
        expandedContent={
          <AiDuelsExpandedContent
            winRatePercent={winRate !== null ? winRate * 100 : null}
            sharePercent={sharePercent}
          />
        }
      />
    </div>
  );
}
