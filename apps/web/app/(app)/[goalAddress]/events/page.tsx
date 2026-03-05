import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GridBackground } from "@/components/ui/grid-background";
import { PageHeader } from "@/components/layout/page-header";
import { DiscordBanner } from "@/components/features/social/events/discord-banner";
import { EventsList } from "@/components/features/social/events/events-list";
import { getGoalEvents, getGoalOverviewData } from "@/lib/domains/goals/goal-data";
import { generateGoalMetadata } from "../metadata";

type MetadataProps = {
  params: Promise<{ goalAddress: string }>;
};

type PageProps = {
  params: Promise<{ goalAddress: string }>;
};

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { goalAddress } = await params;
  const overview = await getGoalOverviewData(goalAddress);
  const description =
    overview?.goal.description ??
    `Recent onchain events and community activity for ${overview?.progressTitle ?? "this goal"}.`;

  return generateGoalMetadata({
    goalAddress,
    pageName: "Events",
    description,
    pathSuffix: "/events",
  });
}

const DISCORD_LINK = "https://discord.com/invite/PwWFgTck7f";

export default async function GoalEventsPage({ params }: PageProps) {
  const { goalAddress } = await params;
  const [overview, events] = await Promise.all([
    getGoalOverviewData(goalAddress),
    getGoalEvents(goalAddress),
  ]);
  if (!overview) notFound();

  return (
    <main className="relative min-h-screen w-full">
      <GridBackground />
      <div className="relative w-full p-4 md:p-6">
        <PageHeader
          title="Events"
          description={`Recent onchain activity for ${overview.progressTitle}.`}
        />

        <DiscordBanner discordLink={DISCORD_LINK} />
        {events.length > 0 ? (
          <EventsList events={events} linkUrl={DISCORD_LINK} />
        ) : (
          <p className="text-muted-foreground text-sm">No indexed goal events yet.</p>
        )}
      </div>
    </main>
  );
}
