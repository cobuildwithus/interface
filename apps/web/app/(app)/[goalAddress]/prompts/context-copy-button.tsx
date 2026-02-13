"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared/utils";

type ContextCopyButtonProps = Omit<React.ComponentProps<typeof Button>, "children" | "onClick"> & {
  value: string;
  label?: string;
  copiedLabel?: string;
  showLabel?: boolean;
};

export function ContextCopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  showLabel = false,
  className,
  ...props
}: ContextCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <Button
      type="button"
      onClick={handleCopy}
      className={cn(showLabel && "gap-2", className)}
      aria-label={showLabel ? undefined : label}
      {...props}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {showLabel ? (copied ? copiedLabel : label) : null}
    </Button>
  );
}
