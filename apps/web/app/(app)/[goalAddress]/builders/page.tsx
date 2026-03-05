import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BuildersListSkeleton,
  PeopleListSkeleton,
} from "@/components/common/skeletons/people-list-skeleton";
import { GridBackground } from "@/components/ui/grid-background";
import { Currency } from "@/components/ui/currency";
import { getProfiles } from "@/lib/domains/profile/get-profile";
import { getGoalBuildersData, getGoalOverviewData } from "@/lib/domains/goals/goal-data";
import { toFiniteNumber } from "@/lib/shared/numbers";
import { JB_TOKEN_DECIMALS } from "@/lib/domains/token/onchain/revnet";
import { PersonCard } from "../../people/person-card";
import { generateGoalMetadata } from "../metadata";

type MetadataProps = {
  params: Promise<{ goalAddress: string }>;
};

type PageProps = {
  params: Promise<{ goalAddress: string }>;
};

function toTokenAmount(raw: string, decimals: number): number {
  const baseUnits = toFiniteNumber(raw);
  if (baseUnits === null) return 0;
  const converted = baseUnits / Math.pow(10, decimals);
  return Number.isFinite(converted) ? converted : 0;
}

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { goalAddress } = await params;
  const overview = await getGoalOverviewData(goalAddress);
  const description =
    overview?.goal.description ??
    `Builders and funders participating in ${overview?.progressTitle ?? "this goal"}.`;

  return generateGoalMetadata({
    goalAddress,
    pageName: "Builders",
    description,
    pathSuffix: "/builders",
  });
}

export default async function BuildersPage({ params }: PageProps) {
  const { goalAddress } = await params;
  const overview = await getGoalOverviewData(goalAddress);
  if (!overview) notFound();

  return (
    <main className="relative min-h-screen w-full">
      <GridBackground />
      <div className="relative w-full p-4 md:p-6">
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">Builders</h2>
          <Suspense fallback={<BuildersListSkeleton />}>
            <GoalBuildersSection goalAddress={goalAddress} />
          </Suspense>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Funders</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Suspense fallback={<PeopleListSkeleton />}>
              <GoalFundersSection goalAddress={goalAddress} />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}

async function GoalBuildersSection({ goalAddress }: { goalAddress: string }) {
  const data = await getGoalBuildersData(goalAddress, 24);
  if (!data || data.builders.length === 0) {
    return <div className="text-muted-foreground py-8 text-center">No builders yet</div>;
  }

  const profiles = await getProfiles(data.builders);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.builders.map((address, index) => (
        <PersonCard key={address} address={address} profile={profiles[index]!} subtitle="Builder" />
      ))}
    </div>
  );
}

async function GoalFundersSection({ goalAddress }: { goalAddress: string }) {
  const data = await getGoalBuildersData(goalAddress, 24);
  if (!data || data.funders.length === 0) {
    return <div className="text-muted-foreground py-8 text-center">No funders yet</div>;
  }

  const profiles = await getProfiles(data.funders.map((funder) => funder.address));
  const symbol = data.tokenSymbol?.replace(/^\$/, "") ?? "";

  return (
    <>
      {data.funders.map((funder, index) => (
        <PersonCard
          key={funder.address}
          address={funder.address}
          profile={profiles[index]!}
          subtitle={
            <>
              <Currency
                value={toTokenAmount(funder.balance, JB_TOKEN_DECIMALS)}
                kind="token"
                compact
              />
              {symbol ? ` ${symbol}` : ""}
            </>
          }
        />
      ))}
    </>
  );
}
