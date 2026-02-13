"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/shared/utils";

export type SortBy = "top" | "recent";

const OPTIONS: SortBy[] = ["top", "recent"];

export function SortFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sortBy = (searchParams.get("sort") as SortBy) || "top";

  const setSort = (value: SortBy) => {
    const params = new URLSearchParams(searchParams);
    if (value === "top") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex gap-0.5">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setSort(option)}
          className={cn(
            "cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors",
            sortBy === option
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </button>
      ))}
    </div>
  );
}
