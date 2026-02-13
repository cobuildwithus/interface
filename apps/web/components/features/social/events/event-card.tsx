import { Calendar, Clock, ExternalLink } from "lucide-react";

export type EventColor = "blue" | "purple" | "green" | "orange";

export type Event = {
  id: string;
  title: string;
  description: string;
  day: string;
  time: string;
  recurring: string;
  color: EventColor;
};

const colorStyles: Record<EventColor, { bg: string; border: string }> = {
  blue: { bg: "bg-blue-500", border: "hover:border-blue-500" },
  purple: { bg: "bg-purple-500", border: "hover:border-purple-500" },
  green: { bg: "bg-green-500", border: "hover:border-green-500" },
  orange: { bg: "bg-orange-500", border: "hover:border-orange-500" },
};

type EventCardProps = {
  event: Event;
  linkUrl: string;
};

export function EventCard({ event, linkUrl }: EventCardProps) {
  const styles = colorStyles[event.color];

  return (
    <a
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`bg-card group relative block overflow-hidden rounded-xl border p-6 transition-all ${styles.border}`}
    >
      <div className={`absolute top-0 left-0 h-full w-1 ${styles.bg}`} />
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <h3 className="group-hover:text-primary text-lg font-semibold transition-colors">
            {event.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{event.description}</p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-sm">
              <Calendar className="text-muted-foreground size-4" />
              <span className="font-medium">{event.day}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="text-muted-foreground size-4" />
              <span>{event.time}</span>
            </div>
            <span className="bg-muted rounded-full px-2.5 py-0.5 text-xs font-medium">
              {event.recurring}
            </span>
          </div>
        </div>
        <ExternalLink className="text-muted-foreground size-5 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </a>
  );
}
