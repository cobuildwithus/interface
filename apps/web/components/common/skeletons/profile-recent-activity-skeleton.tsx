import { Skeleton } from "@/components/ui/skeleton";

export function ProfileRecentActivitySkeleton() {
  return (
    <div className="border-border bg-card/50 rounded-xl border">
      <div className="border-border/60 border-b px-6 py-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 py-2">
              <Skeleton className="size-3 shrink-0" />
              <Skeleton className="size-[18px] shrink-0 rounded-full" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="ml-auto h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
