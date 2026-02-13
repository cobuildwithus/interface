import { HelpCircle, Lock } from "lucide-react";
import { Currency } from "@/components/ui/currency";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type AllocateHeaderProps = {
  goalTitle: string;
  systemStats: {
    dailyFlow: number;
    rewardsLocked: number;
  };
};

export function AllocateHeader({ goalTitle, systemStats }: AllocateHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">{goalTitle}</h1>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Funding at</span>
          <span className="font-semibold text-emerald-500">
            <Currency value={systemStats.dailyFlow} animated compact />
            /day
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" />
          <Currency value={systemStats.rewardsLocked} compact />
          <span>in rewards</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex cursor-help items-center"
                aria-label="Rewards info"
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Unlocks when goal succeeds</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
