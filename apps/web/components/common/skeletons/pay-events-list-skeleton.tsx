import { Skeleton } from "@/components/ui/skeleton";

export function PayEventsListSkeleton() {
  return (
    <div className="divide-border divide-y">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
