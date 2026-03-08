import Link from "next/link";
import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { DateTime } from "@/components/ui/date-time";
import { PaginationNav } from "@/components/ui/pagination";
import type { NotificationsPageData } from "@/lib/domains/notifications/types";

function getReasonLabel(reason: string): string {
  switch (reason) {
    case "mention":
      return "mentioned you";
    case "reply_to_reply":
      return "replied to your reply";
    case "reply_to_root":
      return "replied to your post";
    default:
      return "sent an update";
  }
}

export function NotificationsList({ pageData }: { pageData: NotificationsPageData }) {
  if (pageData.items.length === 0) {
    return (
      <div className="border-border bg-card rounded-2xl border p-8 text-center">
        <Bell className="text-muted-foreground/50 mx-auto mb-3 size-6" />
        <p className="text-sm font-medium">No notifications yet.</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Replies, mentions, and future protocol updates will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pageData.totalPages > 1 ? (
        <PaginationNav page={pageData.page} totalPages={pageData.totalPages} />
      ) : null}

      <div className="border-border divide-border bg-card divide-y overflow-hidden rounded-2xl border shadow-sm">
        {pageData.items.map((item) => {
          const actor = item.actor;
          const actorLabel = actor?.name ?? "Someone";
          const href = item.href ?? "/notifications";

          return (
            <Link
              key={item.id}
              href={href}
              className="hover:bg-accent/40 flex items-start gap-4 px-4 py-4 transition-colors md:px-6"
            >
              <Avatar
                size={40}
                src={actor?.avatarUrl ?? undefined}
                alt={actorLabel}
                fallback={actorLabel.slice(0, 2).toUpperCase()}
              />

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6">
                      <span className={item.isUnread ? "font-semibold" : "font-medium"}>
                        {actorLabel}
                      </span>{" "}
                      <span className="text-muted-foreground">{getReasonLabel(item.reason)}.</span>
                    </p>
                    {item.rootTitle ? (
                      <p className="text-foreground/90 truncate text-sm font-medium">
                        {item.rootTitle}
                      </p>
                    ) : null}
                    {item.sourceExcerpt ? (
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {item.sourceExcerpt}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.isUnread ? <span className="bg-primary size-2 rounded-full" /> : null}
                    <DateTime
                      date={new Date(item.eventAt)}
                      relative
                      short
                      className="text-muted-foreground text-xs"
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {pageData.totalPages > 1 ? (
        <div className="flex justify-end pt-2">
          <PaginationNav page={pageData.page} totalPages={pageData.totalPages} />
        </div>
      ) : null}
    </div>
  );
}
