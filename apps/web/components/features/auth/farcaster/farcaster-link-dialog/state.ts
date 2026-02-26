import { useLinkAccount } from "@/lib/domains/auth/use-link-account";
import { useFarcasterLinkActions } from "@/components/features/auth/farcaster-link-actions";
import { useFarcasterSigner } from "@/lib/hooks/use-farcaster-signer";
import { useFarcasterSignup } from "@/lib/hooks/use-farcaster-signup";
import { getCastPermissionState } from "./permissions";
import type { FarcasterLinkDialogStateOptions } from "./types";

export function useFarcasterLinkDialogState(options: FarcasterLinkDialogStateOptions = {}) {
  const onComplete = options.onComplete ?? (() => {});
  const { linkFarcaster, isLinking, isLinkingType, linkedAccounts, isLinked } = useLinkAccount();
  const { connectSigner, disconnectSigner, linkReadOnly, isConnecting, isDisconnecting } =
    useFarcasterLinkActions(linkFarcaster);
  const { status: signerStatus, isLoading: signerLoading } = useFarcasterSigner();
  const signup = useFarcasterSignup({ onComplete });
  const linked = isLinked("farcaster");
  const accountInfo = linkedAccounts.farcaster;
  const isCurrentlyLinking = isLinkingType("farcaster");
  const { hasSigner, signerPermissions, neynarPermissions, neynarStatus, neynarError } =
    signerStatus;
  const { missingCastPermission } = getCastPermissionState({
    hasSigner,
    signerPermissions,
    neynarPermissions,
  });

  const dialogTitle = linked ? "Farcaster connection" : "Link Farcaster";
  const dialogDescription = linked
    ? hasSigner && !signerLoading
      ? missingCastPermission
        ? "Posting is disabled for this account."
        : "Posting is enabled for this account."
      : "Enable posting to publish from Cobuild."
    : "Choose how to connect or create your account.";

  const isBusy = isConnecting || isCurrentlyLinking || signup.isSubmitting || isDisconnecting;

  return {
    linked,
    accountInfo,
    hasSigner,
    missingCastPermission,
    signerPermissions,
    neynarPermissions,
    neynarStatus,
    neynarError,
    isSignerLoading: signerLoading,
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
  };
}
