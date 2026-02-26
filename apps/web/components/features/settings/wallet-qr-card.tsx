"use client";

import { CopyToClipboard } from "@/components/ui/copy-to-clipboard";
import { cn, truncateAddress } from "@/lib/shared/utils";
import { WalletQr } from "@/components/features/funding/wallet-qr";

type WalletQrCardProps = {
  className?: string;
  address?: `0x${string}`;
};

export function WalletQrCard({ className, address }: WalletQrCardProps) {
  return (
    <section
      className={cn(
        "border-border/60 bg-background/80 flex flex-wrap items-center justify-between gap-6 rounded-2xl border p-6 shadow-sm",
        className
      )}
    >
      <div>
        <div className="text-muted-foreground text-xs font-semibold tracking-[0.3em] uppercase">
          Current wallet
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm">
            {address ? truncateAddress(address) : "Connect wallet to show address"}
          </span>
          {address ? (
            <CopyToClipboard text={address} className="text-xs">
              Copy
            </CopyToClipboard>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-2 text-xs">Scan the QR to fund this wallet.</p>
      </div>

      <div className="border-border/60 bg-background rounded-xl border p-3">
        {address ? (
          <WalletQr address={address} size={160} />
        ) : (
          <div className="text-muted-foreground flex h-40 w-40 items-center justify-center text-xs">
            Connect wallet
          </div>
        )}
      </div>
    </section>
  );
}
