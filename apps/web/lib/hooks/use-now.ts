"use client";

import { useEffect, useState } from "react";

type UseNowOptions = {
  intervalMs?: number;
  initialNowMs?: number;
};

export function useNow(options: UseNowOptions = {}): number {
  const { intervalMs = 1000, initialNowMs } = options;
  const [nowMs, setNowMs] = useState(() => initialNowMs ?? Date.now());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = () => setNowMs(Date.now());

    const start = () => {
      if (interval) return;
      tick();
      interval = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    };

    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs]);

  return nowMs;
}
