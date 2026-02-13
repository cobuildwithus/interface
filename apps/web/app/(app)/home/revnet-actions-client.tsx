"use client";

import { AuthButton } from "@/components/ui/auth-button";
import { SwapDialog } from "@/components/features/funding/swap-dialog";
import { useRevnetPosition } from "@/lib/hooks/use-revnet-position";
import { CashOutDialog } from "./cash-out-dialog";
import { LoanDialog } from "./loan-dialog";

export function RevnetActionButtons({ tokenLogoUrl }: { tokenLogoUrl?: string | null }) {
  const position = useRevnetPosition();

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <SwapDialog>
        <AuthButton className="flex-1">Buy</AuthButton>
      </SwapDialog>
      <CashOutDialog position={position} tokenLogoUrl={tokenLogoUrl}>
        <AuthButton variant="outline">Cash out</AuthButton>
      </CashOutDialog>
      <LoanDialog position={position} tokenLogoUrl={tokenLogoUrl}>
        <AuthButton variant="outline">Take a loan</AuthButton>
      </LoanDialog>
    </div>
  );
}
