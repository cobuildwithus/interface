"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type LoadMoreButtonProps = {
  onClick: () => void;
  isPending: boolean;
};

export function LoadMoreButton({ onClick, isPending }: LoadMoreButtonProps) {
  return (
    <div className="flex justify-center">
      <Button variant="outline" onClick={onClick} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="animate-spin" />
            Loading…
          </>
        ) : (
          "Load more"
        )}
      </Button>
    </div>
  );
}
