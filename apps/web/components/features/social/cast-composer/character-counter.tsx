"use client";

import { cn } from "@/lib/shared/utils";

const WARNING_THRESHOLD = 0.9;

type CharacterCounterProps = {
  count: number;
  limit: number;
  size?: number;
};

export function CharacterCounter({ count, limit, size = 24 }: CharacterCounterProps) {
  const percentage = Math.min(count / limit, 1);
  const isWarning = percentage >= WARNING_THRESHOLD;
  const isOver = count > limit;
  const remaining = limit - count;

  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            "transition-all duration-150",
            isOver ? "text-destructive" : isWarning ? "text-amber-500" : "text-primary"
          )}
        />
      </svg>
      {/* Show remaining count when close to limit */}
      {(isWarning || isOver) && (
        <span
          className={cn(
            "absolute text-[10px] font-medium",
            isOver ? "text-destructive" : "text-amber-500"
          )}
        >
          {remaining}
        </span>
      )}
    </div>
  );
}
