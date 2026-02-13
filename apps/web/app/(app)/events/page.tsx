import { PageHeader } from "@/components/layout/page-header";
import type { Event } from "@/components/features/social/events/event-card";
import { DiscordBanner } from "@/components/features/social/events/discord-banner";
import { EventsList } from "@/components/features/social/events/events-list";
import { buildPageMetadata } from "@/lib/shared/page-metadata";

const DISCORD_LINK = "https://discord.com/invite/PwWFgTck7f";

export const metadata = buildPageMetadata({
  title: "Events | Cobuild",
  description: "Weekly builder calls and community hangouts. Join us on Discord.",
});

const events: Event[] = [
  {
    id: "1",
    title: "Weekly Builder Call",
    description: "Join us to discuss progress, share updates, and collaborate on current projects.",
    day: "Friday",
    time: "12:00 PM EST",
    recurring: "Every week",
    color: "blue",
  },
  {
    id: "2",
    title: "Community Hangout",
    description:
      "Casual voice chat to connect with other community members and wind down the week.",
    day: "Monday",
    time: "9:00 PM EST",
    recurring: "Every week",
    color: "purple",
  },
  {
    id: "3",
    title: "New Member Onboarding",
    description:
      "Introduction session for new members. Learn about Cobuild and how to get involved.",
    day: "Wednesday",
    time: "3:00 PM EST",
    recurring: "Every week",
    color: "green",
  },
  {
    id: "4",
    title: "Demo Day",
    description: "Show off what you've been building! Open floor for project demos and feedback.",
    day: "Friday",
    time: "12:30 PM EST",
    recurring: "Bi-weekly",
    color: "orange",
  },
];

export default function EventsPage() {
  return (
    <main className="w-full p-4 md:p-6">
      <PageHeader
        title="Events"
        description="Join us on Discord for community calls and hangouts"
      />

      <DiscordBanner discordLink={DISCORD_LINK} />
      <EventsList events={events} linkUrl={DISCORD_LINK} />
    </main>
  );
}
