import { FarcasterProfileSettings } from "./farcaster-profile-settings";
import type { SettingsSocialState } from "./social-state";

type FarcasterProfileSectionProps = {
  hasIdentity: boolean;
  socialState: SettingsSocialState;
};

export function FarcasterProfileSection({
  hasIdentity,
  socialState,
}: FarcasterProfileSectionProps) {
  if (!hasIdentity) {
    return null;
  }

  return (
    <FarcasterProfileSettings
      resolvedUsername={socialState.resolvedProfile.username}
      resolvedDisplayName={socialState.resolvedProfile.displayName}
      resolvedPfpUrl={socialState.resolvedProfile.pfpUrl}
      hasFarcasterAccount={socialState.resolvedProfile.hasFarcasterAccount}
      initialLinkedAccounts={socialState.linkedAccountsResponse}
      initialSignerStatus={socialState.signerStatus}
      initialSignerIdentityKey={socialState.initialSignerIdentityKey}
    />
  );
}
