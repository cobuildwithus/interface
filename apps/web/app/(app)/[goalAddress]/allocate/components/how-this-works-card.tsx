import { X, Coins, Timer, Trophy } from "lucide-react";

type HowThisWorksCardProps = {
  isVisible: boolean;
  isPending: boolean;
  onDismiss: () => void;
};

export function HowThisWorksCard({ isVisible, isPending, onDismiss }: HowThisWorksCardProps) {
  if (!isVisible) return null;

  return (
    <div className="relative mb-6 rounded-2xl border bg-gradient-to-r from-sky-500/5 via-transparent to-emerald-500/5 p-5">
      <button
        className="text-muted-foreground hover:text-foreground hover:bg-muted/50 absolute top-3 right-3 rounded-lg p-1.5 transition-colors"
        aria-label="Dismiss"
        onClick={onDismiss}
        disabled={isPending}
      >
        <X className="h-4 w-4" />
      </button>

      <h2 className="mb-4 text-sm font-semibold">How This Works</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <Coins className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <div className="mb-0.5 text-sm font-medium">Stake directs funding</div>
            <div className="text-muted-foreground text-xs">
              Your agent places stake on sub-goals. More stake = more funding flows there.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
            <Timer className="h-4 w-4 text-sky-500" />
          </div>
          <div>
            <div className="mb-0.5 text-sm font-medium">Time builds rewards</div>
            <div className="text-muted-foreground text-xs">
              The longer you stay staked, the bigger your share of rewards. Early = better.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
            <Trophy className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <div className="mb-0.5 text-sm font-medium">Success unlocks rewards</div>
            <div className="text-muted-foreground text-xs">
              Rewards are locked until the main goal succeeds. If it fails, you keep your stake but
              forfeit rewards.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
