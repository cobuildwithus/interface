"use client";

import useSWR from "swr";
import type { LinkedAccountsResponse } from "@/lib/domains/auth/linked-accounts/types";

const EMPTY_RESPONSE: LinkedAccountsResponse = {
  address: null,
  accounts: [],
};

export async function fetchLinkedAccounts(): Promise<LinkedAccountsResponse> {
  try {
    const res = await fetch("/api/linked-accounts", { cache: "no-store" });
    if (!res.ok) return EMPTY_RESPONSE;
    return (await res.json()) as LinkedAccountsResponse;
  } catch {
    return EMPTY_RESPONSE;
  }
}

export function useLinkedAccounts() {
  const { data, isLoading, mutate } = useSWR<LinkedAccountsResponse>(
    "/api/linked-accounts",
    fetchLinkedAccounts,
    { revalidateOnFocus: false }
  );

  return {
    data: data ?? EMPTY_RESPONSE,
    isLoading,
    mutate,
  };
}
