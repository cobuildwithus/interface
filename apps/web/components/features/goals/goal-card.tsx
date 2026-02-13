"use client";

import Link from "next/link";
import { Currency } from "@/components/ui/currency";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatAge } from "@/lib/shared/format-age";

export type GoalStatus = "ongoing" | "completed";

export type Goal = {
  id: string;
  address: string;
  title: string;
  description: string;
  raised: number;
  target: number;
  status: GoalStatus;
  createdAt: Date;
  completedAt?: Date;
  contributorCount: number;
};

export function GoalCard({ goal }: { goal: Goal }) {
  const progress = Math.min((goal.raised / goal.target) * 100, 100);
  const isCompleted = goal.status === "completed";

  return (
    <Link
      href={`/${goal.address}`}
      className="bg-card border-border hover:border-border/80 hover:bg-muted/30 flex h-full flex-col rounded-xl border p-5 transition-all"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{goal.title}</h3>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{goal.description}</p>
        </div>
        {isCompleted && (
          <span className="shrink-0 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400">
            Completed
          </span>
        )}
      </div>

      <div className="mt-auto">
        <ProgressBar
          value={goal.raised}
          max={goal.target}
          className={`h-2 ${isCompleted ? "opacity-60" : ""}`}
        />
        <div className="mt-2 flex items-baseline gap-1.5">
          <Currency value={goal.raised} kind="usd" compact className="text-lg font-semibold" />
          <span className="text-muted-foreground text-sm">
            / <Currency value={goal.target} kind="usd" compact />
          </span>
          <span className="text-muted-foreground ml-auto text-xs">{progress.toFixed(0)}%</span>
        </div>

        <div className="text-muted-foreground mt-4 flex items-center gap-4 text-xs">
          <span>{goal.contributorCount} contributors</span>
          <span className="ml-auto">{formatAge(goal.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
