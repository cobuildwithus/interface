"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

const BILL_OF_RIGHTS = [
  {
    number: "I",
    title: "The Right to Permissionless Opportunity",
    right: "Anyone, anywhere can contribute, earn, and build without needing permission.",
    duty: "Design for open entry, legible contribution paths, and credible proof-of-work.",
    test: "Can a talented unknown from a low-income country realistically earn status + income without insider connections?",
  },
  {
    number: "II",
    title: "The Right to Earn Ownership",
    right:
      "Work should earn you a stake. Contributors deserve ownership in the networks they help build, not just payment, but voice.",
    duty: "Ensure that sustained contribution translates into governance weight and economic upside, not just one-off rewards.",
    test: "Can a builder who ships for two years credibly steer the direction of the network, or do early capital holders dominate forever?",
  },
  {
    number: "III",
    title: "The Right to Verifiability",
    right: "Important rules and outcomes must be checkable from public data.",
    duty: "Make allocation logic, treasury flows, and token mechanics inspectable and reproducible (or at minimum: auditable, with clear invariants).",
    test: 'Can a third party reproduce "who got paid and why" without trusting Cobuild\'s servers?',
  },
  {
    number: "IV",
    title: "The Right to Exit, Fork, and Rebuild",
    right:
      "If governance, culture, or leadership fails, people can leave without begging and fork what they helped create.",
    duty: "Keep mechanisms for clean exit; avoid lock-in via proprietary data, closed IP, or opaque identity systems.",
    test: 'Can a community credibly say: "If you disagree, fork us," and mean it?',
  },
  {
    number: "V",
    title: "The Right to Voluntary Association",
    right:
      "Your community should be chosen, not inherited. People deserve to opt into the cultures they belong to and opt out when they no longer fit.",
    duty: "Make communities discoverable, entry clear, and exit frictionless. No lock-in through guilt, sunk costs, or information asymmetry.",
    test: "Can someone who grew up in one community easily find and join another that better reflects their values?",
  },
  {
    number: "VI",
    title: "The Right to Credible Commitments",
    right:
      "Core invariants cannot be changed unilaterally, silently, or mid-game after people have committed time, work, and identity.",
    duty: "Define and lock core invariants at deploy time for fundraising and allocation. If upgrades exist, make them constrained, transparent, timelocked, and escapable. No admin keys that can seize funds, rewrite allocations, or drain treasuries.",
    test: "Can any key (team multisig, DAO, operators, UI) change issuance, cash-out, or treasury rules? If an upgrade happens, is there an enforced on-chain timelock long enough for users to exit or fork safely?",
  },
  {
    number: "VII",
    title: "The Right to Distributed Power",
    right:
      "No single constituency (founders, whales, operators, regulators, or mobs) should unilaterally steer outcomes.",
    duty: "Design for separation of powers across capital, operators, interfaces, and identity. Make chokepoints replaceable. Prefer mechanisms that aggregate many independent signals; discount correlated blocs (plutocracy and mobs) and make collusion expensive.",
    test: "If top holders collude, what can they force? If many accounts are really a few operators, do we count them as a bloc? If the default UI/RPC/indexer disappears or turns hostile, can users still fully participate? Is any single provider or jurisdiction a choke point?",
  },
  {
    number: "VIII",
    title: "The Right to Informed Cultural Participation",
    right:
      "Communities can build strong cultures, but members deserve clarity about what the culture asks of them and protection from manipulation disguised as belonging.",
    duty: "No dark patterns, no social blackmail, no engineered dependency loops. Coercion isn't only physical; it can be psychological, memetic, and economic.",
    test: "Can a newcomer easily understand what gets rewarded, what gets punished, and what's expected? Does the community rely on FOMO, shame spirals, or identity lock-in to retain members?",
  },
  {
    number: "IX",
    title: "The Right to Trust-Minimized Coordination",
    right:
      "No indispensable intermediaries for critical actions. Anyone can participate through alternative clients and compatible surfaces, without permission.",
    duty: "Data and state portability: export identity, contribution history, and account state. Open surface area: documented APIs, event streams, minimal proprietary dependencies.",
    test: "Can a third party build a client that fully participates without privileged keys? Can a member export their record and reuse it elsewhere? Does the trusted-dependency list shrink over time?",
  },
  {
    number: "X",
    title: "The Right to Privacy and Pseudonymity",
    right:
      "People can contribute, coordinate, and earn without being forced to reveal their identity, financial history, or social graph. Privacy is a civil liberty; pseudonymity is a safety tool.",
    duty: "Minimize data and disclose selectively. Support pseudonyms and privacy-preserving proofs, protect metadata, and avoid mandatory KYC. When accountability is required, use cryptographic receipts, slashing/staking, or opt-in disclosure.",
    test: "Can someone with safety or employment risk participate under a stable pseudonym? Can they prove eligibility (human/unique/member/contributor) without revealing who they are? Do the default UI, APIs, or analytics minimize metadata that could reconstruct identities and social graphs over time?",
  },
  {
    number: "XI",
    title: "The Right to Due Process and Equal Protection",
    right:
      "No one should lose access, reputation, funds, or standing through arbitrary or opaque decisions. Rules must apply consistently, with notice, evidence, and a path to appeal.",
    duty: "Define actions and penalties up front; publish the rule, evidence, decision-maker, and timeline; provide a non-single-gatekeeper appeal path; prefer reversible penalties.",
    test: "If an account is slashed, excluded, defunded, or labeled harmful: can they see the exact rule, the evidence, who decided, and how to appeal—without relying on private backchannels or personal relationships?",
  },
  {
    number: "XII",
    title: "The Right to Subsidiarity and Local Autonomy",
    right:
      "Decisions should be made at the smallest scope that can competently make them. Global rails should not become the arena for every cultural or political dispute.",
    duty: "Prefer local governance: community budgets, constitutions, and opt-in federations. Keep global decisions minimal. Make splitting and rejoining easy with forkable communities, portable identity/rep, and compatibility standards.",
    test: "When a controversy happens, can it be resolved by the affected community without dragging the entire network into a winner-take-all vote? Can two incompatible communities coexist on the same rails without one capturing the other?",
  },
  {
    number: "XIII",
    title: "The Right to Self-Custody and Secure Property",
    right:
      "People must be able to hold and move what they earn (funds, credentials, reputation) without relying on a custodian or a privileged administrator.",
    duty: "Default to self-custody and permissionless withdrawal via open standards and non-custodial accounts. Support safe key recovery (social recovery, multisig, delegated recovery) without mandatory KYC. Minimize catastrophic loss with clear trust boundaries and bounded upgrades.",
    test: "If Cobuild’s main UI disappears, a team goes rogue, or a hosting provider deplatforms a service: can I still access my assets and records and exit safely? Can I rotate keys and recover without begging a centralized operator?",
  },
  {
    number: "XIV",
    title: "Substrate, Not Sovereign",
    right:
      "This network is a coordination substrate, not a moral authority. It should help communities build, not become the thing that tells everyone what to be.",
    duty: "Resist the pull toward platform-as-arbiter. Let communities define their own values; the rails enable coordination, not conformity. The protocol stays neutral; moderation and curation happen at the edges (clients, community spaces), with a plurality of interfaces.",
    test: "When a values conflict arises, does the network try to settle it, or does it provide tools for communities to go their separate ways?",
  },
  {
    number: "XV",
    title: "Human Dignity and Non-Coercion",
    right:
      "Subcultures get sovereignty, but not a license for coercion, dehumanization, or violence.",
    duty: "Cobuild is for building; not for harming. This can show up as ecosystem norms, interface policy, and community-level constitutions.",
    test: "If a group uses Cobuild rails to coordinate targeted harm, can the broader ecosystem respond without turning the whole system into arbitrary censorship?",
  },
  {
    number: "XVI",
    title: "Net-Positive to Humanity",
    right:
      "A network that only benefits its members has failed. The best subcultures create value that spills over: open culture, shared knowledge, public goods.",
    duty: "Design for positive externalities. Reward contributions that benefit people beyond the network, not just those who hold the token.",
    test: "If someone who never bought the token asked what this network gave to the world, would there be a good answer?",
  },
];

