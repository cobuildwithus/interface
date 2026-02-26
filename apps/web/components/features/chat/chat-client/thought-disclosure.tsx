"use client";

import type { ReactNode } from "react";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/shared/utils";

type ChatThoughtDisclosureProps = {
  label: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
};

export function ChatThoughtDisclosure({ label, isOpen, onToggle }: ChatThoughtDisclosureProps) {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      onClick={onToggle}
      className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center gap-1.5 text-base font-medium transition-colors"
    >
      <span className="text-left">{label}</span>
      <ChevronRightIcon className={cn("size-4 transition-transform")} />
    </button>
  );
}
