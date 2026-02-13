"use client";

import { useCallback } from "react";
import { FarcasterLinkDialog } from "./ui";
import { useFarcasterLinkDialogState } from "./state";

export type FarcasterSignerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FarcasterSignerDialog({ open, onOpenChange }: FarcasterSignerDialogProps) {
  const {
    linked,
    accountInfo,
    hasSigner,
    isSignerLoading,
    isBusy,
    isDisconnecting,
    signup,
    dialogTitle,
    dialogDescription,
    signerPermissions,
    neynarPermissions,
    neynarStatus,
    neynarError,
    missingCastPermission,
    connectSigner,
    linkReadOnly,
    disconnectSigner,
  } = useFarcasterLinkDialogState({
    onComplete: () => onOpenChange(false),
  });

  const handleReadOnly = useCallback(async () => {
    onOpenChange(false);
    await linkReadOnly();
  }, [linkReadOnly, onOpenChange]);

  const handleSigner = useCallback(() => {
    onOpenChange(false);
    connectSigner();
  }, [connectSigner, onOpenChange]);

  const handleDisconnect = useCallback(async () => {
    onOpenChange(false);
    await disconnectSigner();
  }, [disconnectSigner, onOpenChange]);

  return (
    <FarcasterLinkDialog
      open={open}
      onOpenChange={onOpenChange}
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
  );
}