function ArticleItem({ article }: { article: (typeof BILL_OF_RIGHTS)[number] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-foreground/20 border-l-2 pl-4">
      <h3 className="mb-2 text-base font-semibold">
        {article.number}. {article.title}
      </h3>
      <p className="text-base leading-relaxed">{article.right}</p>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1 text-xs transition-colors"
      >
        <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        <span>More</span>
      </button>
      {expanded && (
        <div className="text-muted-foreground mt-2 space-y-2 border-l border-dashed pl-3 text-sm leading-relaxed">
          <p>{article.duty}</p>
          <p className="italic">{article.test}</p>
        </div>
      )}
    </div>
  );
}

export default function BillOfRightsClient() {
  return (
    <main className="w-full p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2 md:hidden">
        <SidebarTrigger className="-ml-1" />
      </div>

      {/* Mission */}
      <section className="from-background to-muted/30 rounded-xl border bg-gradient-to-br p-6">
        <div className="mb-4">
          <span className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
            Our Mission
          </span>
        </div>
        <h2 className="mb-4 text-xl font-bold md:text-2xl">
          Increase community-driven impact in the world.
        </h2>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Our vision is a world of millions of flourishing subcultures, each capable of sustaining
          itself and contributing positively to the world.
        </p>
      </section>

      {/* Constitution */}
      <section className="mt-12 px-2.5">
        <div className="mb-6">
          <h2 className="text-xl font-semibold md:text-2xl">The Cobuild Constitution</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            A bill of rights for a world where thousands of communities can coordinate materially.
          </p>
        </div>
        <div className="max-w-2xl space-y-6">
          {BILL_OF_RIGHTS.map((article) => (
            <ArticleItem key={article.number} article={article} />
          ))}
        </div>
      </section>
    </main>
  );
}
