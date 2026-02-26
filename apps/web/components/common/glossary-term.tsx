"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/shared/utils";

type GlossaryTermProps = {
  term: string;
  title?: string;
  definition: string;
  className?: string;
};

export function GlossaryTerm({ term, title, definition, className }: GlossaryTermProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "cursor-help border-b border-dotted border-neutral-500 transition-colors hover:border-white hover:text-white",
            className
          )}
        >
          {term}
        </span>
      </TooltipTrigger>
      <TooltipContent
        className="w-72 rounded-lg border border-neutral-700 bg-black p-0 shadow-2xl"
        sideOffset={8}
        hideArrow
      >
        <div className="border-b border-neutral-800 px-4 py-2.5">
          <span className="font-mono text-[10px] font-medium tracking-widest text-neutral-500 uppercase">
            {title ?? term}
          </span>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm leading-relaxed text-neutral-300">{definition}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
