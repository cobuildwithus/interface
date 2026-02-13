"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ThreadCast } from "@/lib/integrations/farcaster/casts/types";
import { deleteCast } from "../actions/delete";
import { hideCast, hideFarcasterUser } from "../actions/hide";

type ModerationTarget = "cast" | "user" | null;

type ForumPostActionsInput = {
  cast: ThreadCast;
  isRoot?: boolean;
  postPermalink: string;
};

export const useForumPostActions = ({ cast, isRoot, postPermalink }: ForumPostActionsInput) => {
  const router = useRouter();
  const [moderationTarget, setModerationTarget] = useState<ModerationTarget>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const moderationOpen = moderationTarget !== null;
  const moderationCopy =
    moderationTarget === "cast"
      ? {
          title: "Hide cast from channel",
          description:
            "This removes the cast from the Cobuild discussion and thread views permanently.",
          success: "Cast hidden from the channel.",
        }
      : moderationTarget === "user"
        ? {
            title: "Hide user from channel",
            description:
              "This removes all of the user's casts from the Cobuild channel permanently.",
            success: "User hidden from the channel.",
          }
        : null;

  const isHiddenRoot = Boolean(isRoot && (cast.hiddenAt || cast.hiddenReason));
  const isRootPost = Boolean(isRoot);

  const handleCopyLink = async () => {
    try {
      const url = new URL(postPermalink, window.location.origin);
      await navigator.clipboard.writeText(url.toString());
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const closeModeration = () => {
    if (isPending) return;
    setModerationTarget(null);
    setModerationReason("");
  };

  const openModeration = (target: "cast" | "user") => {
    setModerationTarget(target);
    setModerationReason("");
  };

  const submitModeration = () => {
    const reason = moderationReason.trim();
    if (!moderationTarget || !reason) return;
    const isCastTarget = moderationTarget === "cast";
    const shouldRedirect = isCastTarget && isRoot;

    startTransition(async () => {
      try {
        const result = isCastTarget
          ? await hideCast({ castHash: cast.hash, reason })
          : await hideFarcasterUser({ fid: cast.author.fid, reason });

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success(moderationCopy?.success ?? "Moderation applied.");
        closeModeration();
        if (shouldRedirect) {
          router.push("/raise-1-mil/discussion");
          return;
        }
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to apply moderation.");
      }
    });
  };

  const confirmDelete = () => {
    if (isDeleting) return;

    startDeleteTransition(async () => {
      const toastId = toast.loading("Deleting post...");
      try {
        const result = await deleteCast({ castHash: cast.hash });
        if (!result.ok) {
          toast.error(result.error, { id: toastId });
          return;
        }
        toast.success("Post deleted.", { id: toastId });
        if (isRootPost) {
          router.push("/raise-1-mil/discussion");
          return;
        }
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete post.", {
          id: toastId,
        });
      }
    });
  };

  return {
    moderationOpen,
    moderationTarget,
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
  };
};
