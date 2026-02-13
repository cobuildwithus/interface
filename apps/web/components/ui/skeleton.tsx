import { cn } from "@/lib/shared/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted animate-[pulse_1s_ease-in-out_infinite] rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
