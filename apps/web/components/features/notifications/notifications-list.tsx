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

function getNotificationPreview(item: NotificationsPageData["items"][number]): string | null {
  const excerpt = item.sourceExcerpt?.trim();
  const title = item.rootTitle?.trim();

  if (excerpt && title && excerpt !== title) {
    return `${title} — ${excerpt}`;
  }

  return excerpt || title || null;
}

export function NotificationsList({ pageData }: { pageData: NotificationsPageData }) {
  if (pageData.items.length === 0) {
    return (
      <div className="border-border bg-card rounded-2xl border p-8 text-center">
        <Bell aria-hidden="true" className="text-muted-foreground/50 mx-auto mb-3 size-6" />
        <p className="text-sm font-medium">No notifications yet.</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Replies, mentions, and future protocol updates will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {pageData.totalPages > 1 ? (
        <PaginationNav page={pageData.page} totalPages={pageData.totalPages} />
      ) : null}

      <div className="border-border divide-border bg-card divide-y overflow-hidden rounded-2xl border shadow-sm">
        {pageData.items.map((item) => {
          const actor = item.actor;
          const actorLabel = actor?.name ?? "Someone";
          const href = item.href ?? "/notifications";
          const preview = getNotificationPreview(item);

          return (
            <Link
              key={item.id}
              href={href}
              className="hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-ring/60 flex items-start gap-4 px-5 py-4 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset md:px-6"
            >
              <Avatar
                size={40}
                src={actor?.avatarUrl ?? undefined}
                alt={actorLabel}
                fallback={actorLabel.slice(0, 2).toUpperCase()}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate pr-2 text-[15px] leading-6">
                      <span className={item.isUnread ? "font-semibold" : "font-medium"}>
                        {actorLabel}
                      </span>{" "}
                      <span className="text-muted-foreground">{getReasonLabel(item.reason)}.</span>
                    </p>
                    {preview ? (
                      <p className="text-foreground/70 mt-1 [display:-webkit-box] overflow-hidden pr-4 text-sm leading-5 break-words [-webkit-box-orient:vertical] [-webkit-line-clamp:8]">
                        {preview}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-muted-foreground mt-0.5 flex shrink-0 items-center gap-2 text-xs">
                    {item.isUnread ? (
                      <span aria-hidden="true" className="bg-primary size-2 rounded-full" />
                    ) : null}
                    <DateTime date={new Date(item.eventAt)} relative short />
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
