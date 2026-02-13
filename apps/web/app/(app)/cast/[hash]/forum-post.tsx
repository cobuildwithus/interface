"use client";

import { ImageDialog, useImageDialog } from "@/components/common/image-dialog";
import type { ThreadCast } from "@/lib/integrations/farcaster/casts/types";
import { getCastUrl } from "@/lib/integrations/farcaster/urls";
import { useUser } from "@/lib/hooks/use-user";
import { pluralize } from "@/lib/shared/text/pluralize";
import { cn } from "@/lib/shared/utils";
import { ForumPostBody } from "./forum-post/body";
import { ForumPostHeader } from "./forum-post/header";
import { ModerationDialog } from "./forum-post/moderation-dialog";
import { useForumPostActions } from "./forum-post/use-forum-post-actions";

function getPostPermalink(rootHash: string, castHash: string) {
  return `/cast/${rootHash}?post=${castHash}`;
}

type ForumPostProps = {
  cast: ThreadCast;
  postNumber: number;
  isRoot?: boolean;
  isFocused?: boolean;
  castMap: Record<string, ThreadCast>;
  rootHash: string;
  isAdmin?: boolean;
  onReply?: (cast: ThreadCast) => void;
};

export function ForumPost({
  cast,
  postNumber,
  isRoot,
  isFocused,
  castMap,
  rootHash,
  isAdmin = false,
  onReply,
}: ForumPostProps) {
  const createdAt = new Date(cast.createdAt);
  const castUrl = getCastUrl(cast.hash);
  const postPermalink = getPostPermalink(rootHash, cast.hash);
  const imageDialog = useImageDialog();
  const viewLabel = pluralize(cast.viewCount, "time", "times");
  const imageAttachment = cast.attachment?.kind === "image" ? cast.attachment : null;
  const { farcaster: viewerFarcaster } = useUser();
  const isAuthor = viewerFarcaster?.fid === cast.author.fid;

  const {
    moderationOpen,
    moderationReason,
    moderationCopy,
    isPending,
    isDeleting,
    isHiddenRoot,
    handleCopyLink,
    closeModeration,
    openModeration,
    submitModeration,
    setModerationReason,
    confirmDelete,
  } = useForumPostActions({
    cast,
    isRoot,
    postPermalink,
  });

  const parentCast =
    !isRoot && cast.parentHash && cast.parentHash !== rootHash ? castMap[cast.parentHash] : null;

  return (
    <article
      id={`post-${cast.hash}`}
      className={cn(
        "border-border scroll-mt-24 overflow-hidden rounded-xl border",
        isRoot ? "bg-card" : "bg-card/50"
      )}
    >
      <ForumPostHeader
        cast={cast}
        createdAt={createdAt}
        isRoot={isRoot}
        isFocused={isFocused}
        isHiddenRoot={isHiddenRoot}
        viewLabel={viewLabel}
        isAuthor={isAuthor}
        isAdmin={isAdmin}
        postNumber={postNumber}
        postPermalink={postPermalink}
        castUrl={castUrl}
        onReply={onReply}
        onCopyLink={handleCopyLink}
        onDelete={confirmDelete}
        onModerateCast={() => openModeration("cast")}
        onModerateUser={() => openModeration("user")}
        isDeleting={isDeleting}
      />

      <ForumPostBody
        cast={cast}
        parentCast={parentCast}
        castMap={castMap}
        rootHash={rootHash}
        imageAttachment={imageAttachment}
        imageDialog={imageDialog}
      />

      <ImageDialog
        key={imageDialog.dialogKey}
        images={imageDialog.images}
        initialIndex={imageDialog.initialIndex}
        open={imageDialog.isOpen}
        onOpenChange={imageDialog.setIsOpen}
      />

      <ModerationDialog
        open={moderationOpen}
        title={moderationCopy?.title ?? "Hide from channel"}
        description={moderationCopy?.description ?? ""}
        reason={moderationReason}
        isPending={isPending}
        canSubmit={moderationReason.trim().length > 0}
        onClose={closeModeration}
        onReasonChange={setModerationReason}
        onSubmit={submitModeration}
      />
    </article>
  );
}
