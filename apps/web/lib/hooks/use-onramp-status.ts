"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

type OnrampTx = null | {
  status:
    | "ONRAMP_TRANSACTION_STATUS_IN_PROGRESS"
    | "ONRAMP_TRANSACTION_STATUS_SUCCESS"
    | "ONRAMP_TRANSACTION_STATUS_FAILED";
  transaction_id: string;
  tx_hash?: string;
  purchase_network?: string;
  purchase_currency?: string;
  purchase_amount?: string;
  wallet_address?: string;
};

type StatusState = "idle" | "polling" | "success" | "failed" | "timeout" | "unauthorized";

type StatusResponse = {
  tx: OnrampTx;
  error?: string;
};

const MAX_MS = 4 * 60 * 1000;
const BACKOFF = [2000, 3000, 5000, 8000, 13000] as const;

class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

async function fetchOnrampStatus(): Promise<StatusResponse> {
  const res = await fetch("/api/onramp-status", { cache: "no-store" });
  if (res.status === 401) {
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    throw new Error("Status failed");
  }
  return res.json();
}

export function useOnrampStatus() {
  const [timedOut, setTimedOut] = useState(false);
  const startRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  const errorRef = useRef<Error | null>(null);

  const { data, error, isLoading, isValidating } = useSWR<StatusResponse>(
    "/api/onramp-status",
    fetchOnrampStatus,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      refreshInterval: (latestData) => {
        if (errorRef.current instanceof UnauthorizedError) return 0;
        const status = latestData?.tx?.status;
        if (
          status === "ONRAMP_TRANSACTION_STATUS_SUCCESS" ||
          status === "ONRAMP_TRANSACTION_STATUS_FAILED" ||
          timedOut
        ) {
          return 0;
        }

        if (startRef.current === null) {
          startRef.current = Date.now();
        }
        const elapsed = Date.now() - (startRef.current ?? 0);
        if (elapsed > MAX_MS) {
          return 0;
        }

        const step = Math.min(stepRef.current, BACKOFF.length - 1);
        const jitter = Math.random() * 0.4 + 0.8;
        stepRef.current = Math.min(stepRef.current + 1, BACKOFF.length - 1);
        return Math.round(BACKOFF[step] * jitter);
      },
    }
  );

  useEffect(() => {
    if (startRef.current === null) {
      startRef.current = Date.now();
    }
    const timeout = window.setTimeout(() => setTimedOut(true), MAX_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    errorRef.current = error ?? null;
  }, [error]);

  const tx = data?.tx ?? null;
  const isUnauthorized = error instanceof UnauthorizedError;
  const status = tx?.status ?? null;

  const state = useMemo<StatusState>(() => {
    if (isUnauthorized) return "unauthorized";
    if (status === "ONRAMP_TRANSACTION_STATUS_SUCCESS") return "success";
    if (status === "ONRAMP_TRANSACTION_STATUS_FAILED") return "failed";
    if (timedOut) return "timeout";
    if (isLoading || isValidating) return "polling";
    return "idle";
  }, [isLoading, isUnauthorized, isValidating, status, timedOut]);

  return { tx, state };
}

export type { OnrampTx, StatusResponse, StatusState };
