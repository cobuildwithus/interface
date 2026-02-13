import { Skeleton } from "@/components/ui/skeleton";

export function SettingsProfileSkeleton() {
  return (
    <div className="border-border/60 bg-background/80 space-y-5 rounded-2xl border p-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-56" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Skeleton className="h-[72px] w-[72px] rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}
