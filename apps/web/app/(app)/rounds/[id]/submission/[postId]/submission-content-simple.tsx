"use client";

import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PostAuthor } from "@/components/features/social/social-post/post-author";
import { SocialPostContent } from "@/components/features/social/social-post/social-post-content";
import { getCastUrl, getFarcasterProfileUrl } from "@/lib/integrations/farcaster/urls";
import { normalizePostId } from "@/lib/domains/rounds/normalize-post-id";
import { useFlagSubmissionRemoval } from "@/lib/hooks/use-flag-submission-removal";
import { FlagSubmissionRemovalForm } from "@/components/features/rounds/moderation/flag-submission-removal-form";

type SubmissionContentSimpleProps = {
  roundId: string;
  postId: string;
  source: "farcaster" | "x";
  url: string | null;
  displayText: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date | null;
  isAdmin: boolean;
  ruleId: number;
  mediaUrls?: string[];
};

export function SubmissionContentSimple({
  roundId,
  postId,
  source,
  url,
  displayText,
  handle,
  displayName,
  avatarUrl,
  createdAt,
  isAdmin,
  ruleId,
  mediaUrls = [],
}: SubmissionContentSimpleProps) {
  const router = useRouter();

  const viewPostLabel = source === "x" ? "View on X" : "View on Farcaster";
  // Ensure cast hash has 0x prefix for getCastUrl
  const normalizedPostId = source === "farcaster" ? (normalizePostId(postId) ?? postId) : postId;
  const postUrl = source === "farcaster" ? getCastUrl(normalizedPostId) : url;
  const profileUrl =
    source === "farcaster" ? getFarcasterProfileUrl(handle) : `https://x.com/${handle}`;

  const removal = useFlagSubmissionRemoval({
    ruleId,
    source,
    postId,
    castText: displayText,
    onSuccess: () => {
      router.push(`/rounds/${roundId}`);
      router.refresh();
    },
  });

  const adminDropdownContent = isAdmin ? (
    <DropdownMenuItem onClick={removal.open} className="text-destructive focus:text-destructive">
      <Flag size={14} className="mr-2" />
      Flag for removal
    </DropdownMenuItem>
  ) : null;

  return (
    <div className="space-y-4">
      <PostAuthor
        displayName={displayName}
        handle={handle}
        avatarUrl={avatarUrl}
        profileUrl={profileUrl}
        postUrl={postUrl}
        createdAt={createdAt}
        viewPostLabel={viewPostLabel}
        dropdownContent={adminDropdownContent}
      />

      {removal.isOpen && (
        <div className="bg-destructive/10 border-destructive/20 rounded-xl border p-4">
          <FlagSubmissionRemovalForm
            reason={removal.reason}
            onReasonChange={removal.setReason}
            alsoUpdateRequirements={removal.alsoUpdateRequirements}
            onAlsoUpdateRequirementsChange={removal.setAlsoUpdateRequirements}
            isPending={removal.isPending}
            onCancel={removal.cancel}
            onConfirm={removal.submit}
          />
        </div>
      )}

      <SocialPostContent text={displayText} mediaUrls={mediaUrls} />
    </div>
  );
}
