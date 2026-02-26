import { Skeleton } from "@/components/ui/skeleton";

export function SubmissionSidebarSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-2">
        <Skeleton className="h-20 flex-1 rounded-xl" />
        <Skeleton className="h-20 flex-1 rounded-xl" />
        <Skeleton className="h-20 flex-1 rounded-xl" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
    </div>
  );
}
