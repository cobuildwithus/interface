import { Skeleton } from "@/components/ui/skeleton";

export function ProfileListSkeleton() {
  return (
    <div>
      <Skeleton className="mb-4 h-4 w-32" />
      <div className="space-y-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-muted border-l-2 py-3 pl-4">
            <Skeleton className="mb-1 h-3 w-16" />
            <Skeleton className="h-4 w-full max-w-xs" />
          </div>
        ))}
      </div>
    </div>
  );
}
