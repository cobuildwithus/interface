"use client";

import { MessageSquare } from "lucide-react";
import { LinkAccountButton } from "@/components/features/auth/link-account-button";

type ConnectFarcasterCtaProps = {
  title?: string;
  description?: string;
};

export function ConnectFarcasterCta({
  title = "Connect Farcaster to post",
  description = "Link your Farcaster account to join the discussion",
}: ConnectFarcasterCtaProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="bg-muted rounded-full p-3">
        <MessageSquare className="text-muted-foreground h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-foreground font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <LinkAccountButton type="farcaster" labelOverride="Connect Farcaster" />
    </div>
  );
}
