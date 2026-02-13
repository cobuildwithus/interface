import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getRoundVariantConfig } from "./round-variant-config";
import { getSession } from "@/lib/domains/auth/session";
import { isAdminFor } from "@/lib/config/admins";
import { computeNeynarEligibilityForFid } from "@/lib/domains/eligibility/neynar-score";
import { getRoundById } from "@/lib/domains/rounds/rounds";
import { truncateWords } from "@/lib/shared/text/truncate-words";
import prisma from "@/lib/server/db/cobuild-db-client";
import { RoundSubmissions } from "./round-submissions";
import { PostButton } from "./post-button";
import { ManageButton } from "./manage-button";
import { RoundCountdown } from "./round-countdown";

type PageProps = {
  params: Promise<{ id: string }>;
};

const DEFAULT_ROUND_DESCRIPTION = "Participate in this Cobuild round.";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const round = await getRoundById(id);

  if (!round) {
    return {
      title: `Round #${id} | Cobuild`,
      description: DEFAULT_ROUND_DESCRIPTION,
    };
  }

  const roundTitle = round.title ?? `Round #${id}`;
  const description = truncateWords(
    round.description ?? DEFAULT_ROUND_DESCRIPTION,
    40,
    DEFAULT_ROUND_DESCRIPTION
  );

  return {
    title: `${roundTitle} | Cobuild`,
    description,
  };
}

export default async function RoundPage({ params }: PageProps) {
  const { id } = await params;

  const [round, session] = await Promise.all([getRoundById(id), getSession()]);
  if (!round) notFound();

  const perUserLimit = round.primaryRule.perUserLimit;
  const address = session.address;
  const shouldCheckLimit = Boolean(address) && typeof perUserLimit === "number" && perUserLimit > 0;
  const perUserCountPromise = shouldCheckLimit
    ? prisma.perAddressRuleSubmission.count({
        where: { address: address!, ruleId: round.primaryRule.id },
      })
    : Promise.resolve(0);

  const eligibilityPromise = computeNeynarEligibilityForFid(session.farcaster?.fid);
  const [perUserCount, { ineligible, reason: ineligibilityReason }] = await Promise.all([
    perUserCountPromise,
    eligibilityPromise,
  ]);
  const isAtPostLimit = shouldCheckLimit ? perUserCount >= perUserLimit : false;

  const isAdmin = isAdminFor(session.address, round.primaryRule.admins);

  const variantConfig = getRoundVariantConfig(round.variant);

  return (
    <main className="w-full p-4 md:p-6">
      <header className="mb-8">
        <h1 className="mb-1 text-xl font-semibold">{round.title ?? `Round #${id}`}</h1>
        <RoundCountdown
          startAt={round.startAt}
          endAt={round.endAt}
          rewardAmount={round.rewardAmount}
        />
      </header>

      <div className="border-border mb-3 flex items-center justify-between border-b pb-3">
        <variantConfig.Filter />
        <div className="flex items-center gap-2">
          <ManageButton
            roundId={id}
            roundTitle={round.title}
            roundDescription={round.description}
            startAt={round.startAt}
            endAt={round.endAt}
            variant={round.variant}
            rule={round.primaryRule}
            isAdmin={isAdmin}
          />
          <PostButton
            roundId={id}
            ruleId={round.primaryRule.id}
            startAt={round.startAt}
            endAt={round.endAt}
            roundTitle={round.title ?? undefined}
            roundDescription={round.description}
            castTemplate={round.primaryRule.castTemplate}
            ctaText={round.primaryRule.ctaText}
            linkedFarcasterUsername={session.farcaster?.username}
            linkedTwitterUsername={session.twitter?.username}
            ineligible={ineligible}
            ineligibilityReason={ineligibilityReason}
            isAtPostLimit={isAtPostLimit}
          />
        </div>
      </div>
      <Suspense fallback={<variantConfig.Skeleton />}>
        <RoundSubmissions
          ruleId={round.primaryRule.id}
          roundId={id}
          admins={round.primaryRule.admins}
          userAddress={session.address}
          variant={round.variant}
        />
      </Suspense>
    </main>
  );
}
