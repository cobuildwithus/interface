"use client";

import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/ui/auth-button";
import { CopyToClipboard } from "@/components/ui/copy-to-clipboard";
import { useLogin } from "@/lib/domains/auth/use-login";
import { cn, truncateAddress } from "@/lib/shared/utils";
import { WalletQr } from "@/components/features/funding/wallet-qr";

type WalletSwitchCardProps = {
  className?: string;
  initialAddress?: `0x${string}` | null;
};

export function WalletSwitchCard({ className, initialAddress = null }: WalletSwitchCardProps) {
  const { address } = useAccount();
  const { ready, authenticated, logout, switchWallet } = useLogin();

  const handleSwitch = () => {
    void switchWallet();
  };

  const activeAddress = address ?? initialAddress ?? null;
  const displayAddress = activeAddress ? truncateAddress(activeAddress) : "Not connected";
  const actionClassName = "bg-muted/50 hover:bg-muted flex-1";

  return (
    <section
      className={cn(
        "border-border/60 bg-background/80 relative flex flex-col items-center gap-2.5 rounded-2xl border p-4",
        className
      )}
    >
      <div className="border-border/60 bg-background rounded-xl border p-2.5">
        {activeAddress ? (
          <WalletQr
            address={activeAddress}
            size={230}
            imageDark="/logo-dark.svg"
            imageLight="/logo-light.svg"
          />
        ) : (
          <div className="text-muted-foreground flex h-[230px] w-[230px] items-center justify-center text-xs">
            Connect wallet
          </div>
        )}
      </div>

      <div className="text-center">
        {activeAddress ? (
          <CopyToClipboard text={activeAddress} className="text-muted-foreground font-mono text-sm">
            {displayAddress}
          </CopyToClipboard>
        ) : (
          <span className="text-muted-foreground font-mono text-sm">{displayAddress}</span>
        )}
      </div>

      <div className="flex w-full gap-2">
        {authenticated ? (
          <Button
            variant="ghost"
            className={actionClassName}
            onClick={handleSwitch}
            disabled={!ready}
          >
            Switch wallet
          </Button>
        ) : (
          <AuthButton variant="ghost" className={actionClassName} disabled={!ready}>
            Connect wallet
          </AuthButton>
        )}
        {authenticated ? (
          <Button variant="ghost" className={actionClassName} onClick={logout}>
            Logout
          </Button>
        ) : null}
      </div>
    </section>
  );
}
