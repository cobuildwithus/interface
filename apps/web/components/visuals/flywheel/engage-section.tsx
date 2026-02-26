"use client";

import { SocialPost, InteractionType } from "./social-post";

interface EngageSectionProps {
  onInteraction: (type: InteractionType) => void;
  flashLike: boolean;
  flashComment: boolean;
  flashRecast: boolean;
  likeCount: number;
  commentCount: number;
  recastCount: number;
}

export function EngageSection({
  onInteraction,
  flashLike,
  flashComment,
  flashRecast,
  likeCount,
  commentCount,
  recastCount,
}: EngageSectionProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-xs tracking-widest text-neutral-500 uppercase">Share proof of work</div>
      <SocialPost
        onInteraction={onInteraction}
        flashLike={flashLike}
        flashComment={flashComment}
        flashRecast={flashRecast}
        likeCount={likeCount}
        commentCount={commentCount}
        recastCount={recastCount}
      />
      <p className="max-w-xs text-center text-xs text-neutral-400">
        Likes, comments, and follows buy tokens to support goals you believe in.
      </p>
    </div>
  );
}
