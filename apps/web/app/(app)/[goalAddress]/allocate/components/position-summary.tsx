import { Bot, Settings2 } from "lucide-react";
import { Currency } from "@/components/ui/currency";

type PositionSummaryProps = {
  userStats: {
    staked: number;
    projectedReward: number;
  };
};

export function PositionSummary({ userStats }: PositionSummaryProps) {
  return (
    <div className="bg-card/50 mb-8 rounded-2xl border p-5">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
            <Bot className="text-primary h-6 w-6" />
          </div>
          <div>
            <div className="text-muted-foreground mb-0.5 text-sm">Your agent is managing</div>
            <div className="text-2xl font-bold">
              <Currency value={userStats.staked} animated compact />
              <span className="text-muted-foreground ml-1 text-base font-normal">staked</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-6 sm:items-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-sky-500">
              <Currency value={userStats.projectedReward} animated compact />
            </div>
            <div className="text-muted-foreground text-xs">projected reward</div>
          </div>
          <button
            type="button"
            aria-label="Manage"
            className="hover:bg-muted/50 flex items-center gap-2 self-start rounded-lg border px-3 py-2 text-sm font-medium transition-colors sm:self-center"
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Manage</span>
          </button>
        </div>
      </div>
    </div>
  );
}
