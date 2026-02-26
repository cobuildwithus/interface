import { AllowanceStepper } from "@/components/features/funding/allowance-stepper";
import { getSession } from "@/lib/domains/auth/session";
import { getUsdcBalance } from "@/lib/domains/token/onchain/usdc-balance";

export async function AllowanceSection() {
  const session = await getSession();
  const address = session.address ?? null;

  if (!address) {
    return null;
  }

  const usdcBalance = await getUsdcBalance(address);

  return (
    <AllowanceStepper
      initialAddress={address}
      initialUsdcBalance={usdcBalance?.balance ?? null}
      initialBalanceUsd={usdcBalance?.balanceUsd ?? null}
    />
  );
}
