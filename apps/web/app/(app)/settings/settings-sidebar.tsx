import { AddMoreFunds } from "@/components/features/funding/add-more-funds";
import { ConnectedAccountsCard } from "@/components/features/settings/connected-accounts-card";
import { WalletSwitchCard } from "@/components/features/settings/wallet-switch-card";
import type { SettingsSocialState } from "./social-state";

type SettingsSidebarProps = {
  address: `0x${string}` | null;
  socialState: SettingsSocialState;
};

export function SettingsSidebar({ address, socialState }: SettingsSidebarProps) {
  return (
    <>
      <WalletSwitchCard initialAddress={address} />
      {address ? <AddMoreFunds /> : null}
      <ConnectedAccountsCard
        address={address}
        farcasterAccount={socialState.farcasterAccount}
        twitterAccount={socialState.twitterAccount}
        initialLinkedAccountsResponse={socialState.linkedAccountsResponse}
        initialSignerStatus={socialState.signerStatus}
        initialSignerIdentityKey={socialState.initialSignerIdentityKey}
      />
    </>
  );
}
