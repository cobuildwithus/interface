"use client";

import { useMemo } from "react";
import { cn } from "@/lib/shared/utils";
import { Currency } from "@/components/ui/currency";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPercent } from "@/lib/shared/currency/format";
import type { IssuanceBaseTerms, IssuanceStage } from "@/lib/domains/token/juicebox/issuance-terms";
import { findActiveStageIndex } from "@/lib/domains/token/juicebox/issuance-terms/utils";
import { useNow } from "@/lib/hooks/use-now";
import { formatPriceValue, toIssuancePrice } from "./issuance-format";

type IssuanceTableProps = {
  terms: IssuanceBaseTerms;
  initialNowMs: number;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatPeriod(stage: IssuanceStage): { label: string; duration: string | null } {
  const startLabel = dateFormatter.format(new Date(stage.start));
  if (!stage.end) {
    return { label: `${startLabel} - forever`, duration: null };
  }
  const endLabel = dateFormatter.format(new Date(stage.end));
  const days = Math.max(1, Math.round((stage.end - stage.start) / (1000 * 60 * 60 * 24)));
  return { label: `${startLabel} - ${endLabel}`, duration: `${days} days` };
}

function formatCadence(durationSec: number): string {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return "--";
  const days = durationSec / 86400;
  if (days >= 1) {
    const rounded = Math.round(days);
    return `${rounded} day${rounded === 1 ? "" : "s"}`;
  }
  const hours = durationSec / 3600;
  if (hours >= 1) {
    const rounded = Math.round(hours);
    return `${rounded} hour${rounded === 1 ? "" : "s"}`;
  }
  const minutes = durationSec / 60;
  const rounded = Math.max(1, Math.round(minutes));
  return `${rounded} min`;
}

function formatCut(stage: IssuanceStage): { label: string; cadence: string | null } {
  if (stage.duration <= 0 || stage.weightCutPercent <= 0) {
    return { label: "--", cadence: null };
  }
  const percent = formatPercent(stage.weightCutPercent * 100, { maximumFractionDigits: 2 });
  return { label: percent, cadence: `every ${formatCadence(stage.duration)}` };
}

export function IssuanceTable({ terms, initialNowMs }: IssuanceTableProps) {
  const { stages, baseSymbol } = terms;
  const nowMs = useNow({ intervalMs: 60_000, initialNowMs });

  const activeStageIndex = useMemo(() => {
    const nowSec = Math.floor(nowMs / 1000);
    return findActiveStageIndex(stages, nowSec);
  }, [stages, nowMs]);

  if (stages.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="bg-muted/40 border-b px-4 py-3 text-sm font-medium">Stages</div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-3 font-medium whitespace-nowrap">
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">
                    Stage
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Sequential phase of the token issuance schedule.
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">
                    Period
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Date range when this stage is active.
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">
                    Price
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Cost per token at the start of this stage.
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">
                    Cut
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Percentage the price increases at each interval within the stage.
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">
                    Split
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Percentage of newly issued tokens reserved for the project.
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">
                    Tax
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Tax that stays in treasury when cashing out tokens.
                  </TooltipContent>
                </Tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage, index) => {
              const isActive = activeStageIndex === index;
              const period = formatPeriod(stage);
              const cut = formatCut(stage);
              return (
                <tr key={stage.stage} className={cn("border-t", isActive && "bg-muted/30")}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-medium">
                      <span>Stage {stage.stage}</span>
                      {isActive && <span className="size-2 rounded-full bg-emerald-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-medium">{period.label}</div>
                    {period.duration && (
                      <div className="text-muted-foreground text-xs">{period.duration}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 font-medium whitespace-nowrap">
                    {formatPriceValue(toIssuancePrice(stage.weight))} {baseSymbol}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-medium">{cut.label}</div>
                    {cut.cadence && (
                      <div className="text-muted-foreground text-xs">{cut.cadence}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Currency
                      value={stage.reservedPercent / 100}
                      kind="percent"
                      className="font-medium"
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Currency
                      value={stage.cashOutTaxRate / 100}
                      kind="percent"
                      className="font-medium"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
