"use client";

export function RevnetTokenBadge({ symbol, logoUrl }: { symbol: string; logoUrl?: string | null }) {
  const fallback = symbol.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="bg-background border-border flex items-center gap-2 rounded border px-2 py-1">
      {logoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={logoUrl} alt={symbol} className="size-4 shrink-0 rounded-full" />
      ) : (
        <span className="bg-muted text-muted-foreground flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold">
          {fallback}
        </span>
      )}
      <span className="text-sm font-bold">{symbol}</span>
    </div>
  );
}
