"use client";

import { useEffect, useRef, useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";

const DEFAULT_STORAGE_KEY = "cobuild:member-count";

type MillionMemberGoalProgressProps = {
  count: number;
  goal: number;
  storageKey?: string;
  durationMs?: number;
};

function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useAnimatedCount(target: number, storageKey: string, durationMs: number): number {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Animation updates state over time; the lint rule doesn't account for RAF-driven updates.
    /* eslint-disable react-hooks/set-state-in-effect */
    const raw = localStorage.getItem(storageKey);
    const previous = raw ? Number(raw) : Number.NaN;
    const start = Number.isFinite(previous) ? previous : target;

    localStorage.setItem(storageKey, String(target));

    if (!Number.isFinite(start) || start >= target) {
      setValue(target);
      return;
    }

    setValue(start);

    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = easeOutCubic(progress);
      const next = Math.round(start + (target - start) * eased);
      setValue(next);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [target, storageKey, durationMs]);

  return value;
}

export function MillionMemberGoalProgress({
  count,
  goal,
  storageKey = DEFAULT_STORAGE_KEY,
  durationMs = 900,
}: MillionMemberGoalProgressProps) {
  const animatedCount = useAnimatedCount(count, storageKey, durationMs);

  return (
    <div className="space-y-3">
      <ProgressBar value={animatedCount} max={goal} className="h-3" />

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular-nums">{formatNumber(animatedCount)}</span>
        <span className="text-muted-foreground text-sm">/ {formatNumber(goal)} cobuilders</span>
      </div>
    </div>
  );
}
