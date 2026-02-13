import Link from "next/link";
import { OnrampStatusPanel } from "@/components/features/funding/onramp/status-panel";
import { buildPageMetadata } from "@/lib/shared/page-metadata";

export const metadata = buildPageMetadata({
  title: "Complete Purchase | Cobuild",
  description: "Finalize your Coinbase onramp purchase.",
  robots: { index: false, follow: false },
});

export default function OnrampReturnPage() {
  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-8 -left-16 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute top-0 right-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.3em] uppercase">
          Coinbase onramp
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Completing your purchase…</h1>
        <p className="text-muted-foreground text-sm">
          If you closed the Coinbase tab, reopen it from your browser history. This page refreshes
          automatically.
        </p>
      </div>

      <OnrampStatusPanel />

      <div className="text-muted-foreground text-sm">
        <Link href="/settings" className="underline">
          Back to settings
        </Link>
      </div>
    </div>
  );
}
