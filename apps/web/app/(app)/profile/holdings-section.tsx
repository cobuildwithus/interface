import Link from "next/link";
import { Target } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Currency } from "@/components/ui/currency";

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return "1 month ago";
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  if (diffDays < 730) return "1 year ago";
  return `${Math.floor(diffDays / 365)} years ago`;
}

type Holding = {
  id: string;
  name: string;
  raised: number;
  target: number;
  yourContribution: number;
  firstContributedAt: Date;
  completedAt?: Date;
  status: "ongoing" | "completed";
};

const FAKE_HOLDINGS: Holding[] = [
  {
    id: "1",
    name: "Raise $1M for open source",
    raised: 127500,
    target: 1000000,
    yourContribution: 2450,
    firstContributedAt: new Date("2025-11-15"),
    status: "ongoing",
  },
  {
    id: "2",
    name: "Onboard 100 new cobuilders",
    raised: 34521,
    target: 50000,
    yourContribution: 1640,
    firstContributedAt: new Date("2025-12-01"),
    status: "ongoing",
  },
  {
    id: "3",
    name: "Ship mobile app v1",
    raised: 75000,
    target: 75000,
    yourContribution: 900,
    firstContributedAt: new Date("2025-10-22"),
    completedAt: new Date("2026-01-27"),
    status: "completed",
  },
  {
    id: "4",
    name: "Launch grants program",
    raised: 22000,
    target: 100000,
    yourContribution: 550,
    firstContributedAt: new Date("2026-01-10"),
    status: "ongoing",
  },
  {
    id: "5",
    name: "Build creator dashboard",
    raised: 8500,
    target: 25000,
    yourContribution: 375,
    firstContributedAt: new Date("2026-01-20"),
    status: "ongoing",
  },
];

function HoldingRow({ holding }: { holding: Holding }) {
  const progress = Math.min((holding.raised / holding.target) * 100, 100);
  const isCompleted = holding.status === "completed";

  return (
    <div className="hover:bg-muted/30 px-4 py-4 transition-colors">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="font-medium">{holding.name}</span>
          {isCompleted && (
            <span className="ml-2 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
              Completed
            </span>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-medium">
            <Currency value={holding.yourContribution} kind="usd" compact />
          </div>
        </div>
      </div>

      <ProgressBar
        value={holding.raised}
        max={holding.target}
        className={`h-1.5 ${isCompleted ? "opacity-60" : ""}`}
      />

      <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <Currency
            value={holding.raised}
            kind="usd"
            compact
            className="text-foreground font-medium"
          />
          <span>
            / <Currency value={holding.target} kind="usd" compact />
          </span>
          <span className="ml-1">({progress.toFixed(0)}%)</span>
        </div>
        <div>
          {isCompleted && holding.completedAt ? (
            <span>
              Funded {formatTimeAgo(holding.firstContributedAt)} · succeeded{" "}
              {formatTimeAgo(holding.completedAt)}
            </span>
          ) : (
            <span>Funded {formatTimeAgo(holding.firstContributedAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function HoldingsSection() {
  const holdings = FAKE_HOLDINGS;
  const totalContribution = holdings.reduce((sum, h) => sum + h.yourContribution, 0);
  const totalHoldings = holdings.length;

  return (
    <div className="border-border bg-card/50 overflow-hidden rounded-xl border">
      <div className="border-border/60 border-b px-4 py-4">
        <h3 className="text-lg font-medium">Goals</h3>
      </div>

      <div className="border-border/60 bg-muted/20 grid grid-cols-2 gap-4 border-b px-4 py-3">
        <div>
          <div className="text-muted-foreground text-xs tracking-wide uppercase">
            Total Contributed
          </div>
          <div className="text-xl font-semibold tabular-nums">
            <Currency value={totalContribution} kind="usd" compact />
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs tracking-wide uppercase">Goals Funded</div>
          <div className="text-xl font-semibold tabular-nums">{totalHoldings}</div>
        </div>
      </div>

      {holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
          <Target className="text-muted-foreground/40 mb-3 size-8" />
          <p className="text-muted-foreground mb-1 text-sm font-medium">No goals funded yet</p>
          <p className="text-muted-foreground/70 mb-3 max-w-[240px] text-xs">
            Fund a goal to support projects and earn tokens as goals succeed.
          </p>
          <Link href="/goals" className="text-primary text-sm font-medium hover:underline">
            Explore goals
          </Link>
        </div>
      ) : (
        <div className="divide-border/60 divide-y">
          {holdings.map((holding) => (
            <HoldingRow key={holding.id} holding={holding} />
          ))}
        </div>
      )}
    </div>
  );
}
