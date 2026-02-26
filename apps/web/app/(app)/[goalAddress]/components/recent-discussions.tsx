import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RecentDiscussionListClient } from "@/components/features/social/discussion/recent-discussion-list-client";
import { getCobuildDiscussionCastsPage } from "@/lib/integrations/farcaster/casts";
import { getUser } from "@/lib/domains/auth/session";
import { getReadStatusMap } from "@/lib/domains/social/cast-read/kv";
import { buildCreatePostHref, type GoalScope } from "@/lib/domains/goals/goal-scopes";

type Props = {
  goalScope: GoalScope;
};

export async function RecentDiscussions({ goalScope }: Props) {
  const createPostHref = buildCreatePostHref(goalScope);
  const pageData = await getCobuildDiscussionCastsPage(5, 0, "last", "desc", goalScope.url);

  if (pageData.items.length === 0) {
    return (
      <div className="border-border/70 rounded-xl border border-dashed px-4 py-6 text-center">
        <p className="text-muted-foreground text-sm">No discussions yet.</p>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link href={createPostHref}>Start one</Link>
        </Button>
      </div>
    );
  }

  const userAddress = await getUser();
  if (!userAddress) {
    return <RecentDiscussionListClient items={pageData.items} />;
  }

  const readStatusMap = await getReadStatusMap(
    userAddress,
    pageData.items.map((item) => item.hash)
  );

  const itemsWithReadStatus = pageData.items.map((item) => ({
    ...item,
    isRead: Boolean(readStatusMap[item.hash]),
  }));

  return <RecentDiscussionListClient items={itemsWithReadStatus} />;
}
