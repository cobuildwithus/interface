"use client";

import useSWR from "swr";
import type { RevnetData } from "@/lib/domains/token/onchain/revnet-data";
import { COBUILD_PROJECT_ID } from "@/lib/domains/token/onchain/revnet";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRevnetData(projectId: bigint = COBUILD_PROJECT_ID) {
  const key =
    projectId === COBUILD_PROJECT_ID
      ? "/api/revnet"
      : `/api/revnet?projectId=${projectId.toString()}`;

  const { data, error, isLoading } = useSWR<RevnetData>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  return {
    data,
    error,
    isLoading,
  };
}
