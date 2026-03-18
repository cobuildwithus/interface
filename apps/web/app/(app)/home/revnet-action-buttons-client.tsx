"use client";

import { AuthButton } from "@/components/ui/auth-button";
import { SwapDialog } from "@/components/features/funding/swap-dialog";
import { useLogin } from "@/lib/domains/auth/use-login";
import { useRevnetPosition } from "@/lib/hooks/use-revnet-position";
import { CashOutDialog } from "./cash-out-dialog";
import { LoanDialog } from "./loan-dialog";

type RevnetActionButtonsProps = {
  tokenLogoUrl?: string | null;
  isAuthenticated?: boolean;
};

export function RevnetActionButtonsClient({
  tokenLogoUrl,
  isAuthenticated = false,
}: RevnetActionButtonsProps) {
  const { ready, authenticated } = useLogin();
  const position = useRevnetPosition();
  const hasAuth = isAuthenticated || (ready && authenticated);

  if (!hasAuth) {
    return (
      <div className="mt-4">
        <AuthButton className="w-full">Connect wallet</AuthButton>
      </div>
    );
  }

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
