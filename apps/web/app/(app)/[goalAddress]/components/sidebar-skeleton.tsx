export function SidebarSkeleton() {
  return (
    <div className="divide-border divide-y">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="py-2">
          <div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
          <div className="bg-muted mt-0.5 h-4 w-1/2 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}
