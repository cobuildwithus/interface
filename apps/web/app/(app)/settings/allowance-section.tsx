import { AllowanceStepper } from "@/components/features/funding/allowance-stepper";
import { getUsdcBalance } from "@/lib/domains/token/onchain/usdc-balance";

type AllowanceSectionProps = {
  address: `0x${string}` | null;
};

export async function AllowanceSection({ address }: AllowanceSectionProps) {
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
