"use client";

import Image from "next/image";
import { OrbitRotation } from "@/components/ui/orbit-rotation";
import { cn } from "@/lib/shared/utils";

const projectIcons = Array.from({ length: 10 }).map((_, i) => {
  const opacity = 0.3 + (i % 5) * 0.1;

  return {
    Icon: ({ className }: { className?: string }) => (
      <div
        className={cn(
          `border-border bg-muted relative flex items-center justify-center rounded-full border`,
          className
        )}
      >
        <div className="bg-muted-foreground size-[60%] rounded-full" style={{ opacity }} />
      </div>
    ),
    name: `Project ${i + 1}`,
  };
});

export function LaunchpadOrbit() {
  return (
    <div className="relative aspect-square w-full max-w-[600px]">
      <OrbitRotation
        icons={projectIcons}
        orbitCount={3}
        orbitGap={7}
        size="lg"
        centerIcon={{ Icon: CenterLogo, name: "Cobuild" }}
        className="size-full"
      />
    </div>
  );
}

const CenterLogo = ({ className }: { className?: string }) => (
  <div className={cn("relative flex items-center justify-center rounded-full", className)}>
    <div className="relative size-16 md:size-20">
      <Image
        src="/logo-light.svg"
        alt="CoBuild Logo"
        fill
        className="block object-contain dark:hidden"
      />
      <Image
        src="/logo-dark.svg"
        alt="CoBuild Logo"
        fill
        className="hidden object-contain dark:block"
      />
    </div>
  </div>
);
