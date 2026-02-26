"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, XCircle } from "lucide-react";
import type { AiVerdict } from "@/lib/shared/ai-verdict";
import { cn } from "@/lib/shared/utils";

type AiVerdictPanelProps = {
  aiVerdict: AiVerdict;
};

export function AiVerdictPanel({ aiVerdict }: AiVerdictPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!aiVerdict.reason) return null;

  return (
    <button
      type="button"
      onClick={() => setExpanded((prev) => !prev)}
      className="border-border w-full border-b px-4 py-3 text-left"
    >
      <div className="flex items-start gap-3">
        {aiVerdict.isValid !== null &&
          (aiVerdict.isValid ? (
            <CheckCircle2 className="mt-0.5 size-[18px] shrink-0 text-emerald-400" />
          ) : (
            <XCircle className="mt-0.5 size-[18px] shrink-0 text-red-400" />
          ))}
        <p
          className={cn(
            "text-muted-foreground flex-1 text-sm leading-relaxed",
            !expanded && "line-clamp-2"
          )}
        >
          {aiVerdict.reason}
        </p>
        <ChevronDown
          className={cn(
            "text-muted-foreground mt-0.5 size-[14px] shrink-0 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </div>
    </button>
  );
}
