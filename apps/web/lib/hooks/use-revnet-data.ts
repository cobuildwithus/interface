"use client";

import { useQuery } from "@tanstack/react-query";
import type { RevnetData } from "@/lib/domains/token/onchain/revnet-data";
import { COBUILD_PROJECT_ID } from "@/lib/domains/token/onchain/revnet";
import { getRevnetDataQueryKey } from "@/lib/hooks/query-keys";

export async function fetchRevnetData(url: string): Promise<RevnetData> {
  const response = await fetch(url);
  return response.json();
}

export function useRevnetData(projectId: bigint = COBUILD_PROJECT_ID) {
  const url =
    projectId === COBUILD_PROJECT_ID
      ? "/api/revnet"
      : `/api/revnet?projectId=${projectId.toString()}`;

  const query = useQuery({
    queryKey: getRevnetDataQueryKey(projectId),
    queryFn: () => fetchRevnetData(url),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
  };
}
