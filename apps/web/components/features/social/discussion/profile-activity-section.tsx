import Link from "next/link";
import { Eye, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { DateTime } from "@/components/ui/date-time";
import { PostContent } from "@/components/features/social/discussion/post-content";
import { QuotedPostCard } from "@/components/features/social/discussion/quoted-post-card";
import { TopicTitle } from "@/components/features/social/discussion/topic-title";
import { getSession } from "@/lib/domains/auth/session";
import {
  getTopTopicsByFid,
  getRecentRepliesGroupedByFid,
  type ProfileReplyGroup,
  type ProfileTopic,
  type TopicReplier,
} from "@/lib/integrations/farcaster/casts/profile-topics";

type EmptyStateProps = {
  label: string;
  href: string;
  actionLabel: string;
};

type ProfileActivitySectionProps = {
  fid?: number | null;
  topicsLimit?: number;
  repliesLimit?: number;
  topicsTitle?: string;
  repliesTitle?: string;
  topicsEmptyState?: EmptyStateProps;
  repliesEmptyState?: EmptyStateProps;
};

export async function ProfileActivitySection({
  fid,
  topicsLimit = 10,
  repliesLimit = 5,
  topicsTitle = "Top topics",
  repliesTitle = "Recent replies",
  topicsEmptyState = {
    label: "No topics yet",
    href: "/create-post",
    actionLabel: "Start a discussion",
  },
  repliesEmptyState = {
    label: "No replies yet",
    href: "/discussion",
    actionLabel: "Join a discussion",
  },
}: ProfileActivitySectionProps) {
  const resolvedFid = fid && fid > 0 ? fid : ((await getSession()).farcaster?.fid ?? null);

  const [topics, replyGroups] =
    resolvedFid && resolvedFid > 0
      ? await Promise.all([
          getTopTopicsByFid(resolvedFid, topicsLimit),
          getRecentRepliesGroupedByFid(resolvedFid, repliesLimit),
        ])
      : [[], []];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TopicList title={topicsTitle} topics={topics} emptyState={topicsEmptyState} />
      <ReplyGroupList title={repliesTitle} groups={replyGroups} emptyState={repliesEmptyState} />
    </div>
  );
}

type TopicListProps = {
  title: string;
  topics: ProfileTopic[];
  emptyState: EmptyStateProps;
};

function TopicList({ title, topics, emptyState }: TopicListProps) {
  return (
    <div>
      <h3 className="text-muted-foreground mb-4 text-xs font-semibold tracking-wide uppercase">
        {title}
      </h3>
      {topics.length > 0 ? (
        <div className="space-y-2">
          {topics.map((topic) => (
            <Link
              key={topic.hash}
              href={`/cast/${topic.hash}`}
              className="group border-border bg-card hover:border-primary/40 flex items-start gap-3 rounded-lg border px-4 py-3 transition-all hover:translate-x-0.5"
            >
              <div className="min-w-0 flex-1">
                <TopicTitle
                  as="p"
                  text={topic.title}
                  className="text-foreground group-hover:text-primary line-clamp-1 leading-snug transition-colors"
                />
                <div className="text-muted-foreground mt-1.5 flex items-center gap-3 text-xs">
                  <span className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5">
                    <Eye className="size-3" />
                    {topic.viewCount.toLocaleString()}
                  </span>
                  {topic.repliers.length > 0 && (
                    <ReplierAvatars repliers={topic.repliers} totalCount={topic.replierCount} />
                  )}
                  <DateTime date={new Date(topic.createdAt)} relative short className="ml-auto" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <ActivityEmptyState {...emptyState} />
      )}
    </div>
  );
}

type ReplyGroupListProps = {
  title: string;
  groups: ProfileReplyGroup[];
  emptyState: EmptyStateProps;
};

function ReplyGroupList({ title, groups, emptyState }: ReplyGroupListProps) {
  return (
    <div>
      <h3 className="text-muted-foreground mb-4 text-xs font-semibold tracking-wide uppercase">
        {title}
      </h3>
      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.rootHash}
              className="border-border bg-card/50 overflow-hidden rounded-xl border"
            >
              <div className="border-border/60 bg-muted/40 flex items-center justify-between border-b px-4 py-2">
                <Link
                  href={`/cast/${group.rootHash}`}
                  className="text-muted-foreground text-xs font-medium hover:underline"
                >
                  {group.topicTitle}
                </Link>
              </div>
              <div className="divide-border/60 divide-y">
                {group.replies.map((reply) => (
                  <div key={reply.hash} className="space-y-2 p-4">
                    <PostContent
                      text={reply.text}
                      quote={
                        reply.parentQuote ? (
                          <QuotedPostCard
                            username={reply.parentQuote.username}
                            text={reply.parentQuote.text}
                          />
                        ) : null
                      }
                      textClassName="text-foreground/90 line-clamp-3 leading-normal"
                    />
                    <div className="flex items-center justify-end">
                      <span className="text-muted-foreground text-xs">
                        <DateTime date={new Date(reply.createdAt)} relative short />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ActivityEmptyState {...emptyState} />
      )}
    </div>
  );
}

function ReplierAvatars({
  repliers,
  totalCount,
}: {
  repliers: TopicReplier[];
  totalCount: number;
}) {
  const overflow = totalCount - repliers.length;

  return (
    <div className="flex -space-x-1.5">
      {repliers.slice(0, 5).map((replier) => (
        <div key={replier.fid} className="border-background box-content rounded-full border-2">
          <Avatar
            src={replier.avatarUrl}
            alt={replier.username}
            fallback={replier.username}
            size={20}
          />
        </div>
      ))}
      {overflow > 0 && (
        <div className="border-background bg-muted relative z-10 box-content flex size-5 items-center justify-center rounded-full border-2 text-[10px] font-medium">
          +{overflow}
        </div>
      )}
    </div>
  );
}

function ActivityEmptyState({ label, href, actionLabel }: EmptyStateProps) {
  return (
    <div className="border-border bg-card/50 flex flex-col items-center justify-center rounded-xl border py-8 text-center">
      <MessageSquare className="text-muted-foreground/40 mb-2 size-6" />
      <p className="text-muted-foreground text-sm">{label}</p>
      <Link href={href} className="text-primary mt-1 text-sm hover:underline">
        {actionLabel}
      </Link>
    </div>
  );
}
