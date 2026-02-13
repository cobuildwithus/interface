"use client";

import { useState, useCallback } from "react";
import { Button } from "./button";

interface CopyToClipboardProps {
  text: string;
  children: string;
  className?: string;
}

export function CopyToClipboard({ text, children, className }: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [text]);

  return (
    <Button
      variant="ghost"
      onClick={handleCopy}
      className={`h-auto p-0 hover:bg-transparent hover:underline hover:decoration-dashed hover:underline-offset-2 ${className ?? ""}`}
    >
      {copied ? "Copied" : children}
    </Button>
  );
}
