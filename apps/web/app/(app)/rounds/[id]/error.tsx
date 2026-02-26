"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RoundError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Round error:", error);
  }, [error]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="space-y-4 px-4 text-center">
        <h1 className="text-foreground text-2xl font-semibold">Failed to load round</h1>
        <p className="text-muted-foreground max-w-md">
          We couldn&apos;t load this round. It may not exist or there was a temporary issue.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link
            href="/"
            className="border-border hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
