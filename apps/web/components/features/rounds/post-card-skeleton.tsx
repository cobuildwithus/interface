import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/shared/utils";

function PostCardSkeleton() {
  return (
    <div className="relative w-full px-4 py-3.5">
      <div className="flex items-start gap-3">
        <Skeleton className="mt-0.5 size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-[85%]" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="border-border divide-border divide-y overflow-hidden rounded-xl border">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

function IdeaRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3 pr-4 pl-6">
      <Skeleton className="size-[30px] shrink-0 rounded-full" />
      <Skeleton className="h-5 flex-1" />
      <Skeleton className="h-5 w-14 shrink-0" />
    </div>
  );
}

function IdeaSectionSkeleton({ count }: { count: number }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 py-1.5 pr-3 pl-1">
        <Skeleton className="size-3.5" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <IdeaRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function IdeasSkeletonList() {
  return (
    <div className="space-y-1">
      <IdeaSectionSkeleton count={5} />
      <IdeaSectionSkeleton count={3} />
    </div>
  );
}

const MEDIA_SKELETON_HEIGHTS = ["h-48", "h-64", "h-56", "h-72", "h-52", "h-60"];

export function MediaSkeletonGrid({ count = 9 }: { count?: number }) {
  return (
    <div className="columns-1 [column-gap:1rem] sm:columns-2 lg:columns-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "mb-4 w-full break-inside-avoid rounded-xl",
            MEDIA_SKELETON_HEIGHTS[i % MEDIA_SKELETON_HEIGHTS.length]
          )}
        />
      ))}
    </div>
  );
}
