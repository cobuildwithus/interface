import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProtocolRouteHint } from "@/components/features/notifications/protocol-route-hint";
import { GridBackground } from "@/components/ui/grid-background";
import { PageHeader } from "@/components/layout/page-header";
import { DiscordBanner } from "@/components/features/social/events/discord-banner";
import { EventsList } from "@/components/features/social/events/events-list";
import { getGoalEvents, getGoalOverviewData } from "@/lib/domains/goals/goal-data";
import {
  buildProtocolRouteHint,
  resolveProtocolRouteState,
} from "@/lib/domains/notifications/protocol-route-state";
import { generateGoalMetadata } from "../metadata";

type MetadataProps = {
  params: Promise<{ goalAddress: string }>;
};

type PageProps = {
  params: Promise<{ goalAddress: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

export default async function GoalEventsPage({ params, searchParams }: PageProps) {
  const { goalAddress } = await params;
  const routeHint = buildProtocolRouteHint("events", resolveProtocolRouteState(await searchParams));
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
          description={
            routeHint?.description ?? `Recent onchain activity for ${overview.progressTitle}.`
          }
        />

        {routeHint ? <ProtocolRouteHint hint={routeHint} /> : null}
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
