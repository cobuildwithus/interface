"use client";

import { useLogin } from "@/lib/domains/auth/use-login";
import type { Profile } from "@/lib/domains/profile/types";
import { Button } from "@/components/ui/button";
import { UserPopover } from "@/components/layout/user-popover";

interface ConnectButtonProps {
  address?: string;
  profile?: Profile;
}

export function ConnectButton({ address, profile }: ConnectButtonProps) {
  const { ready, authenticated, login } = useLogin();

  // Server knows user is authenticated - show UserPopover immediately (no flash)
  // Or client-side Privy confirmed authentication
  if (address || (ready && authenticated)) {
    return <UserPopover address={address} profile={profile} />;
  }

  // Default to Connect button for unauthenticated visitors
  return (
    <Button
      size="sm"
      className="bg-foreground text-background hover:bg-foreground/90 rounded-lg"
      onClick={login}
    >
      Connect
    </Button>
  );
}
