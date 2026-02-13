"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useUser } from "@/lib/hooks/use-user";
import type { RoundSubmissionSource } from "@/types/round-submission";
import { BoostSwap } from "./boost-swap";

type BoostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username?: string;
  beneficiaryAddress?: `0x${string}`;
  authorFid?: number;
  source?: RoundSubmissionSource;
  castHash?: string;
  onBoostSuccess?: (txHash: string) => void;
};

function normalizeHandle(value: string | null | undefined) {
  const trimmed = `${value ?? ""}`.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^@/, "").toLowerCase();
}

export function BoostDialog({
  open,
  onOpenChange,
  username,
  beneficiaryAddress,
  authorFid,
  source,
  castHash,
  onBoostSuccess,
}: BoostDialogProps) {
  const { farcaster, twitter, isNeynarScoreIneligible, isLoading } = useUser();
  const viewerFid = farcaster?.fid ?? null;
  const viewerTwitter = normalizeHandle(twitter?.username);
  const submissionHandle = normalizeHandle(username);

  const isOwnFarcasterPost = Boolean(authorFid && viewerFid && authorFid === viewerFid);
  const isOwnTwitterPost = Boolean(
    source === "x" && viewerTwitter && submissionHandle && viewerTwitter === submissionHandle
  );
  const isOwnPost = isOwnFarcasterPost || isOwnTwitterPost;
  // Don't show ineligibility message while loading user data
  const showIneligible = !isLoading && isNeynarScoreIneligible;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Boost submission</DialogTitle>
          <DialogDescription>Increase @{username}&apos;s rewards in the round.</DialogDescription>
        </DialogHeader>
        <BoostSwap
          onIntentSuccess={(hash) => {
            onBoostSuccess?.(hash);
            onOpenChange(false);
          }}
          username={username}
          beneficiaryAddress={beneficiaryAddress}
          isOwnPost={isOwnPost}
          isScoreIneligible={showIneligible}
          castHash={castHash}
        />
      </DialogContent>
    </Dialog>
  );
}
