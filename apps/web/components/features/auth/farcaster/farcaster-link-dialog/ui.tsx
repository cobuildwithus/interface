"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LinkOptions } from "./link-options";
import { LinkedStatus } from "./linked-status";
import type { FarcasterLinkDialogProps } from "./types";

export function FarcasterLinkDialog({
  open,
  onOpenChange,
  onReadOnly,
  onSigner,
  signup,
  isBusy,
  linked,
  hasSigner,
  isSignerLoading,
  missingCastPermission,
  signerPermissions,
  neynarPermissions,
  neynarStatus,
  neynarError,
  isDisconnecting,
  onDisconnect,
  accountInfo,
  title,
  description,
}: FarcasterLinkDialogProps) {
  const username = accountInfo?.username ? `@${accountInfo.username}` : "Farcaster account";
  const { reset: resetSignup } = signup;
  const [showSignup, setShowSignup] = useState(false);
  const showDiagnostics = linked && !isSignerLoading && hasSigner;

  useEffect(() => {
    if (!open) {
      const id = requestAnimationFrame(() => setShowSignup(false));
      resetSignup();
      return () => cancelAnimationFrame(id);
    }
  }, [open, resetSignup]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-border/50 bg-background max-w-[400px] gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl"
        showCloseButton
      >
        <div className="px-5 pt-6 pb-5">
          <div className="space-y-1">
            <DialogTitle className="text-base font-semibold tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {description}
            </DialogDescription>
          </div>

          <div className="mt-5 space-y-2">
            {!linked ? (
              <LinkOptions
                isBusy={isBusy}
                onReadOnly={onReadOnly}
                onSigner={onSigner}
                signup={signup}
                showSignup={showSignup}
                onToggleSignup={() => setShowSignup((prev) => !prev)}
              />
            ) : (
              <LinkedStatus
                isSignerLoading={isSignerLoading}
                hasSigner={hasSigner}
                missingCastPermission={missingCastPermission}
                username={username}
                showDiagnostics={showDiagnostics}
                signerPermissions={signerPermissions}
                neynarPermissions={neynarPermissions}
                neynarStatus={neynarStatus}
                neynarError={neynarError}
                onSigner={onSigner}
                onDisconnect={onDisconnect}
                isBusy={isBusy}
                isDisconnecting={isDisconnecting}
              />
            )}
          </div>

          {!linked && (
            <p className="text-muted-foreground mt-4 text-center text-xs">
              You can change this later in settings.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
