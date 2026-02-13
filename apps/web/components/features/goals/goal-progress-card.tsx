import { ProgressBar } from "@/components/ui/progress-bar";
import { Currency } from "@/components/ui/currency";

interface GoalProgressCardProps {
  title: string;
  raised: number;
  goal: number;
}

export function GoalProgressCard({ title, raised, goal }: GoalProgressCardProps) {
  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      <div className="space-y-3">
        <ProgressBar value={raised} max={goal} className="h-3" />

        <div className="flex items-baseline gap-1.5">
          <Currency value={raised} kind="usd" compact className="text-2xl font-bold" />
          <span className="text-muted-foreground text-sm">
            / <Currency value={goal} kind="usd" compact /> raised
          </span>
        </div>
      </div>
    </div>
  );
}
