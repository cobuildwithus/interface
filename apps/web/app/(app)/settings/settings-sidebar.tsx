import { AddMoreFunds } from "@/components/features/funding/add-more-funds";
import { ConnectedAccountsCard } from "@/components/features/settings/connected-accounts-card";
import { WalletSwitchCard } from "@/components/features/settings/wallet-switch-card";
import { getSession } from "@/lib/domains/auth/session";

export async function SettingsSidebar() {
  const session = await getSession();
  const address = session.address ?? null;

  return (
    <>
      <WalletSwitchCard initialAddress={address} />
      {address ? <AddMoreFunds /> : null}
      <ConnectedAccountsCard session={session} />
    </>
  );
}
