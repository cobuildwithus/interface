import { PageHeader } from "@/components/layout/page-header";
import { DiscordBanner } from "@/components/features/social/events/discord-banner";
import { EventsList } from "@/components/features/social/events/events-list";
import { getGlobalGoalEvents } from "@/lib/domains/goals/goal-data";
import { buildPageMetadata } from "@/lib/shared/page-metadata";

const DISCORD_LINK = "https://discord.com/invite/PwWFgTck7f";

export const metadata = buildPageMetadata({
  title: "Events | Cobuild",
  description: "Weekly builder calls and community hangouts. Join us on Discord.",
});

export default async function EventsPage() {
  const events = await getGlobalGoalEvents(12);

  return (
    <main className="w-full p-4 md:p-6">
      <PageHeader title="Events" description="Recent onchain goal activity and protocol events." />

      <DiscordBanner discordLink={DISCORD_LINK} />
      {events.length > 0 ? (
        <EventsList events={events} linkUrl={DISCORD_LINK} />
      ) : (
        <p className="text-muted-foreground text-sm">No indexed events yet.</p>
      )}
    </main>
  );
}
