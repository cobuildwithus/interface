import { Skeleton } from "@/components/ui/skeleton";

export function TreasuryChartSkeleton() {
  return (
    <div className="bg-muted/30 w-full rounded-xl border p-5">
      <div className="mb-1 flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="mt-4 h-[180px] w-full rounded" />
    </div>
  );
}
