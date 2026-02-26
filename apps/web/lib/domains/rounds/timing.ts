type RoundTimingErrorCode = "not_started" | "ended";

function coerceRoundBoundary(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms);
}

export function getRoundTimingError(params: {
  startAt: string | Date | null;
  endAt: string | Date | null;
  nowMs?: number;
}): { code: RoundTimingErrorCode; message: string } | null {
  const nowMs = params.nowMs ?? Date.now();
  const startAt = coerceRoundBoundary(params.startAt);
  const endAt = coerceRoundBoundary(params.endAt);

  if (startAt && nowMs < startAt.getTime()) {
    return { code: "not_started", message: "This round hasn't started yet." };
  }

  if (endAt && nowMs >= endAt.getTime()) {
    return { code: "ended", message: "This round is over." };
  }

  return null;
}
