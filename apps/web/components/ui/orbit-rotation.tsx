"use client";

import { cn } from "@/lib/shared/utils";

interface OrbitIcon {
  Icon: React.ComponentType<{ className?: string }>;
  name?: string;
}

interface OrbitRotationProps {
  icons?: OrbitIcon[];
  orbitCount?: number;
  orbitGap?: number;
  centerIcon?: OrbitIcon;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function OrbitRotation({
  icons = [],
  orbitCount = 3,
  orbitGap = 6,
  centerIcon,
  className,
  size = "md",
  ...props
}: OrbitRotationProps) {
  const iconsPerOrbit = Math.ceil(icons.length / orbitCount);

  if (!centerIcon) {
    throw new Error("Center icon is required");
  }

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const iconSizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)} {...props}>
      <div className="relative flex items-center justify-center">
        {/* Center Icon */}
        <div
          className={cn(
            "bg-background/90 border-border/50 flex items-center justify-center rounded-full border shadow-xl backdrop-blur-sm",
            sizeClasses[size]
          )}
        >
          <centerIcon.Icon className={cn(iconSizeClasses[size])} />
        </div>

        {/* Generate Orbits */}
        {[...Array(orbitCount)].map((_, orbitIdx) => {
          const orbitSize = `${8 + orbitGap * (orbitIdx + 1)}rem`;
          const angleStep = (2 * Math.PI) / iconsPerOrbit;
          const animationDuration = `${12 + orbitIdx * 6}s`;

          return (
            <div
              key={orbitIdx}
              className="border-muted-foreground/30 absolute rounded-full border-2 border-dotted"
              style={{
                width: orbitSize,
                height: orbitSize,
                animation: `orbit-spin ${animationDuration} linear infinite`,
              }}
            >
              {icons
                .slice(orbitIdx * iconsPerOrbit, orbitIdx * iconsPerOrbit + iconsPerOrbit)
                .map((iconConfig, iconIdx) => {
                  const angle = iconIdx * angleStep;
                  const x = 50 + 50 * Math.cos(angle);
                  const y = 50 + 50 * Math.sin(angle);

                  return (
                    <div
                      key={iconIdx}
                      className="bg-background/80 border-border/50 absolute rounded-full border p-1 shadow-lg backdrop-blur-sm"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <iconConfig.Icon className={cn(iconSizeClasses[size])} />
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
