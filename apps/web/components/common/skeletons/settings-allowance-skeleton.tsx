import { Skeleton } from "@/components/ui/skeleton";

export function SettingsAllowanceSkeleton() {
  return (
    <div className="border-border/60 bg-background/80 space-y-4 rounded-2xl border p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
