import { EventCard, type Event } from "./event-card";

type EventsListProps = {
  events: Event[];
  linkUrl: string;
};

export function EventsList({ events, linkUrl }: EventsListProps) {
  return (
    <section>
      <div className="grid gap-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} linkUrl={linkUrl} />
        ))}
      </div>
    </section>
  );
}
