"use client";

import { useEffect, useRef } from "react";

type VerificationStatus = "idle" | "checking" | "success" | "error";

/**
 * Centralizes PostDialog auto-submit behavior so the dialog stays readable as
 * we add more submission sources.
 */
export function useAutoSubmitPostDialog(params: {
  open: boolean;
  input: string;
  ineligible: boolean;
  isBusy: boolean;
  verificationStatus: VerificationStatus;
  canSubmit: boolean;
  onSubmit: () => void;
}) {
  const hasAutoSubmitted = useRef(false);

  // Auto-submit once when valid input is detected.
  useEffect(() => {
    const shouldSubmit =
      params.open &&
      params.verificationStatus === "idle" &&
      !params.ineligible &&
      !params.isBusy &&
      params.canSubmit &&
      !hasAutoSubmitted.current;

    if (!shouldSubmit) return;

    hasAutoSubmitted.current = true;
    queueMicrotask(params.onSubmit);
  }, [
    params.open,
    params.verificationStatus,
    params.ineligible,
    params.isBusy,
    params.canSubmit,
    params.onSubmit,
  ]);

  // Reset the auto-submit latch when the dialog closes or the input clears.
  useEffect(() => {
    if (!params.open || !params.input) {
      hasAutoSubmitted.current = false;
    }
  }, [params.open, params.input]);
}
