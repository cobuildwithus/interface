import { Skeleton } from "@/components/ui/skeleton";

export function ProfileStatItemSkeleton() {
  return (
    <div className="text-center md:text-left">
      <Skeleton className="mx-auto h-5 w-10 md:mx-0 md:inline-block" />
      <Skeleton className="mx-auto mt-1 h-4 w-16 md:mx-0 md:mt-0 md:ml-2 md:inline-block" />
    </div>
  );
}

export function ProfileStatsSkeleton() {
  return (
    <div className="-mx-4 grid grid-cols-3 gap-4 border-y px-4 py-4 md:-mx-6 md:flex md:gap-x-10 md:px-6">
      {Array.from({ length: 5 }).map((_, index) => (
        <ProfileStatItemSkeleton key={index} />
      ))}
    </div>
  );
}
