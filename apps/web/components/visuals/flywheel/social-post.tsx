"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      className="size-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
      />
    </svg>
  );
}

function RecastIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
    </svg>
  );
}

export type InteractionType = "like" | "comment" | "recast";

interface SocialPostProps {
  onInteraction: (type: InteractionType) => void;
  flashLike: boolean;
  flashComment: boolean;
  flashRecast: boolean;
  likeCount: number;
  commentCount: number;
  recastCount: number;
}

export function SocialPost({
  onInteraction,
  flashLike,
  flashComment,
  flashRecast,
  likeCount,
  commentCount,
  recastCount,
}: SocialPostProps) {
  const handleLike = () => onInteraction("like");
  const handleComment = () => onInteraction("comment");
  const handleRecast = () => onInteraction("recast");

  return (
    <div className="w-80 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4 sm:w-96">
      {/* Author */}
      <div className="mb-3 flex items-center gap-3">
        <Image
          src="/rocketman.png"
          alt="rocketman"
          width={40}
          height={40}
          className="size-10 rounded-full object-cover"
        />
        <div>
          <div className="text-sm font-medium">rocketman</div>
          <div className="text-xs text-neutral-500">@rocketman · 2h</div>
        </div>
      </div>

      {/* Content */}
      <p className="mb-4 text-sm leading-relaxed text-neutral-200">
        Just finished our second Cobuild meetup in San Francisco
        <br />
        <br />
        So many great people and conversations. Lots to think about going forward.
      </p>

      {/* Engagement actions */}
      <div className="flex items-center gap-6 border-t border-neutral-800 pt-3">
        <Button
          variant="ghost"
          onClick={handleLike}
          className={`flex h-auto origin-center items-center gap-2 p-0 text-sm transition-all duration-200 hover:bg-transparent ${
            flashLike ? "text-rose-500" : "text-neutral-500 hover:text-rose-500"
          }`}
        >
          <span
            className={`transition-all duration-200 ${
              flashLike ? "drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]" : ""
            }`}
          >
            <HeartIcon filled={flashLike} />
          </span>
          <span
            className={`font-medium tabular-nums transition-all duration-100 ${
              flashLike ? "text-rose-400" : ""
            }`}
          >
            {likeCount}
          </span>
        </Button>

        <Button
          variant="ghost"
          onClick={handleComment}
          className={`flex h-auto origin-center items-center gap-2 p-0 text-sm transition-all duration-200 hover:bg-transparent ${
            flashComment ? "text-sky-400" : "text-neutral-500 hover:text-sky-500"
          }`}
        >
          <span
            className={`transition-all duration-200 ${
              flashComment ? "drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]" : ""
            }`}
          >
            <CommentIcon />
          </span>
          <span
            className={`font-medium tabular-nums transition-all duration-100 ${
              flashComment ? "text-sky-300" : ""
            }`}
          >
            {commentCount}
          </span>
        </Button>

        <Button
          variant="ghost"
          onClick={handleRecast}
          className={`flex h-auto origin-center items-center gap-2 p-0 text-sm transition-all duration-200 hover:bg-transparent ${
            flashRecast ? "text-emerald-400" : "text-neutral-500 hover:text-emerald-500"
          }`}
        >
          <span
            className={`transition-all duration-200 ${
              flashRecast ? "drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]" : ""
            }`}
          >
            <RecastIcon />
          </span>
          <span
            className={`font-medium tabular-nums transition-all duration-100 ${
              flashRecast ? "text-emerald-300" : ""
            }`}
          >
            {recastCount}
          </span>
        </Button>
      </div>
    </div>
  );
}
