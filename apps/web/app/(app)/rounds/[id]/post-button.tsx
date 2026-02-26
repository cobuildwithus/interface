"use client";

import { useState } from "react";
import { AuthButton } from "@/components/ui/auth-button";
import { PostDialog } from "./post-dialog";
import type { RoundHardRequirement, IneligibilityReason } from "./types";

type PostButtonProps = {
  roundId: string;
  ruleId: number;
  startAt?: string | null;
  endAt?: string | null;
  roundTitle?: string;
  roundDescription?: string | null;
  castTemplate?: string | null;
  ctaText?: string | null;
  requirements?: RoundHardRequirement[];
  linkedFarcasterUsername?: string;
  linkedTwitterUsername?: string;
  ineligible?: boolean;
  ineligibilityReason?: IneligibilityReason;
  isAtPostLimit?: boolean;
};

export function PostButton({
  roundId,
  ruleId,
  startAt,
  endAt,
  roundTitle,
  roundDescription,
  castTemplate,
  ctaText,
  requirements,
  linkedFarcasterUsername,
  linkedTwitterUsername,
  ineligible = false,
  ineligibilityReason,
  isAtPostLimit = false,
}: PostButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AuthButton
        size="sm"
        className="bg-blue-600 text-white hover:bg-blue-700"
        onClick={() => setOpen(true)}
      >
        Post
      </AuthButton>
      <PostDialog
        open={open}
        onOpenChange={setOpen}
        roundId={roundId}
        ruleId={ruleId}
        startAt={startAt}
        endAt={endAt}
        title={roundTitle}
        description={roundDescription}
        castTemplate={castTemplate}
        ctaText={ctaText}
        requirements={requirements}
        linkedFarcasterUsername={linkedFarcasterUsername}
        linkedTwitterUsername={linkedTwitterUsername}
        ineligible={ineligible}
        ineligibilityReason={ineligibilityReason}
        isAtPostLimit={isAtPostLimit}
      />
    </>
  );
}
