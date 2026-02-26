"use client";

import type { ThreadCast } from "@/lib/integrations/farcaster/casts/types";
import { QuotedPostCard } from "@/components/features/social/discussion/quoted-post-card";

const MAX_QUOTE_DEPTH = 3;

type QuotedPostProps = {
  cast: ThreadCast;
  castMap: Record<string, ThreadCast>;
  rootHash: string;
  depth?: number;
};

export function QuotedPost({ cast, castMap, rootHash, depth = 1 }: QuotedPostProps) {
  const username = cast.author.username ?? "unknown";
  const createdAt = new Date(cast.createdAt);

  // Check if this cast has a parent that's not the root (for nested quotes)
  const parentCast =
    cast.parentHash && cast.parentHash !== rootHash ? castMap[cast.parentHash] : null;

  return (
    <QuotedPostCard username={username} text={cast.text ?? ""} createdAt={createdAt}>
      {parentCast && depth < MAX_QUOTE_DEPTH ? (
        <QuotedPost cast={parentCast} castMap={castMap} rootHash={rootHash} depth={depth + 1} />
      ) : null}
    </QuotedPostCard>
  );
}
