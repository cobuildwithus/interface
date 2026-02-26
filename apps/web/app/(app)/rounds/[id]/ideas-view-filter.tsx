"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/shared/utils";

export type IdeasView = "top" | "all" | "recent";

const VIEW_OPTIONS: { value: IdeasView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "top", label: "Top" },
  { value: "recent", label: "Recent" },
];

export function IdeasViewFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentView = (searchParams.get("view") as IdeasView) || "all";

  const setView = (value: IdeasView) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete("view");
    } else {
      params.set("view", value);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex gap-0.5">
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setView(option.value)}
          className={cn(
            "cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors",
            currentView === option.value
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
