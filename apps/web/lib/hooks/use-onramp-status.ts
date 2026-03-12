"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ONRAMP_STATUS_QUERY_KEY } from "@/lib/hooks/query-keys";

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
  const query = useQuery({
    queryKey: ONRAMP_STATUS_QUERY_KEY,
    queryFn: fetchOnrampStatus,
    refetchOnWindowFocus: false,
    retry: false,
    refetchInterval: ({ state }) => {
      if (state.error instanceof UnauthorizedError) {
        return false;
      }

      const latestData = state.data as StatusResponse | undefined;
      const status = latestData?.tx?.status;
      if (
        status === "ONRAMP_TRANSACTION_STATUS_SUCCESS" ||
        status === "ONRAMP_TRANSACTION_STATUS_FAILED" ||
        timedOut
      ) {
        return false;
      }

      if (startRef.current === null) {
        startRef.current = Date.now();
      }
      const elapsed = Date.now() - (startRef.current ?? 0);
      if (elapsed > MAX_MS) {
        return false;
      }

      const step = Math.min(stepRef.current, BACKOFF.length - 1);
      const jitter = Math.random() * 0.4 + 0.8;
      stepRef.current = Math.min(stepRef.current + 1, BACKOFF.length - 1);
      return Math.round(BACKOFF[step] * jitter);
    },
  });

  useEffect(() => {
    if (startRef.current === null) {
      startRef.current = Date.now();
    }
    const timeout = window.setTimeout(() => setTimedOut(true), MAX_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  const tx = query.data?.tx ?? null;
  const isUnauthorized = query.error instanceof UnauthorizedError;
  const status = tx?.status ?? null;

  let state: StatusState = "idle";
  if (isUnauthorized) {
    state = "unauthorized";
  } else if (status === "ONRAMP_TRANSACTION_STATUS_SUCCESS") {
    state = "success";
  } else if (status === "ONRAMP_TRANSACTION_STATUS_FAILED") {
    state = "failed";
  } else if (timedOut) {
    state = "timeout";
  } else if (query.isLoading || query.isFetching) {
    state = "polling";
  }

  return { tx, state };
}

export type { OnrampTx, StatusResponse, StatusState };
