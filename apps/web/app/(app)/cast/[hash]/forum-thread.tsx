"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { THREAD_PAGE_SIZE } from "@/lib/integrations/farcaster/casts/shared";
import type { FlatCastThread, ThreadCast } from "@/lib/integrations/farcaster/casts/types";
import { normalizeEntityId } from "@/lib/shared/entity-id";
import { isFullCastHash } from "@/lib/integrations/farcaster/parse-cast-url";
import { PaginationNav } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { ForumPost } from "./forum-post";
import { InlineReplyComposer } from "./inline-reply-composer";
import { createReplyAction } from "./actions/reply";
import type { InlineReplyComposerProps } from "./inline-reply-composer/types";

type ForumThreadProps = {
  thread: FlatCastThread;
  isAdmin?: boolean;
  hasSigner?: boolean;
};

function parseFocusHash(postParam: string | null) {
  if (!postParam) return null;
  const normalized = normalizeEntityId(postParam);
  return normalized && isFullCastHash(normalized) ? normalized : null;
}

export function ForumThread({ thread, isAdmin = false, hasSigner = false }: ForumThreadProps) {
  const { root, replies, replyCount, castMap, page, totalPages } = thread;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const focusHash = parseFocusHash(searchParams.get("post"));

  // Track which post is being replied to (by hash)
  const [replyTargetHash, setReplyTargetHash] = useState<string | null>(null);
  const replyTarget = replyTargetHash ? (castMap[replyTargetHash] ?? root) : null;

  // page=0 means showing all posts
  const showAll = page === 0;

  const handleReply = useCallback((cast: ThreadCast) => {
    setReplyTargetHash(cast.hash);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTargetHash(null);
  }, []);

  const handlePost = useCallback<InlineReplyComposerProps["onPost"]>(
    async (
      text: string,
      parentHash: string,
      parentAuthorFid: number | null,
      attachmentUrl: string | null
    ) => {
      const toastId = toast.loading("Posting reply...");

      try {
        const result = await createReplyAction({
          text,
          parentHash,
          parentAuthorFid,
          ...(attachmentUrl ? { attachmentUrl } : {}),
        });

        if (!result.ok) {
          const message = result.error || "Failed to post reply.";
          toast.error(message, { id: toastId });
          return { ok: false, error: message, status: result.status };
        }

        const params = new URLSearchParams(searchParams.toString());
        params.set("post", result.hash);

        if (showAll) {
          params.set("all", "1");
          params.delete("page");
        } else {
          const nextPage = Math.max(1, Math.ceil((replyCount + 1) / THREAD_PAGE_SIZE));
          params.set("page", nextPage.toString());
          params.delete("all");
        }

        toast.success("Reply posted.", { id: toastId });
        setReplyTargetHash(null);
        router.replace(`${pathname}?${params.toString()}`);
        router.refresh();
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to post reply.";
        toast.error(message, { id: toastId });
        return { ok: false, error: message };
      }
    },
    [pathname, replyCount, router, searchParams, showAll]
  );

  const showRootPost = page === 1 || showAll;
  const actualTotalPages = showAll
    ? Math.max(1, Math.ceil(replyCount / THREAD_PAGE_SIZE))
    : totalPages;

  // Calculate post numbers: root is #1, then replies are numbered sequentially
  const getPostNumber = (index: number) => {
    if (showAll) return index + 2; // +2 because root is #1
    return (page - 1) * thread.pageSize + index + 2;
  };

  useEffect(() => {
    if (!focusHash) return;
    const target = document.getElementById(`post-${focusHash}`);
    if (!target) return;
    target.scrollIntoView({ block: "start" });
  }, [focusHash]);

  const renderInlineComposer = (targetCast: ThreadCast) => (
    <InlineReplyComposer
      key={`reply-${targetCast.hash}`}
      targetCast={targetCast}
      rootCast={root}
      onPost={handlePost}
      onCancel={handleCancelReply}
      hasSigner={hasSigner}
    />
  );

  return (
    <div className="space-y-4">
      {/* Thread header with pagination */}
      <PaginationNav page={page} totalPages={actualTotalPages} showAll={{ active: showAll }} />

      {/* Root post (only on page 1 or when showing all) */}
      {showRootPost && (
        <>
          <ForumPost
            cast={root}
            postNumber={1}
            isRoot
            isFocused={focusHash === root.hash}
            castMap={castMap}
            rootHash={root.hash}
            isAdmin={isAdmin}
            onReply={handleReply}
          />
          {replyTargetHash === root.hash && replyTarget && renderInlineComposer(replyTarget)}
        </>
      )}

      {/* Replies */}
      {replies.length > 0 ? (
        <div className="space-y-4">
          {replies.map((cast, index) => (
            <div key={cast.hash} className="space-y-4">
              <ForumPost
                cast={cast}
                postNumber={getPostNumber(index)}
                isFocused={focusHash === cast.hash}
                castMap={castMap}
                rootHash={root.hash}
                isAdmin={isAdmin}
                onReply={handleReply}
              />
              {replyTargetHash === cast.hash && replyTarget && renderInlineComposer(replyTarget)}
            </div>
          ))}
        </div>
      ) : showRootPost ? (
        <div className="border-border text-muted-foreground rounded-xl border px-4 py-6 text-center text-sm">
          <p>No replies yet. Be the first to respond.</p>
          <Button size="sm" className="mt-4" onClick={() => handleReply(root)}>
            Start the discussion
          </Button>
        </div>
      ) : null}

      {/* Bottom pagination - right aligned (hide when showing all or single page) */}
      {!showAll && actualTotalPages > 1 && (
        <div className="flex justify-end pt-2">
          <PaginationNav page={page} totalPages={actualTotalPages} showAll={{ active: showAll }} />
        </div>
      )}
    </div>
  );
}
