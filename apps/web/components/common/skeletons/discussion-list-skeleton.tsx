import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROW_COUNT = 24;

export function DiscussionListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Top row with pagination and new post button */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-4" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="border-border divide-border bg-card divide-y overflow-hidden rounded-2xl border shadow-sm">
        {/* Column headers - hidden on mobile */}
        <div className="bg-muted/50 hidden items-center gap-4 px-6 py-2 md:flex">
          <div className="min-w-0 flex-1">
            <span className="text-muted-foreground text-xs font-medium">Topic</span>
          </div>
          <div className="flex shrink-0 items-center gap-6 text-center">
            <div className="text-muted-foreground w-40 text-left text-xs font-medium">
              Started by
            </div>
            <div className="text-muted-foreground w-14 text-xs font-medium">Replies</div>
            <div className="text-muted-foreground w-14 text-xs font-medium">Views</div>
            <div className="text-muted-foreground w-28 text-right text-xs font-medium">
              Last Post
            </div>
          </div>
        </div>
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-5">
            <div className="min-w-0 flex-1">
              {/* Match text-base leading-snug = ~22px */}
              <Skeleton className="h-[22px] w-3/4" />
            </div>
            {/* Stats columns - hidden on mobile */}
            <div className="hidden shrink-0 items-center gap-6 text-center md:flex">
              <div className="flex w-40 items-center gap-1.5">
                <Skeleton className="h-[18px] w-[18px] shrink-0 rounded-full" />
                <Skeleton className="h-4 w-14" />
              </div>
              <div className="w-14">
                <Skeleton className="mx-auto h-4 w-8" />
              </div>
              <div className="w-14">
                <Skeleton className="mx-auto h-4 w-10" />
              </div>
              {/* Match DateTime text-xs + author text-[10px] */}
              <div className="w-28 space-y-0.5 text-right">
                <Skeleton className="ml-auto h-4 w-16" />
                <Skeleton className="ml-auto h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-2">
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}
