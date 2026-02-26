"use client";

import { DateTime } from "@/components/ui/date-time";
import { useNow } from "@/lib/hooks/use-now";

function toDateOrNull(value: string | null): Date | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms);
}

export function RoundCountdown({
  startAt,
  endAt,
  rewardAmount,
}: {
  startAt: string | null;
  endAt: string | null;
  rewardAmount?: number | null;
}) {
  const nowMs = useNow({ intervalMs: 1000 });
  const startDate = toDateOrNull(startAt);
  const endDate = toDateOrNull(endAt);

  return (
    <p className="text-muted-foreground mb-4 text-sm">
      {startDate && nowMs < startDate.getTime() ? (
        <>
          <DateTime date={startDate} relative short className="tabular-nums" /> until start
        </>
      ) : endDate && nowMs < endDate.getTime() ? (
        <>
          <DateTime date={endDate} relative short className="tabular-nums" /> remaining
        </>
      ) : endDate ? (
        "Round ended"
      ) : startDate ? (
        <>
          Started <DateTime date={startDate} relative short className="tabular-nums" /> ago
        </>
      ) : (
        "Round timing TBD"
      )}
      {rewardAmount != null ? (
        <>
          {" · "}
          <span className="text-foreground font-medium">{rewardAmount}&nbsp;$COBUILD</span> reward
        </>
      ) : null}
    </p>
  );
}
