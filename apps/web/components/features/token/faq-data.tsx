import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export type FaqItem = {
  title: string;
  body: ReactNode;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    title: "What is $COBUILD?",
    body: (
      <p className="text-muted-foreground text-lg leading-relaxed">
        The token powering a launchpad for DAOs. Every network launched on Cobuild uses $COBUILD as
        its base pair—network activity is designed to route value back through the protocol.
        <sup>[3]</sup>
      </p>
    ),
  },
  {
    title: "How does the floor work?",
    body: (
      <p className="text-muted-foreground text-lg leading-relaxed">
        The contract includes a redemption mechanism that lets holders redeem tokens for a share of
        treasury assets, subject to contract terms and available liquidity.<sup>[1]</sup>
      </p>
    ),
  },
  {
    title: "Why is the floor designed to rise?",
    body: (
      <p className="text-muted-foreground text-lg leading-relaxed">
        When someone redeems, they pay a cash-out tax that stays in the treasury. Under normal
        operation, this is structured so redemptions can increase the per-token value for remaining
        holders.<sup>[2]</sup>
      </p>
    ),
  },
  {
    title: "What is staged issuance?",
    body: (
      <p className="text-muted-foreground text-lg leading-relaxed">
        Price rises on a schedule, not with each sale. Early conviction is rewarded over weeks, not
        whoever sits closest to the mempool. This moment is always cheaper than the next.
      </p>
    ),
  },
  {
    title: "Is there a max supply?",
    body: (
      <p className="text-muted-foreground text-lg leading-relaxed">
        Supply is uncapped during active issuance—anyone can mint at the current stage price.
        Issuance can be configured to close permanently after a set period.
      </p>
    ),
  },
  {
    title: "What is it built on?",
    body: (
      <p className="text-muted-foreground text-lg leading-relaxed">
        <Link
          href="https://revnet.app"
          className="decoration-muted-foreground/50 hover:decoration-foreground underline transition-colors"
        >
          Revnet
        </Link>
        —autonomous revenue networks built on{" "}
        <Link
          href="https://juicebox.money"
          className="decoration-muted-foreground/50 hover:decoration-foreground underline transition-colors"
        >
          Juicebox
        </Link>
        , the protocol behind ConstitutionDAO&apos;s $47M crowdfund.<sup>[5]</sup>
      </p>
    ),
  },
  {
    title: "Can the rules change?",
    body: (
      <p className="text-muted-foreground text-lg leading-relaxed">
        Issuance schedules and redemption terms are locked at deployment. The rules are encoded in
        immutable contracts. However, smart contracts carry inherent risks and the broader market is
        outside anyone&apos;s control.<sup>[4]</sup>
      </p>
    ),
  },
  {
    title: "How is this different from other tokens?",
    body: (
      <p className="text-muted-foreground text-lg leading-relaxed">
        Most tokens have no redemption mechanism. $COBUILD includes an onchain mechanism designed to
        let holders redeem against treasury assets. No governance votes required to access this
        mechanism.<sup>[1]</sup>
      </p>
    ),
  },
  {
    title: "How does revenue affect the token?",
    body: (
      <p className="text-muted-foreground text-lg leading-relaxed">
        The protocol routes fees and network activity into the treasury. This is designed so that
        real economic activity can increase redemption value over time, though outcomes are not
        guaranteed.<sup>[2]</sup>
      </p>
    ),
  },
  {
    title: "Can I borrow against my tokens?",
    body: (
      <p className="text-muted-foreground text-lg leading-relaxed">
        Yes. Use $COBUILD as collateral to borrow from the treasury at a fixed fee. Repay later to
        restore your position. Access liquidity without selling your upside.
      </p>
    ),
  },
  {
    title: "How can I earn $COBUILD?",
    body: (
      <div className="text-muted-foreground space-y-4 text-lg leading-relaxed">
        <p>
          Contribute real work—ship features, create content, run campaigns. We use streaming grants
          that pay every second. Bad actors get slashed, good work compounds.
        </p>
        <Button variant="outline" size="lg">
          View open tasks
        </Button>
      </div>
    ),
  },
  {
    title: "What are Flows?",
    body: (
      <p className="text-muted-foreground text-lg leading-relaxed">
        Always-on streaming grants. Builders get paid every second while they&apos;re on the list.
        Anyone can challenge bad actors—if they win, the builder is removed. No committees, just
        skin in the game.
      </p>
    ),
  },
  {
    title: "What are reaction markets?",
    body: (
      <p className="text-muted-foreground text-lg leading-relaxed">
        Your likes and comments become micro-purchases. Set a budget, and your social engagement
        automatically allocates capital to creators you value. Attention becomes investment.
      </p>
    ),
  },
  {
    title: "How do communities launch on Cobuild?",
    body: (
      <p className="text-muted-foreground text-lg leading-relaxed">
        Configure your issuance schedule, cash-out tax, and builder splits. Deploy immutable
        contracts. Your community gets a treasury-backed token with $COBUILD as the base pair from
        day one.
      </p>
    ),
  },
  {
    title: "Who is building this?",
    body: (
      <div className="text-muted-foreground space-y-6 text-lg leading-relaxed">
        <p>
          The creators of Flows—an onchain grants system that routed $200k+ to 250+ builders.
          <sup>[5]</sup>
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex items-center gap-4">
            <div className="border-border relative size-12 shrink-0 overflow-hidden rounded-xl border">
              <Image src="/rocketman.png" alt="rocketman" fill className="object-cover" />
            </div>
            <div className="flex flex-col">
              <a
                href="https://farcaster.xyz/rocketman"
                className="text-foreground font-bold decoration-2 underline-offset-4 hover:underline"
                target="_blank"
              >
                rocketman
              </a>
              <p className="text-sm opacity-80">12+ yrs crypto. Protocol.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="border-border relative size-12 shrink-0 overflow-hidden rounded-xl border">
              <Image src="/riderway.svg" alt="riderway" fill className="object-cover" />
            </div>
            <div className="flex flex-col">
              <a
                href="https://farcaster.xyz/riderway.eth"
                className="text-foreground font-bold decoration-2 underline-offset-4 hover:underline"
                target="_blank"
              >
                riderway
              </a>
              <p className="text-sm opacity-80">20+ yrs exp. Frontend.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export const FAQ_FOOTNOTES = (
  <div className="border-border text-muted-foreground/80 mt-16 space-y-4 border-t pt-8 text-sm">
    <p className="text-muted-foreground font-medium">Important notes</p>
    <p>
      <sup>[1]</sup> The cash-out floor is an onchain redemption mechanism, not a guarantee.
      Redemption value depends on treasury assets, contract behavior, and protocol risk. Token
      prices can fall below the floor on secondary markets, and there is no guarantee you will be
      able to redeem at any specific price or time.
    </p>
    <p>
      <sup>[2]</sup> &ldquo;Floor only goes up&rdquo; describes intended mechanism behavior under
      normal operation when redemptions occur with a cash-out tax. This is not guaranteed—treasury
      value, token supply, and redemption dynamics can all change in ways that affect outcomes.
    </p>
    <p>
      <sup>[3]</sup> Nothing on this page constitutes investment, financial, legal, or tax advice.
      Participation in any token economy involves significant risk, including the potential loss of
      all funds. Do your own research and consult qualified professionals before participating.
    </p>
    <p>
      <sup>[4]</sup> Smart contracts carry inherent risks including bugs, exploits, and unforeseen
      interactions. Audits reduce but do not eliminate risk. Protocol parameters are locked at
      deployment but the broader ecosystem and market conditions are outside anyone&apos;s control.
    </p>
    <p>
      <sup>[5]</sup> Past performance of similar mechanisms or protocols (including Flows, Juicebox,
      or ConstitutionDAO) does not indicate future results. Each deployment operates independently
      with its own risks.
    </p>
  </div>
);
