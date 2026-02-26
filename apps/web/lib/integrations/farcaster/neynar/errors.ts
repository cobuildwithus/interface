import type { ErrorLike } from "@/lib/shared/errors";

type ErrorWithStatus = {
  message?: string | null;
  status?: number | string | null;
};

export function getErrorMessage(err: ErrorLike, fallback: string): string {
  if (typeof err === "string") {
    const trimmed = err.trim();
    if (trimmed.length > 0) return trimmed;
  }
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as ErrorWithStatus).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}

export function getErrorStatus(err: ErrorLike): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as ErrorWithStatus).status;
    if (typeof status === "number") return status;
    if (typeof status === "string" && Number.isFinite(Number(status))) return Number(status);
  }
  return undefined;
}
