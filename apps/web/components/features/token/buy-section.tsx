import Image from "next/image";
import { Swap } from "@/components/features/funding/swap";

export function BuySection() {
  return (
    <div className="border-border relative overflow-hidden border-b">
      <div className="pointer-events-none absolute inset-0 select-none">
        <Image
          src="/blocks.jpg"
          alt="Background"
          fill
          className="object-cover opacity-25"
          priority={false}
        />
        <div className="from-background via-background/80 dark:via-background/90 absolute inset-0 bg-linear-to-r to-transparent dark:to-transparent" />
      </div>

      <section className="relative z-10 py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <h2 className="mb-8 text-6xl font-black tracking-tighter uppercase md:text-8xl">
                BUY
                <br />
                <span className="text-muted-foreground">$COBUILD</span>
              </h2>
              <div className="max-w-md space-y-6">
                <p className="text-xl leading-relaxed font-medium md:text-2xl">
                  Help us rewrite civilization&apos;s reward function.
                </p>
                <p className="text-muted-foreground text-lg leading-relaxed text-pretty">
                  We&apos;re replacing firms with networks, jobs with missions, and profit-only
                  incentives with human values. Cobuild the future with us.
                </p>
              </div>
            </div>

            <Swap className="ml-auto w-full max-w-md" />
          </div>
        </div>
      </section>

      <section className="border-border bg-background/40 relative z-10 border-t backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="divide-border grid grid-cols-1 divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="group flex h-full flex-col p-8 transition-colors md:p-12">
              <span className="text-muted-foreground mb-12 block font-mono text-sm">01</span>
              <h3 className="text-foreground/90 mb-4 text-2xl font-bold text-balance transition-transform group-hover:translate-x-1">
                Treasury-Backed Floor
              </h3>
              <p className="text-muted-foreground mb-8 grow text-lg leading-relaxed text-pretty">
                Every token can be redeemed for a share of the treasury, anytime. Your downside is
                bounded by real assets.
              </p>
              <div className="border-border mt-auto border-t border-dashed pt-4">
                <div className="text-muted-foreground bg-secondary/50 border-border/50 inline-block rounded border px-2 py-1 font-mono text-xs">
                  Exit Guarantee
                </div>
              </div>
            </div>

            <div className="group flex h-full flex-col p-8 transition-colors md:p-12">
              <span className="text-muted-foreground mb-12 block font-mono text-sm">02</span>
              <h3 className="text-foreground/90 mb-4 text-2xl font-bold text-balance transition-transform group-hover:translate-x-1">
                Floor Only Goes Up
              </h3>
              <p className="text-muted-foreground mb-8 grow text-lg leading-relaxed text-pretty">
                When someone cashes out, a tax stays in the treasury— instantly raising the floor
                for everyone who remains.
              </p>
              <div className="border-border mt-auto border-t border-dashed pt-4">
                <div className="text-muted-foreground bg-secondary/50 border-border/50 inline-block rounded border px-2 py-1 font-mono text-xs">
                  Math &gt; Trust
                </div>
              </div>
            </div>

            <div className="group flex h-full flex-col p-8 transition-colors md:p-12">
              <span className="text-muted-foreground mb-12 block font-mono text-sm">03</span>
              <h3 className="text-foreground/90 mb-4 text-2xl font-bold text-balance transition-transform group-hover:translate-x-1">
                Time-Based Issuance
              </h3>
              <p className="text-muted-foreground mb-8 grow text-lg leading-relaxed text-pretty">
                Price rises on a schedule, not with each sale. Early conviction is rewarded over
                months, not seconds.
              </p>
              <div className="border-border mt-auto border-t border-dashed pt-4">
                <div className="text-muted-foreground bg-secondary/50 border-border/50 inline-block rounded border px-2 py-1 font-mono text-xs">
                  Conviction &gt; Speed
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
