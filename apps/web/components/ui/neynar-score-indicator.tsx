"use client";

import { forwardRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/shared/utils";

interface NeynarScoreIndicatorProps extends React.HTMLAttributes<HTMLButtonElement> {
  label?: string;
}

/**
 * Small amber dot indicator used to show an ineligible Neynar score.
 */
export const NeynarScoreIndicator = forwardRef<HTMLButtonElement, NeynarScoreIndicatorProps>(
  ({ className, label = "Boost ineligible: Neynar score too low", ...props }, ref) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            ref={ref}
            aria-label={label}
            className={cn(
              "ml-1 inline-flex size-3 items-center justify-center rounded-full focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:outline-none",
              className
            )}
            {...props}
          >
            <span
              className="inline-block size-2 rounded-full border border-amber-400"
              style={{
                backgroundColor: "rgba(252, 211, 77, 1)",
                boxShadow: "0 0 0 1px rgba(250, 204, 21, 0.5)",
              }}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    );
  }
);

NeynarScoreIndicator.displayName = "NeynarScoreIndicator";
