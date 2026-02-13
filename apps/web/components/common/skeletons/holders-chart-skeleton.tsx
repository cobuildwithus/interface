import { Skeleton } from "@/components/ui/skeleton";

export function HoldersChartSkeleton() {
  return (
    <div className="bg-muted/30 col-span-full row-span-3 flex min-h-[280px] flex-col rounded-xl border p-5 sm:col-span-2">
      <div className="mb-4 flex gap-6">
        <div className="space-y-1">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <Skeleton className="min-h-0 flex-1 rounded" />
    </div>
  );
}
