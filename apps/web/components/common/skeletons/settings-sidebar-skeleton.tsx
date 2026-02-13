import { Skeleton } from "@/components/ui/skeleton";

function SidebarCardSkeleton() {
  return <Skeleton className="h-24 w-full rounded-2xl" />;
}

export function SettingsSidebarSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4">
      <SidebarCardSkeleton />
      <SidebarCardSkeleton />
      <SidebarCardSkeleton />
    </div>
  );
}
