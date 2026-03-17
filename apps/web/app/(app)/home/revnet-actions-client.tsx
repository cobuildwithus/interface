"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

type RevnetActionButtonsProps = {
  tokenLogoUrl?: string | null;
  isAuthenticated?: boolean;
};

export function RevnetActionButtons(props: RevnetActionButtonsProps) {
  const RevnetActionButtonsClient = dynamic<RevnetActionButtonsProps>(
    async () => (await import("./revnet-action-buttons-client")).RevnetActionButtonsClient,
    {
      ssr: false,
      loading: () => (
        <RevnetActionButtonsFallback isAuthenticated={props.isAuthenticated ?? false} />
      ),
    }
  );

  return <RevnetActionButtonsClient {...props} />;
}

function RevnetActionButtonsFallback({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (!isAuthenticated) {
    return (
      <div className="mt-4">
        <Button className="w-full" disabled>
          Connect wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button className="flex-1" disabled>
        Buy
      </Button>
      <Button variant="outline" disabled>
        Cash out
      </Button>
      <Button variant="outline" disabled>
        Take a loan
      </Button>
    </div>
  );
}
