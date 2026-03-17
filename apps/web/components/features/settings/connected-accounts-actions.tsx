"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import type {
  ResolvedFarcasterAccount,
  ResolvedXAccount,
} from "@/lib/domains/auth/linked-accounts/server-view";
import type { LinkedAccountsResponse } from "@/lib/domains/auth/linked-accounts/types";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";
import { ACCOUNT_CONFIG } from "@/components/features/auth/link-account-button/config";
import { cn } from "@/lib/shared/utils";

type ConnectedAccountsActionsProps = {
  address: `0x${string}` | null;
  farcasterAccount: ResolvedFarcasterAccount | null;
  twitterAccount: ResolvedXAccount | null;
  signerStatus: FarcasterSignerStatus;
  initialLinkedAccountsResponse: LinkedAccountsResponse;
  initialSignerIdentityKey: string;
};

type LinkAccountType = "farcaster" | "twitter";

export function ConnectedAccountsActions(props: ConnectedAccountsActionsProps) {
  const ConnectedAccountsActionsClient = dynamic<ConnectedAccountsActionsProps>(
    async () =>
      (await import("@/components/features/settings/connected-accounts-actions-client"))
        .ConnectedAccountsActionsClient,
    {
      ssr: false,
      loading: () => (
        <ConnectedAccountsActionsFallback
          farcasterAccount={props.farcasterAccount}
          twitterAccount={props.twitterAccount}
        />
      ),
    }
  );

  return <ConnectedAccountsActionsClient {...props} />;
}

function ConnectedAccountsActionsFallback({
  farcasterAccount,
  twitterAccount,
}: Pick<ConnectedAccountsActionsProps, "farcasterAccount" | "twitterAccount">) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <CompactFallbackButton type="farcaster" username={farcasterAccount?.username ?? undefined} />
      <CompactFallbackButton type="twitter" username={twitterAccount?.username ?? undefined} />
    </div>
  );
}

function CompactFallbackButton({
  type,
  username,
}: {
  type: LinkAccountType;
  username?: string | null;
}) {
  const config = ACCOUNT_CONFIG[type];
  const label = username ?? `Link ${config.label}`;
  const isLinked = Boolean(username);
  const className =
    "text-muted-foreground border-border flex w-fit items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs";

  if (isLinked && username) {
    return (
      <a
        href={config.profileUrl(username)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(className, "border-solid")}
      >
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full",
            config.compactIconWrapper
          )}
        >
          <config.Icon className={cn("size-2.5", config.compactIconLinked)} />
        </span>
        {label}
      </a>
    );
  }

  return (
    <Button type="button" variant="ghost" size="sm" disabled className={cn(className, "h-auto")}>
      <span className="bg-muted flex size-5 items-center justify-center rounded-full">
        <config.Icon className="size-2.5" />
      </span>
      {label}
    </Button>
  );
}
