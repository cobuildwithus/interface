"use client";

import { AuthButton } from "@/components/ui/auth-button";
import { Button } from "@/components/ui/button";
import { SwapDialog } from "@/components/features/funding/swap-dialog";
import { useLogin } from "@/lib/domains/auth/use-login";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useRevnetPosition } from "@/lib/hooks/use-revnet-position";
import { CashOutDialog } from "./cash-out-dialog";
import { LoanDialog } from "./loan-dialog";

type RevnetActionButtonsProps = {
  tokenLogoUrl?: string | null;
  isAuthenticated?: boolean;
};

export function RevnetActionButtons({
  tokenLogoUrl,
  isAuthenticated = false,
}: RevnetActionButtonsProps) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return <RevnetActionButtonsFallback isAuthenticated={isAuthenticated} />;
  }

  return (
    <HydratedRevnetActionButtons tokenLogoUrl={tokenLogoUrl} isAuthenticated={isAuthenticated} />
  );
}

function HydratedRevnetActionButtons({
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

function RevnetActionButtonsFallback({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (!isAuthenticated) {
    return (
      <div className="mt-4">
        <Button className="w-full" disabled>
          Connect wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button className="flex-1" disabled>
        Buy
      </Button>
      <Button variant="outline" disabled>
        Cash out
      </Button>
      <Button variant="outline" disabled>
        Take a loan
      </Button>
    </div>
  );
}
