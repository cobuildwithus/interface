import { useLinkAccount } from "@/lib/domains/auth/use-link-account";
import { useFarcasterLinkActionsCore } from "@/components/features/auth/farcaster-link-actions";
import { useFarcasterSigner } from "@/lib/hooks/use-farcaster-signer";
import { useFarcasterSignup } from "@/lib/hooks/use-farcaster-signup";
import { useUser } from "@/lib/hooks/use-user";
import { getCastPermissionState } from "./permissions";
import type { FarcasterLinkDialogStateOptions } from "./types";

export function useFarcasterLinkDialogState(options: FarcasterLinkDialogStateOptions = {}) {
  const onComplete = options.onComplete ?? (() => {});
  const { address } = useUser();
  const { linkFarcaster, linkTwitter, isLinking, isLinkingType, linkedAccounts, isLinked } =
    useLinkAccount({
      initialLinkedAccounts: options.initialLinkedAccounts,
      initialLinkedAccountsResponse: options.initialLinkedAccountsResponse,
    });
  const { connectSigner, disconnectSigner, linkReadOnly, isConnecting, isDisconnecting } =
    useFarcasterLinkActionsCore({
      address: options.address ?? address,
      linkFarcaster,
    });
  const { status: signerStatus, isLoading: signerLoading } = useFarcasterSigner({
    initialStatus: options.initialSignerStatus,
    initialIdentityKey: options.initialSignerIdentityKey,
  });
  const signup = useFarcasterSignup({
    onComplete,
  });
  const linked = isLinked("farcaster");
  const accountInfo = linkedAccounts.farcaster;
  const twitterAccount = linkedAccounts.twitter;
  const twitterLinked = isLinked("twitter");
  const isCurrentlyLinking = isLinkingType("farcaster");
  const isLinkingTwitter = isLinkingType("twitter");
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
    linkedAccounts,
    twitterAccount,
    twitterLinked,
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
    isLinkingTwitter,
    signup,
    dialogTitle,
    dialogDescription,
    connectSigner,
    linkTwitter,
    linkReadOnly,
    disconnectSigner,
  };
}
