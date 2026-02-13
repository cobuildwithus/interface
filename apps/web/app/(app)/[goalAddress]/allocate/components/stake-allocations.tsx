import { Check, ChevronRight } from "lucide-react";
import { Currency } from "@/components/ui/currency";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { AgentAllocation } from "./types";

type StakeAllocationsProps = {
  allocations: AgentAllocation[];
};

function formatProgress(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
}

export function StakeAllocations({ allocations }: StakeAllocationsProps) {
  return (
    <section>
      <h2 className="text-muted-foreground mb-4 text-sm font-medium tracking-wider uppercase">
        Your Stake
      </h2>
      <div className="space-y-2">
        {allocations.map((alloc) => {
          const isComplete = alloc.status === "complete";
          const titleParts = alloc.sgTitle.match(/^(.+?) by (.+)$/);
          const title = titleParts ? titleParts[1] : alloc.sgTitle;
          const deadline = titleParts ? titleParts[2] : null;
          return (
            <div
              key={alloc.sgId}
              className="group bg-card/40 hover:bg-card/60 flex items-center gap-4 rounded-xl border p-4 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{title}</span>
                  {isComplete && <Check className="h-4 w-4 text-emerald-500" />}
                </div>
                {!isComplete && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-muted mt-2 h-1 cursor-default overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.min(100, (alloc.progressCurrent / alloc.progressTarget) * 100)}%`,
                          }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {formatProgress(alloc.progressCurrent)}/{formatProgress(alloc.progressTarget)}{" "}
                      {alloc.progressUnit}
                    </TooltipContent>
                  </Tooltip>
                )}
                <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center">
                    <span className="text-foreground font-medium">
                      <Currency value={alloc.stakeAmount} animated compact />
                    </span>
                    <span className="mx-2">•</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">{alloc.daysStaked} days</span>
                      </TooltipTrigger>
                      <TooltipContent>Days staked</TooltipContent>
                    </Tooltip>
                    <span className="mx-2">•</span>
                    <span>
                      earned <Currency value={alloc.rewardsEarned} compact />
                    </span>
                  </div>
                  {deadline && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">{deadline}</span>
                      </TooltipTrigger>
                      <TooltipContent>Goal deadline</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
