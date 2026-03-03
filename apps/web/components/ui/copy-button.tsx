"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared/utils";

type CopyButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  value: string;
  timeout?: number;
};

export function CopyButton({ value, timeout = 2000, className, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    } catch {
      // clipboard not available
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-7 shrink-0", className)}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      onClick={handleCopy}
      {...props}
    >
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
    </Button>
  );
}
