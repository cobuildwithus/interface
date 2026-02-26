"use client";

import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { formatOutcomeReasonForUser } from "@/lib/domains/rules/rules-api/format-outcome-reason";
import type { VerificationState } from "./types";

type RoundEarnVerificationViewProps = {
  state: VerificationState;
  onRetry?: () => void;
};

export function RoundEarnVerificationView({ state, onRetry }: RoundEarnVerificationViewProps) {
  if (state.status === "checking") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="relative mb-4">
          <Loader2 className="size-12 animate-spin text-blue-500" />
        </div>
        <h3 className="mb-1 text-lg font-semibold">Verifying your post…</h3>
        <p className="text-muted-foreground text-sm">
          Checking if your submission meets all requirements
        </p>
      </div>
    );
  }

  if (state.status === "success") {
    const { result } = state;
    const rawReason =
      (typeof result.llm?.reason === "string" && result.llm.reason.trim().length > 0
        ? result.llm.reason
        : typeof result.outcomeReason === "string"
          ? result.outcomeReason
          : "") ?? "";
    const reason = rawReason
      ? rawReason.replace(/^Failed AI verification:\s*/i, "")
      : result.rulePassed
        ? "Submission verified."
        : "Verification failed. Please try again.";
    const message = result.rulePassed ? reason : formatOutcomeReasonForUser(reason);
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div
          className={cn(
            "mb-4 rounded-full p-3",
            result.rulePassed ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
          )}
        >
          {result.rulePassed ? (
            <CheckCircle2 className="size-12" />
          ) : (
            <XCircle className="size-12" />
          )}
        </div>
        <h3 className="mb-1 text-lg font-semibold">
          {result.rulePassed ? "Submission verified!" : "Verification failed"}
        </h3>
        <p className="text-muted-foreground max-w-xs text-sm">{message}</p>
        {!result.rulePassed && onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 cursor-pointer text-sm text-blue-500 underline underline-offset-2 hover:text-blue-600"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-red-500/10 p-3 text-red-500">
          <XCircle className="size-12" />
        </div>
        <h3 className="mb-1 text-lg font-semibold">Something went wrong</h3>
        <p className="text-muted-foreground max-w-xs text-sm break-words">{state.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 cursor-pointer text-sm text-blue-500 underline underline-offset-2 hover:text-blue-600"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return null;
}
