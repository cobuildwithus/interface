import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROW_COUNT = 3;

export function GoalChatsSkeleton() {
  return (
    <section>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
          <div
            key={`chat-skeleton-${index}`}
            className="border-border/50 bg-card flex items-center gap-3 rounded-lg border px-3 py-3"
          >
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-4" />
          </div>
        ))}
      </div>
    </section>
  );
}
