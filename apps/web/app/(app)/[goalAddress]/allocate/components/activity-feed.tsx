import { Currency } from "@/components/ui/currency";
import type { AgentActivity } from "./types";
import { formatTimeAgo } from "./utils";

type ActivityFeedProps = {
  recentActivity: AgentActivity[];
};

export function ActivityFeed({ recentActivity }: ActivityFeedProps) {
  return (
    <div>
      <h2 className="text-muted-foreground mb-4 text-sm font-medium tracking-wider uppercase">
        Recent Activity
      </h2>
      <div className="space-y-4">
        {recentActivity.map((activity) => (
          <div key={activity.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`mt-1.5 h-2 w-2 rounded-full ${activity.isPositive ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <div className="bg-border mt-1 w-px flex-1" />
            </div>
            <div className="flex-1 pb-4">
              <div className="mb-0.5 flex items-baseline justify-between gap-2">
                <span
                  className={`text-sm font-medium tabular-nums ${activity.isPositive ? "text-emerald-500" : "text-amber-500"}`}
                >
                  {activity.isPositive ? "+" : "−"}
                  <Currency value={activity.amount} compact />
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
              <div className="text-muted-foreground text-sm">
                {activity.action} → {activity.sgTitle}
              </div>
              <p className="text-muted-foreground/70 mt-1 text-xs">{activity.reason}</p>
            </div>
          </div>
        ))}
      </div>

      <button className="text-muted-foreground hover:text-foreground w-full py-2 text-center text-xs transition-colors">
        View All Activity
      </button>
    </div>
  );
}
