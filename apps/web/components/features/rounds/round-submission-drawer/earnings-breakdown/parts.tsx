"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Currency } from "@/components/ui/currency";
import { cn } from "@/lib/shared/utils";

export function BreakdownItem({
  icon,
  iconBg,
  title,
  subtitle,
  amount,
  expanded,
  onToggle,
  expandedContent,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  amount: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  expandedContent?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-border/60 rounded-xl border transition-all",
        expanded && "ring-foreground/20 ring-1"
      )}
    >
      <Button
        variant="ghost"
        onClick={onToggle}
        className={cn(
          "hover:bg-accent/40 flex h-auto w-full items-center justify-between gap-3 p-4 text-left",
          expanded ? "rounded-t-xl rounded-b-none" : "rounded-xl"
        )}
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: iconBg }}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-foreground font-semibold">{title}</div>
            <div className="text-foreground/80 text-sm">{subtitle}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-foreground text-lg font-semibold tabular-nums">{amount}</span>
          <ChevronDown
            size={16}
            className={cn("text-muted-foreground transition-transform", expanded && "rotate-180")}
          />
        </div>
      </Button>
      {expanded && expandedContent && (
        <div className="border-border/60 border-t px-4 py-4 text-sm">{expandedContent}</div>
      )}
    </div>
  );
}

export function QuadraticExpandedContent({
  raisedUsd,
  matchUsd,
  backers,
}: {
  raisedUsd: number;
  matchUsd: number;
  backers: number;
}) {
  const raised = Math.max(0, raisedUsd);
  const match = Math.max(0, matchUsd);
  const matchMultiplier = raised > 0 ? match / raised : null;

  const size = 104;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const maxMultiplier = 20;
  const multiplierProgress = matchMultiplier ? Math.min(matchMultiplier / maxMultiplier, 1) : 0;
  const dashOffset = circumference * (1 - multiplierProgress);

  return (
    <div className="space-y-4">
      <p className="text-foreground/80 leading-6">More unique backers → bigger matching.</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative mx-auto flex size-28 items-center justify-center text-center">
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              stroke="currentColor"
              fill="none"
              opacity={0.15}
              className="text-muted-foreground"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              stroke="#10b981"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums" style={{ color: "#10b981" }}>
              {matchMultiplier != null
                ? `${matchMultiplier >= 100 ? Math.round(matchMultiplier) : matchMultiplier.toFixed(1)}x`
                : "--"}
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/70">Backers</span>
            <span className="font-medium tabular-nums">{backers}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/70">Volume</span>
            <Currency value={raisedUsd} className="font-medium tabular-nums" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/70">Match</span>
            <Currency value={matchUsd} className="font-medium tabular-nums" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AiDuelsExpandedContent({
  winRatePercent,
  sharePercent,
}: {
  winRatePercent: number | null;
  sharePercent: number | null;
}) {
  const shareValue = clampPercent(sharePercent ?? 0);

  return (
    <div className="space-y-4">
      <p className="text-foreground/80 leading-6">AI-judged duels between posts.</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <WinRateRing percent={winRatePercent} />
        <div className="flex-1 space-y-2">
          <p className="text-foreground/70 text-xs tracking-wide uppercase">Share of rewards</p>
          <ProgressBar percent={shareValue} fillColor="#8b5cf6" trackColor="#c4b5fd" />
          <p className="text-foreground/70 text-xs">
            {sharePercent != null ? `~${sharePercent.toFixed(1)}% of pool` : "Still running duels…"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({
  percent,
  fillColor,
  trackColor,
}: {
  percent: number;
  fillColor: string;
  trackColor: string;
}) {
  const clamped = clampPercent(percent);
  return (
    <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
      <div
        className="transition-all"
        style={{ width: `${clamped}%`, backgroundColor: fillColor }}
      />
      <div
        className="transition-all"
        style={{ width: `${100 - clamped}%`, backgroundColor: trackColor }}
      />
    </div>
  );
}

function WinRateRing({ percent }: { percent: number | null }) {
  const size = 104;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = clampPercent(percent ?? 0) / 100;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative mx-auto flex size-28 items-center justify-center text-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
          opacity={0.15}
          className="text-muted-foreground"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="#8b5cf6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tabular-nums">
          {percent != null ? `${Math.round(percent)}%` : "--"}
        </span>
        <span className="text-foreground/70 text-xs">win rate</span>
      </div>
    </div>
  );
}

export function formatBackers(count: number): string {
  return `${count} backer${count !== 1 ? "s" : ""}`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
