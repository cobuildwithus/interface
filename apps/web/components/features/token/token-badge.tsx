import Image from "next/image";

export function EthBadge() {
  return (
    <div className="bg-background border-border flex items-center gap-2 rounded border px-2 py-1 dark:bg-neutral-900">
      <Image
        src="/eth.png"
        alt="ETH"
        width={16}
        height={16}
        className="size-4 shrink-0 rounded-full"
      />
      <span className="text-sm font-bold">ETH</span>
    </div>
  );
}

export function CobuildBadge() {
  return (
    <div className="bg-background border-border flex items-center gap-2 rounded border px-2 py-1">
      <Image
        src="/logo-light.svg"
        alt="COBUILD"
        width={16}
        height={16}
        className="size-4 shrink-0 dark:hidden"
      />
      <Image
        src="/logo-dark.svg"
        alt="COBUILD"
        width={16}
        height={16}
        className="hidden size-4 shrink-0 dark:block"
      />
      <span className="text-sm font-bold">$COBUILD</span>
    </div>
  );
}

export function SwapArrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}
