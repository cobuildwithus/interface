"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { Loader2 } from "lucide-react";
import { useAuthClick } from "@/lib/domains/auth/use-auth-click";
import { AuthButton } from "@/components/ui/auth-button";
import { cn } from "@/lib/shared/utils";
import {
  FarcasterLinkDialog,
  useFarcasterLinkDialogState,
} from "@/components/features/auth/farcaster/farcaster-link-dialog";
import { ACCOUNT_CONFIG } from "./config";
import type { FarcasterLinkAccountButtonProps } from "./types";

export function FarcasterLinkAccountButton({
  type,
  variant = "default",
  labelOverride,
  className,
}: FarcasterLinkAccountButtonProps) {
  const { handleClick } = useAuthClick();
  const [open, setOpen] = useState(false);
  const {
    linked,
    accountInfo,
    hasSigner,
    missingCastPermission,
    isSignerLoading,
    signerPermissions,
    neynarPermissions,
    neynarStatus,
    neynarError,
    isBusy,
    isConnecting,
    isDisconnecting,
    isLinking,
    isCurrentlyLinking,
    signup,
    dialogTitle,
    dialogDescription,
    connectSigner,
    linkReadOnly,
    disconnectSigner,
  } = useFarcasterLinkDialogState({
    onComplete: () => setOpen(false),
  });
  const config = ACCOUNT_CONFIG[type];
  const displayName = accountInfo?.username ?? config.label;
  const steadyLabel = labelOverride ?? (linked ? displayName : `Link ${config.label}`);

  const handleCompactOpen = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (handleClick(event)) {
        setOpen(true);
      }
    },
    [handleClick]
  );

  const handleReadOnly = useCallback(async () => {
    setOpen(false);
    await linkReadOnly();
  }, [linkReadOnly]);

  const handleSigner = useCallback(() => {
    setOpen(false);
    connectSigner();
  }, [connectSigner]);

  const handleDisconnect = useCallback(async () => {
    setOpen(false);
    await disconnectSigner();
  }, [disconnectSigner]);

  if (variant === "compact") {
    return (
      <>
        <button
          type="button"
          onClick={handleCompactOpen}
          disabled={isLinking || isConnecting}
          className={cn(
            "text-muted-foreground hover:text-foreground border-border hover:border-border/80 flex w-fit items-center gap-1.5 rounded-full border border-dashed py-1 pr-2.5 pl-1 text-xs transition-colors disabled:opacity-50",
            linked ? "border-solid" : "border-dashed",
            className
          )}
        >
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full",
              linked ? config.compactIconWrapper : "bg-muted"
            )}
          >
            {isBusy ? (
              <Loader2 className="size-2.5 animate-spin" />
            ) : (
              <config.Icon className={cn("size-2.5", linked ? config.compactIconLinked : "")} />
            )}
          </span>
          {linked ? (accountInfo?.username ?? config.label) : `Link ${config.label}`}
        </button>
        <FarcasterLinkDialog
          open={open}
          onOpenChange={setOpen}
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
      </>
    );
  }

  return (
    <>
      <AuthButton
        variant="ghost"
        className={cn("justify-center gap-2", config.buttonStyles, className)}
        onClick={() => setOpen(true)}
        disabled={isLinking || isConnecting}
      >
        {isBusy ? <Loader2 className="size-4 animate-spin" /> : <config.Icon className="size-4" />}
        {isConnecting ? "Connecting…" : isCurrentlyLinking ? "Linking…" : steadyLabel}
      </AuthButton>
      <FarcasterLinkDialog
        open={open}
        onOpenChange={setOpen}
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
    </>
  );
}
