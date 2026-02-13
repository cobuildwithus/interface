import { Skeleton } from "@/components/ui/skeleton";

const PEOPLE_SKELETON_COUNT = 12;
const BUILDERS_SKELETON_COUNT = 6;

function PersonCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <Skeleton className="size-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function PeopleListSkeleton() {
  return (
    <>
      {Array.from({ length: PEOPLE_SKELETON_COUNT }).map((_, i) => (
        <PersonCardSkeleton key={i} />
      ))}
      <div className="col-span-full flex justify-center">
        <Skeleton className="h-10 w-32" />
      </div>
    </>
  );
}

export function BuildersListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: BUILDERS_SKELETON_COUNT }).map((_, i) => (
          <PersonCardSkeleton key={i} />
        ))}
      </div>
      <div className="flex justify-center">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
