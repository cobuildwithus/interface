"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAutoSubmitPostDialog } from "@/lib/hooks/use-auto-submit-post-dialog";
import { checkPostAgainstRule } from "@/lib/domains/rules/rules-api/check-post";
import { getPostOwnershipMismatchError } from "@/lib/domains/social/post-ownership";
import {
  PLATFORMS,
  getDefaultPostInputPlaceholder,
  parsePostInput,
} from "@/lib/domains/social/platforms";
import { getRoundTimingError } from "@/lib/domains/rounds/timing";
import { useNow } from "@/lib/hooks/use-now";
import { RoundEarnDefaultContent } from "./round-earn-default-content";
import { RoundEarnVerificationView } from "./round-earn-verification-view";
import { PlatformComposeButtons } from "./platform-compose-buttons";
import { PostUrlInput } from "./post-url-input";
import type { PostDialogProps, VerificationState, OutcomeCode } from "./types";

export function PostDialog({
  open,
  onOpenChange,
  roundId,
  ruleId,
  startAt,
  endAt,
  title,
  description,
  castTemplate,
  ctaText,
  requirements = [],
  linkedFarcasterUsername,
  linkedTwitterUsername,
  ineligible = false,
  ineligibilityReason,
  isAtPostLimit = false,
}: PostDialogProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [verification, setVerification] = useState<VerificationState>({
    status: "idle",
  });
  const [isPending, startTransition] = useTransition();
  const nowMs = useNow({ intervalMs: 1000 });

  const isVerifying = verification.status === "checking" || isPending;

  const linked = { farcaster: !!linkedFarcasterUsername, twitter: !!linkedTwitterUsername };
  const parsedInput = parsePostInput(input);
  const detectedPlatform = parsedInput?.platform ?? null;
  const canSubmitUrl = detectedPlatform ? PLATFORMS[detectedPlatform].isLinked(linked) : false;

  // Naive client-side ownership check: compare URL username vs linked username.
  // This is not used for security (server validates against fetched post author),
  // but we keep the UX behavior to prevent obvious mismatches + auto-submit.
  const urlUsername =
    parsedInput?.candidate.kind === "ready" || parsedInput?.candidate.kind === "needs_resolution"
      ? parsedInput.candidate.username
      : null;
  const linkedUsername =
    detectedPlatform === "farcaster"
      ? (linkedFarcasterUsername ?? null)
      : detectedPlatform === "x"
        ? (linkedTwitterUsername ?? null)
        : null;
  const usernameMismatchError =
    detectedPlatform && urlUsername
      ? getPostOwnershipMismatchError({
          platform: detectedPlatform,
          urlUsername,
          linkedUsername,
        })
      : null;

  const inputError =
    parsedInput?.candidate.kind === "incomplete"
      ? parsedInput.candidate.error
      : usernameMismatchError;

  const timingError = getRoundTimingError({
    startAt: startAt ?? null,
    endAt: endAt ?? null,
    nowMs,
  });
  const roundTimingErrorMessage = timingError?.message ?? null;
  const isRoundOpenByDate = !roundTimingErrorMessage;

  const handleVerify = useCallback(async () => {
    if (!detectedPlatform) return;
    if (!isRoundOpenByDate) return;
    setVerification({ status: "checking" });

    try {
      const result = await checkPostAgainstRule({
        roundId,
        platform: detectedPlatform,
        ruleId,
        postInput: input,
      });

      if (!result.ok) {
        setVerification({ status: "error", message: result.error });
        return;
      }

      setVerification({
        status: "success",
        result: {
          platform: result.data.platform,
          postId: result.data.postId,
          ruleId: result.data.ruleId,
          rulePassed: result.data.rulePassed,
          outcomeCode: result.data.outcomeCode as OutcomeCode,
          outcomeReason: result.data.outcomeReason,
          tags: result.data.tags,
          metadata: result.data.metadata,
          semantic: result.data.semantic,
          llm: result.data.llm,
        },
      });

      if (result.data.rulePassed) {
        setInput("");
        setVerification({ status: "idle" });
        onOpenChange(false);
        router.push(`/rounds/${roundId}/submission/${result.data.postId}`);
      }
    } catch (err) {
      setVerification({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to verify submission",
      });
    }
  }, [detectedPlatform, input, isRoundOpenByDate, onOpenChange, router, roundId, ruleId]);

  const handleSubmit = useCallback(() => {
    startTransition(async () => {
      await handleVerify();
    });
  }, [handleVerify]);

  const canSubmitInput = Boolean(
    parsedInput && parsedInput.candidate.kind !== "incomplete" && !usernameMismatchError
  );
  const canAutoSubmit = Boolean(canSubmitInput && canSubmitUrl);

  useAutoSubmitPostDialog({
    open,
    input,
    ineligible,
    isBusy: isVerifying,
    verificationStatus: verification.status,
    canSubmit: canAutoSubmit && !isAtPostLimit && !ineligible && isRoundOpenByDate,
    onSubmit: handleSubmit,
  });

  const handleRetry = () => {
    setVerification({ status: "idle" });
    setInput("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setInput("");
      setVerification({ status: "idle" });
    }
    onOpenChange(nextOpen);
  };

  const showVerification = verification.status !== "idle";

  const placeholder = detectedPlatform
    ? PLATFORMS[detectedPlatform].input.placeholder
    : getDefaultPostInputPlaceholder();
  const cta = detectedPlatform
    ? PLATFORMS[detectedPlatform].input.cta
    : { label: "Submit", busyLabel: "Submitting…" };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">Submit your post</DialogTitle>
        {showVerification ? (
          <RoundEarnVerificationView state={verification} onRetry={handleRetry} />
        ) : (
          <div className="space-y-5">
            <RoundEarnDefaultContent
              title={title}
              description={description}
              requirements={requirements}
            />

            {ineligible && (
              <div
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700"
                role="alert"
                aria-live="polite"
              >
                {ineligibilityReason === "missing"
                  ? "Ineligible for this round. Neynar score not found."
                  : "You are currently ineligible for this round. Have a brand new Farcaster account? Please keep engaging with the community, eligibility updates weekly."}
              </div>
            )}

            <div className="border-border space-y-3 border-t pt-4">
              <p className="text-sm font-medium">1. Post on Farcaster or X</p>
              <PlatformComposeButtons
                linked={linked}
                castTemplate={castTemplate}
                ctaText={ctaText}
              />
            </div>

            <PostUrlInput
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              isVerifying={isVerifying}
              canSubmit={canSubmitInput}
              canSubmitUrl={canSubmitUrl}
              detectedPlatform={detectedPlatform}
              placeholder={placeholder}
              ctaLabel={cta.label}
              ctaBusyLabel={cta.busyLabel}
              inputError={inputError}
              roundTimingError={roundTimingErrorMessage}
              ineligible={ineligible}
              isAtPostLimit={isAtPostLimit}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
