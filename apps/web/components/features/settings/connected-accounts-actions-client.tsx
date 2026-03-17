"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { FarcasterLinkDialog } from "@/components/features/auth/farcaster/farcaster-link-dialog";
import { useFarcasterLinkDialogState } from "@/components/features/auth/farcaster/farcaster-link-dialog/state";
import { AuthButton } from "@/components/ui/auth-button";
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

export function ConnectedAccountsActionsClient({
  address,
  farcasterAccount,
  twitterAccount,
  signerStatus,
  initialLinkedAccountsResponse,
  initialSignerIdentityKey,
}: ConnectedAccountsActionsProps) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const initialLinkedAccounts = {
    ...(farcasterAccount ? { farcaster: farcasterAccount } : {}),
    ...(twitterAccount ? { twitter: twitterAccount } : {}),
  };
  const {
    linked,
    accountInfo,
    twitterAccount: linkedTwitterAccount,
    twitterLinked,
    hasSigner,
    missingCastPermission,
    isSignerLoading,
    signerPermissions,
    neynarPermissions,
    neynarStatus,
    neynarError,
    isBusy,
    isDisconnecting,
    isCurrentlyLinking,
    isLinkingTwitter,
    signup,
    dialogTitle,
    dialogDescription,
    connectSigner,
    linkTwitter,
    linkReadOnly,
    disconnectSigner,
  } = useFarcasterLinkDialogState({
    address,
    initialLinkedAccounts,
    initialLinkedAccountsResponse,
    initialSignerStatus: signerStatus,
    initialSignerIdentityKey,
    onComplete: () => setDialogOpen(false),
  });

  const handleReadOnly = useCallback(async () => {
    setDialogOpen(false);
    await linkReadOnly();
  }, [linkReadOnly]);

  const handleSigner = useCallback(() => {
    setDialogOpen(false);
    connectSigner();
  }, [connectSigner]);

  const handleDisconnect = useCallback(async () => {
    setDialogOpen(false);
    await disconnectSigner();
  }, [disconnectSigner]);

  const twitterUsername = linkedTwitterAccount?.username;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <CompactButton
        type="farcaster"
        linked={linked}
        username={accountInfo?.username}
        isBusy={isBusy}
        isCurrentlyLinking={isCurrentlyLinking}
        onClick={() => setDialogOpen(true)}
      />
      <CompactButton
        type="twitter"
        linked={twitterLinked}
        username={twitterUsername}
        isCurrentlyLinking={isLinkingTwitter}
        onClick={() => linkTwitter()}
        asLink
      />

      <FarcasterLinkDialog
        open={isDialogOpen}
        onOpenChange={setDialogOpen}
        onReadOnly={handleReadOnly}
        onSigner={handleSigner}
        signup={signup}
        isBusy={isBusy}
        linked={linked}
        hasSigner={hasSigner}
        isSignerLoading={isSignerLoading}
        missingCastPermission={missingCastPermission}
        signerPermissions={signerPermissions}
        neynarPermissions={neynarPermissions}
        neynarStatus={neynarStatus}
        neynarError={neynarError}
        isDisconnecting={isDisconnecting}
        accountInfo={accountInfo}
        title={dialogTitle}
        description={dialogDescription}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}

function CompactButton({
  linked,
  username,
  isBusy,
  isCurrentlyLinking,
  onClick,
  type,
  asLink = false,
}: {
  linked: boolean;
  username?: string;
  isBusy?: boolean;
  isCurrentlyLinking?: boolean;
  onClick?: () => void;
  type: LinkAccountType;
  asLink?: boolean;
}) {
  const config = ACCOUNT_CONFIG[type];
  const label = linked ? (username ?? config.label) : `Link ${config.label}`;
  const baseStyles =
    "text-muted-foreground hover:text-foreground border-border hover:border-border/80 flex w-fit items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs transition-colors";

  const icon =
    isBusy || isCurrentlyLinking ? (
      <Loader2 className="size-2.5 animate-spin" />
    ) : (
      <config.Icon className={cn("size-2.5", linked ? config.compactIconLinked : "")} />
    );

  if (asLink && linked && username) {
    return (
      <a
        href={config.profileUrl(username)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(baseStyles, "border-solid")}
      >
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full",
            config.compactIconWrapper
          )}
        >
          {icon}
        </span>
        {label}
      </a>
    );
  }

  const buttonClassName = cn(
    baseStyles,
    "h-auto",
    linked ? "border-solid" : "border-dashed",
    isBusy || isCurrentlyLinking ? "disabled:opacity-50" : ""
  );

  return (
    <AuthButton
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={isBusy || isCurrentlyLinking}
      className={buttonClassName}
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full",
          linked ? config.compactIconWrapper : "bg-muted"
        )}
      >
        {icon}
      </span>
      {label}
    </AuthButton>
  );
}
