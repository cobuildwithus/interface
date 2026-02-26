"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SortToggle, type SortOption } from "@/components/ui/sort-toggle";
import type { ParticipantSort } from "@/lib/domains/token/juicebox/participants";

const OPTIONS: SortOption<ParticipantSort>[] = [
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
];

export function HoldersSortFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sort = (searchParams.get("sort") as ParticipantSort) || "new";

  const setSort = (value: ParticipantSort) => {
    const params = new URLSearchParams(searchParams);
    if (value === "new") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return <SortToggle options={OPTIONS} value={sort} onChange={setSort} />;
}
