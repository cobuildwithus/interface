import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationsList } from "@/components/features/notifications/notifications-list";
import { getUser } from "@/lib/domains/auth/session";
import { getNotificationsPage } from "@/lib/domains/notifications/queries";
import { NotificationsReadTracker } from "./notifications-read-tracker";

export const metadata: Metadata = {
  title: "Notifications | Cobuild",
  description: "Replies, mentions, and future protocol updates for your Cobuild wallet inbox.",
};

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function NotificationsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const rawPage = Number.parseInt(resolvedSearchParams.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const address = await getUser();
  const pageData = address
    ? await getNotificationsPage(address, page)
    : {
        items: [],
        page: 1,
        totalPages: 0,
        totalCount: 0,
        watermark: "0",
      };
  const hasUnreadItems = pageData.items.some((item) => item.isUnread);

  return (
    <main className="w-full p-4 md:p-6">
      <PageHeader
        title="Notifications"
        description="Replies, mentions, and future protocol updates for your wallet inbox."
      />
      {address ? (
        <NotificationsReadTracker watermark={pageData.watermark} hasUnreadItems={hasUnreadItems} />
      ) : null}
      <NotificationsList pageData={pageData} />
    </main>
  );
}
