import { Skeleton } from "@/components/ui/skeleton";

function RulesCardSkeleton() {
  return (
    <div className="border-border/60 bg-background/80 space-y-4 rounded-2xl border p-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TokenFiltersSkeleton() {
  return (
    <div className="border-border/60 bg-background/80 space-y-4 rounded-2xl border p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="grid gap-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-12 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

export function SettingsRulesSkeleton() {
  return (
    <div className="space-y-6">
      <RulesCardSkeleton />
      <TokenFiltersSkeleton />
    </div>
  );
}
