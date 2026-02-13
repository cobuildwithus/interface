import { Skeleton } from "@/components/ui/skeleton";

export function RevnetActionsSkeleton() {
  return (
    <div className="bg-background/80 border-border rounded-xl border p-5 backdrop-blur-md">
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}
