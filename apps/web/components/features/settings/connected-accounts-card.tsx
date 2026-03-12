import { cn } from "@/lib/shared/utils";
import {
  isConnectedSocialAccount,
  type ResolvedFarcasterAccount,
  type ResolvedXAccount,
} from "@/lib/domains/auth/linked-accounts/server-view";
import type { LinkedAccountsResponse } from "@/lib/domains/auth/linked-accounts/types";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";
import { ConnectedAccountsActions } from "./connected-accounts-actions";

type ConnectedAccountsCardProps = {
  className?: string;
  address: `0x${string}` | null;
  farcasterAccount: ResolvedFarcasterAccount | null;
  twitterAccount: ResolvedXAccount | null;
  initialLinkedAccountsResponse: LinkedAccountsResponse;
  initialSignerStatus: FarcasterSignerStatus;
  initialSignerIdentityKey: string;
};

export function ConnectedAccountsCard({
  className,
  address,
  farcasterAccount,
  twitterAccount,
  initialLinkedAccountsResponse,
  initialSignerStatus,
  initialSignerIdentityKey,
}: ConnectedAccountsCardProps) {
  const allConnected =
    isConnectedSocialAccount(farcasterAccount) && isConnectedSocialAccount(twitterAccount);

  return (
    <div
      className={cn(
        "border-border/60 bg-background/80 relative overflow-hidden rounded-2xl border p-4",
        className
      )}
    >
      <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-transparent blur-2xl" />

      <div className="relative">
        <h3 className="text-foreground text-sm font-medium">Connected accounts</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {allConnected ? "Your social accounts are connected" : "Link socials to your account"}
        </p>
        <ConnectedAccountsActions
          address={address}
          farcasterAccount={farcasterAccount}
          twitterAccount={twitterAccount}
          signerStatus={initialSignerStatus}
          initialLinkedAccountsResponse={initialLinkedAccountsResponse}
          initialSignerIdentityKey={initialSignerIdentityKey}
        />
      </div>
    </div>
  );
}
