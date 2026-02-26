import { Skeleton } from "@/components/ui/skeleton";

export function ContextStatsSkeleton() {
  return (
    <div className="bg-card/50 flex items-center gap-4 rounded-lg border p-4">
      {/* Number badge skeleton */}
      <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />

      {/* Content skeleton */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Chevron skeleton */}
      <Skeleton className="h-5 w-5 shrink-0" />
    </div>
  );
}
