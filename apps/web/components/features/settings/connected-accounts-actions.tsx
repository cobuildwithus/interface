"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useLinkAccount as usePrivyLinkAccount } from "@privy-io/react-auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ErrorLike } from "@/lib/shared/errors";
import { FarcasterLinkDialog } from "@/components/features/auth/farcaster/farcaster-link-dialog";
import { AuthButton } from "@/components/ui/auth-button";
import { getCastPermissionState } from "@/components/features/auth/farcaster/farcaster-link-dialog/permissions";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";
import { ACCOUNT_CONFIG } from "@/components/features/auth/link-account-button/config";
import { useFarcasterSignup } from "@/lib/hooks/use-farcaster-signup";
import { syncLinkedAccountsFromSession } from "@/lib/domains/auth/linked-accounts/sync-linked-accounts";
import { parseLinkErrorMessage } from "@/lib/domains/auth/link-account-utils";
import { cn } from "@/lib/shared/utils";
import { useFarcasterLinkActionsCore } from "@/components/features/auth/farcaster-link-actions";

type ConnectedAccountsActionsProps = {
  address: `0x${string}` | null;
  farcasterAccount: { fid: number; username?: string; displayName?: string } | null;
  twitterAccount: { username?: string; name?: string } | null;
  signerStatus: FarcasterSignerStatus;
};

type LinkAccountType = "farcaster" | "twitter";

function useLinkAccountActions() {
  const router = useRouter();
  const [linkingType, setLinkingType] = useState<LinkAccountType | null>(null);

  const { linkFarcaster, linkTwitter } = usePrivyLinkAccount({
    onSuccess: () => {
      setLinkingType(null);
      void syncLinkedAccountsFromSession()
        .then((result) => {
          if (!result.ok && result.reason === "missing_address") {
            toast.error("Connect a wallet to save linked accounts.");
          }
        })
        .catch(() => {
          toast.error("Failed to sync linked accounts.");
        })
        .finally(() => {
          router.refresh();
        });
    },
    onError: () => {
      setLinkingType(null);
    },
  });

  const link = useCallback(
    async (type: LinkAccountType) => {
      setLinkingType(type);
      try {
        if (type === "farcaster") {
          await linkFarcaster();
        } else {
          await linkTwitter();
        }
      } catch (err) {
        const message = parseLinkErrorMessage(err as ErrorLike) || "Failed to link account";
        toast.error(message);
        setLinkingType(null);
      }
    },
    [linkFarcaster, linkTwitter]
  );

  return {
    linkFarcaster: () => link("farcaster"),
    linkTwitter: () => link("twitter"),
    isLinkingType: (type: LinkAccountType) => linkingType === type,
  };
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

export function ConnectedAccountsActions({
  address,
  farcasterAccount,
  twitterAccount,
  signerStatus,
}: ConnectedAccountsActionsProps) {
  const router = useRouter();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const signup = useFarcasterSignup({ onComplete: () => setDialogOpen(false) });
  const { linkFarcaster, linkTwitter, isLinkingType } = useLinkAccountActions();
  const { connectSigner, disconnectSigner, linkReadOnly, isConnecting, isDisconnecting } =
    useFarcasterLinkActionsCore({
      address,
      linkFarcaster,
      onLinked: () => router.refresh(),
      onDisconnected: () => router.refresh(),
    });

  const linked = Boolean(farcasterAccount);
  const accountInfo = farcasterAccount ?? undefined;
  const hasSigner = signerStatus.hasSigner;
  const signerPermissions = signerStatus.signerPermissions;
  const neynarPermissions = signerStatus.neynarPermissions;
  const neynarStatus = signerStatus.neynarStatus;
  const neynarError = signerStatus.neynarError;
  const { missingCastPermission } = getCastPermissionState({
    hasSigner,
    signerPermissions,
    neynarPermissions,
  });

  const dialogTitle = linked ? "Farcaster connection" : "Link Farcaster";
  const dialogDescription = linked
    ? hasSigner
      ? missingCastPermission
        ? "Posting is disabled for this account."
        : "Posting is enabled for this account."
      : "Enable posting to publish from Cobuild."
    : "Choose how to connect or create your account.";

  const isLinkingFarcaster = isLinkingType("farcaster");
  const isBusy = isConnecting || isDisconnecting || isLinkingFarcaster || signup.isSubmitting;

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

  const handleOpenDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const twitterUsername = twitterAccount?.username;
  const twitterLinked = Boolean(twitterAccount);

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <CompactButton
        type="farcaster"
        linked={linked}
        username={farcasterAccount?.username}
        isBusy={isBusy}
        isCurrentlyLinking={isLinkingFarcaster}
        onClick={handleOpenDialog}
      />
      <CompactButton
        type="twitter"
        linked={twitterLinked}
        username={twitterUsername}
        isCurrentlyLinking={isLinkingType("twitter")}
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
        isSignerLoading={false}
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
